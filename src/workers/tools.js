const Bull = require("bull");
const childProcess = require("child_process");
const config = require("../config/prod");
const fs = require("fs")
const mongoose = require("mongoose")
const path  = require("path")
const uuid = require("uuid");

const Subdomain = require("../models/subdomain");

const toolQueue = new Bull("queue");

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
        const fileContent = fs.readFileSync(outputFile).toString().split("\r\r\n").forEach(async subdomain => { //fixes issue with sublist3r using 2 CR in output file
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

toolQueue.process("ispy", (job, done) => {

});

module.exports = toolQueue;