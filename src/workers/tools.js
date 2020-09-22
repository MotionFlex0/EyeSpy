const Bull = require("bull");
const childProcess = require("child_process");
const config = require("../config/prod");
const fs = require("fs")
const mongoose = require("mongoose")
const puppeteer = require("puppeteer");
const path  = require("path")
const uuid = require("uuid");

const Subdomain = require("../models/subdomain");
const { error } = require("console");
const subdomain = require("../models/subdomain");
const { Domain } = require("domain");
const toolQueue = new Bull("queue");

(async () => {
    const browser = await puppeteer.launch({headless: false});

    toolQueue.on("stalled", (job) => { 
        console.error(`job with id ${job.id} and name ${job.name} has stalled`);
    });

    toolQueue.on("")

    toolQueue.process("sublist3r", (job, done) => {
        const hostname = job.data.hostname;
        const outputFile = path.join(config.tempPath, `${uuid.v4()}.txt`);
        const process = childProcess.spawnSync("python", ["./tools/sublist3r/sublist3r.py",
                                            "-d",
                                            hostname,
                                            "-o",
                                            outputFile
                                        ]);
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
                        rootDomain: job.data.rootDomain
                    })).save();
                    
                    //console.log(`saving new domain {${subdomain}} with rootDomain {${job.data.rootDomain}}`);
                }
            });
        }
 
        console.log(`job ${job.id} has finished.`);
            done(process.error);
    }); 

    toolQueue.process("ispy", 10, async (job, done) => {
        const subdomain = await Subdomain.findById(job.data.subdomainId);
        try {
            let progressCount = 0; 
            const progressCalls = 6;

            const page = await browser.newPage();
            job.progress((++progressCount/progressCalls)*100);
            
            let fullImagePath = path.join(config.systemRootImagePath, subdomain.rootDomain.toString());
            if (!fs.existsSync(fullImagePath))
                fs.mkdirSync(fullImagePath);
            job.progress((++progressCount/progressCalls)*100);
    
            fullImagePath = path.join(fullImagePath, `${subdomain.subdomain}.png`);
    
            const resp = await page.goto(`${subdomain.tls_supported?"https":"http"}://${subdomain.subdomain}`, { timeout: 10000 });
            job.progress((++progressCount/progressCalls)*100);
            await page.screenshot({path: fullImagePath});
            job.progress((++progressCount/progressCalls)*100);
            await page.close();
            
            subdomain.lastConnSuccessful = true;
            subdomain.lastStatusCode = resp.status();
            subdomain.imagePath = path.join(subdomain.rootDomain.toString(), `${subdomain.subdomain}.png`);
            await subdomain.save();
            job.progress((++progressCount/progressCalls)*100);
            console.log("updated image");
            done(null, subdomain.imagePath);
        }
        catch (e){
            console.log("failed....");
            console.log(e.message);
            subdomain.lastError = e.message;
            subdomain.lastConnSuccessful = false;
            subdomain.save();
            done(e.message);
        }
        finally {
            job.progress = 100;
        }
    });

    //TODO: Create a single "bulk" job and pass the name for the specific job, as part of the data.
    toolQueue.process("ispy-bulk", async (job, done) => {
        const domain = await Domain.findById(job.data.domainId);
        const subdomains = await Subdomain.find({rootDomain: job.data.domainId}).limit(5).exec();

        domain.bulk_job_id = job.id;

        const jobs = await Promise.all(subdomains.map(async s => {
            return await toolQueue.add("ispy", {subdomainId: s._id});
        }));

        const jobsCount = jobs.length;
        let jobsFinished = 0;
        while (jobsFinished < jobsCount) {
            jobs = jobs.filter(async job => !(await job.isCompleted() || await job.isFailed()));
            jobsFinished += jobsCount - jobs.length;
            job.progress((jobsFinished/jobsCount)*100);
            await (new Promise(resolve => setTimeout(resolve, 500))); // crude sleep
        }

        
        // await new Promise(resolve => setTimeout(resolve, 5000));
        // console.log("job done");

        domain.bulk_job_id = null;
        done(null, true);
    });
})();

module.exports = toolQueue;