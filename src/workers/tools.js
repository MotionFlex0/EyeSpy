const Bull = require("bull");
const childProcess = require("child_process");
const config = require("../config/prod");
const fs = require("fs")
const mongoose = require("mongoose")
const puppeteer = require("puppeteer");
const path  = require("path")
const uuid = require("uuid");

const Subdomain = require("../models/subdomain");
const Domain = require("../models/domain");
const toolQueue = new Bull("queue");

(async () => {
    const browser = await puppeteer.launch({defaultViewport: { width:1270 , height: 720 } });

    toolQueue.on("stalled", (job) => { 
        console.error(`job with id ${job.id} and name ${job.name} has stalled`);
    });

    toolQueue.process("sublist3r", (job, done) => {
        const hostname = job.data.hostname;
        const outputFile = path.join(config.tempPath, `${uuid.v4()}.txt`);
        const process = childProcess.spawn("python", ["./tools/sublist3r/sublist3r.py",
                                            "-d",
                                            hostname,
                                            "-o",
                                            outputFile
                                        ]);

        process.on("exit", async code => { 
            console.log(fs.existsSync(outputFile));
            if (fs.existsSync(outputFile)) {
                fs.readFileSync(outputFile).toString().split("\r\r\n").forEach(async subdomain => { //fixes issue with sublist3r using 2 CR in output file
                   if (subdomain.trim() == "")
                        return;
                   
                    const found = await Subdomain.findOne({subdomain});
                    if (found == null) {
                        (new Subdomain({
                            _id: mongoose.Types.ObjectId(),
                            subdomain,
                            rootDomain: job.data.domainId
                        })).save();
                        
                        //console.log(`saving new domain {${subdomain}} with domainId {${job.data.domainId}}`);
                    }
                });
                done(null);
            }
            else {
                console.log(`could not find any subdomains for ${hostname}`);
                console.log(`input file: ${process}`)
                console.log(`output file: ${outputFile}`);
                done(1);
            }
            console.log(`job ${job.id} has finished.`); 
        });
    }); 

    toolQueue.process("ispy", 3, async (job) => {
        const subdomain = await Subdomain.findById(job.data.subdomainId);

        let page = null;
        try {
            let progressCount = 0; 
            const progressCalls = 6;

            
            page = await browser.newPage();
            job.progress((++progressCount/progressCalls)*100);
            
            let fullImagePath = path.join(config.systemRootImagePath, subdomain.rootDomain.toString());
            if (!fs.existsSync(fullImagePath))
            fs.mkdirSync(fullImagePath);
            job.progress((++progressCount/progressCalls)*100);
            
            fullImagePath = path.join(fullImagePath, `${subdomain.subdomain}.jpeg`);
            
            const resp = await page.goto(`${subdomain.tls_supported?"https":"http"}://${subdomain.subdomain}`, { timeout: 10000 });
            job.progress((++progressCount/progressCalls)*100);
            await page.screenshot({path: fullImagePath, type:"jpeg"});
            job.progress((++progressCount/progressCalls)*100);
            
            subdomain.lastConnSuccessful = true;
            subdomain.lastStatusCode = resp.status();
            subdomain.imagePath = path.join(subdomain.rootDomain.toString(), `${subdomain.subdomain}.jpeg`);
            await subdomain.save();
            job.progress((++progressCount/progressCalls)*100);
            job.progress(100);

            await page.close();
            return Promise.resolve(subdomain.imagePath);
        }
        catch (e){
            //console.log("failed....");
            if (page != null)
                await page.close();

            console.log(e.message);
            subdomain.lastError = e.message;
            subdomain.lastConnSuccessful = false;
            subdomain.save();
            job.progress(100);
            return Promise.reject(e.message);
        }
    });

    toolQueue.process("infodump", async (job, done) => {
        job.progress(100);
        done(null);
    });

    //TODO: Create a single "bulk" job and pass the name for the specific job, as part of the data.
    toolQueue.process("ispy-bulk", async (job) => {
        const subdomains = await Subdomain.find({rootDomain: job.data.domainId});

        let jobs = await Promise.all(subdomains.map(async s => {
            return await toolQueue.add("ispy", {subdomainId: s._id});
        }));

        const jobsCount = jobs.length;
        let jobsFinished = 0;
        while (jobsFinished < jobsCount) {
            const jobsStatus = await Promise.all(jobs.map(async j=> !(await j.isCompleted() || await j.isFailed())));
            jobs = jobs.filter((j, i) => jobsStatus[i]);
            
            jobsFinished += jobsCount - (jobs.length + jobsFinished);
            job.progress((jobsFinished/jobsCount)*100);
            //console.log(`jobsFinished: ${jobsFinished} | jobsCount: ${jobsCount} | jobs.length: ${jobs.length}`);
            //console.log(`jobs[0] comp: ${await jobs[0].isCompleted()} | jobs[0] fail: ${await jobs[0].isFailed()} | combo: ${!(await jobs[0].isCompleted() || await jobs[0].isFailed())}` );
            await (new Promise(resolve => setTimeout(resolve, 1000))); // crude sleep
        }
        // await new Promise(resolve => setTimeout(resolve, 5000));
        console.log(`${job.name} done`);
        job.progress(100);
        return Promise.resolve(true);
    });
})();

module.exports = toolQueue;