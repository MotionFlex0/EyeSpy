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
const toolQueue = new Bull("queue");

(async () => {
    const browser = await puppeteer.launch();

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
    
    toolQueue.process("ispy", async (job, done) => {
        try {
            let progressCount = 0; 
            const progressCalls = 6;

            const subdomain = await Subdomain.findById(job.data.subdomainId);
            const page = await browser.newPage();
            job.progress((++progressCount/progressCalls)*100);
            
            let fullImagePath = path.join(config.systemRootImagePath, subdomain.rootDomain.toString());
            if (!fs.existsSync(fullImagePath))
                fs.mkdirSync(fullImagePath);
            job.progress((++progressCount/progressCalls)*100);
    
            fullImagePath = path.join(fullImagePath, `${subdomain.subdomain}.png`);
    
            await page.goto(`${subdomain.tls_supported?"https":"http"}://${subdomain.subdomain}`);
            job.progress((++progressCount/progressCalls)*100);
            await page.screenshot({path: fullImagePath});
            job.progress((++progressCount/progressCalls)*100);
            await page.close();
            
            subdomain.imagePath = path.join(subdomain.rootDomain.toString(), `${subdomain.subdomain}.png`);
            await subdomain.save();
            job.progress((++progressCount/progressCalls)*100);
            console.log("updated image");
            done(null, subdomain.imagePath);
        }
        catch (e){
            done(e);
        }
        finally {
            job.progress = 100;
        }
    });
})();

module.exports = toolQueue;