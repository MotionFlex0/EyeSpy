const Bull = require("bull");
const childProcess = require("child_process");
const config = require("../config/prod");
const fs = require("fs")
const mongoose = require("mongoose")
const puppeteer = require("puppeteer");
const path  = require("path")
const uuid = require("uuid");

const Subdomain = require("../models/subdomain");
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
        const subdomain = job.data.subdomain;
        const page = await browser.newPage();

        let imagePath = path.join(config.imagePath, subdomain.rootDomain);
        if (!fs.existsSync(imagePath))
            fs.mkdirSync(imagePath);

        imagePath = path.join(imagePath, `${subdomain.subdomain}.png`);

        await page.goto(`${subdomain.tls_supported?"https":"http"}://${subdomain.subdomain}`);
        await page.screenshot({path: imagePath});
        await page.close();
        Subdomain.
        subdomain.screenshotFilename = imagePath;
        subdomain.markModified("screenshotFilename");
        await subdomain.save();
        done();
    });
})();

module.exports = toolQueue;