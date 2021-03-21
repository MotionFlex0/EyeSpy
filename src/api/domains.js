const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const url = require("url");

const { body, validationResult } = require("express-validator");

const config = require("../config/prod");
const Domain = require("../models/domain")
const Subdomain = require("../models/subdomain");
const toolQueue = require("../workers/tools");
const queueQuery = require("../lib/queue_query");
const domain = require("../models/domain");
const e = require("express");

router.get("/", (req, res) => {
    res.send("at api/home");
});

router.post("/",[ 
    body("hostname").isURL()
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: "That hostname was not valid."
        });
    }

    const urlParsed = url.parse(req.body.hostname);
    const tls_supported = urlParsed.protocol == "https:";
    const hostname = urlParsed.hostname;

    if (hostname == null) {
        return res.status(400).json({
            success: false,
            message: "The hostname requires the scheme of http(s)."
        });
    }

    const domain = new Domain({
        _id: mongoose.Types.ObjectId(),
        hostname,
        tls_supported
    });

    Domain.find({hostname}, (err, hs) => {
        if (hs.length == 0) {
            domain.save().then(()=> {
                res.status(201).json({
                    success: true,
                    message: `Successfully added ${hostname} to the domains list`
                });
            });
        }
        else {
            res.status(400).json({
                success: false,
                message: `${hostname} already exists`
            });
        }
    })
});

/*router.get("/:domainid", (req, res) => {

});*/

router.get("/all", (req, res) => {
    Domain.find((err, result) => {
        if (err != null)
            result = [];

        res.json({
            success: true, 
            result
        });
    });

});

router.use("/id/:domainId", async (req, res, next) => {
    res.locals.domain = await Domain.findById(req.params.domainId);   
    if (res.locals.domain == null) {
        return res.status(404).json({
            success: false,
            message: "cannot find domain with that id."   
        });
    }
    next();
});

router.use("/id/:domainId/run/", async (req, res, next) =>  {
    const jobs = await queueQuery.getActiveDomainJobs(res.locals.domain);

    if (jobs.length > 0) {
        return res.status(400).json({
            success: false,
            jobs,
            message: `${res.locals.domain._id} already has a running job`
        }); 
    }
    next();
});

router.use("/id/:domainId/s/:subdomainId", async (req, res, next) => {
    res.locals.subdomain = await Subdomain.findOne({
        _id: req.params.subdomainId,
        rootDomain: res.locals.domain
    });
    if (res.locals.subdomain == null) {
        return res.status(404).json({
            success: false,
            message: "cannot find subdomain with that id"
        });
    }
    next();
});

router.get("/id/:domainId", async (req, res) => {
    res.json(await queueQuery.addActiveJobsToDomain(res.locals.domain));
});

//TODO: Remove the need for Domain.find, and grab it from res.locals.domain instead
router.put("/id/:domainId", (req, res) => {
    Domain.find({_id: req.params.domainId}, (err, domains) => {
        if (domains.length == 0) {
            return res.status(404).json({
                success: false,
                message: "cannot find domain with that id."   
            });
        }
        
        if (req.body.hostname != null) {
            
        }
        res.json(domains[0]);
    });
});

router.delete("/id/:domainId", (req, res) => {
    const domain = res.locals.domain;
    const hostname = domain.hostname;

    domain.remove()
    .then(() => {
        res.json({
            success: true,
            message: `removed ${hostname} from domain list`
        })
    })
    .catch(err => {
        res.json({
            success: false,
            message: `something went wrong when attempting to remove ${hostname}`
        })
    });
});

//TODO: MAYBE ADDA BULK JOB, JOB NAME AND HAVE IT ADD ALL THE OTHER JOBS
router.get("/id/:domainId/run/ispy", async (req, res) => {
    const bulkJobs = await queueQuery.getActiveDomainJobs(res.locals.domain);
    if (bulkJobs.length > 0) {
        return res.json({
            success: false,
            message: `${domainId} already has a running job`,
            bulkJobs
        });  
    }

    const domainId = res.locals.domain._id;
    const newJob = await toolQueue.add("ispy-bulk", { domainId });
    
    if (newJob != null) {
        return res.json({
            success: true,
            jobId: newJob.id
        });
    }
    else {
        return res.json({
            success: false,
            message: `failed to add a job with ${domainId} as the domainId`,
        });  
    }
    // const subdomains = await Subdomain.find({
    //     rootDomain: res.locals.domain
    // });

    // const bulkJob = new BulkJob({
    //     _id: mongoose.Types.ObjectId(),
    //     name: "ispy",
    //     data: res.locals.domain._id
    // });

    // subdomains.forEach(s => {
    //     const job = await toolQueue.add("ispy", {
    //         subdomainId: s._id
    //     });
    //     bulkJob.jobs.push(job.id);
    // });


    // bulkJob.save();
});

//subdomain filter for a given domainId
router.get("/id/:domainId/subdomains", async (req, res) =>  {
    const intOrDefault = (val, defaultVal) => isNaN(parseInt(val)) ? defaultVal : parseInt(val);

    const query = req.query.q == undefined ? "" : req.query.q;
    const useRegex = req.query.regex == undefined ? false : req.query.regex == 1;
    const start = intOrDefault(req.query.start, 0);
    const count = intOrDefault(req.query.count, config.website.SUBDOMAINS_PER_PAGE);
     

    let subdomains = await Subdomain.find({
        rootDomain: res.locals.domain, subdomain: (new RegExp(query, "i"))
    })
    .sort({"subdomain":1})
    .limit(count)
    .skip(start)
    .exec();

    const maxPage = Math.ceil(await Subdomain.find({
        rootDomain: res.locals.domain, subdomain: (new RegExp(query, "i"))
    })
    .count()/count);
    
    const domain = await queueQuery.addActiveJobsToDomain(res.locals.domain);
    subdomains = await queueQuery.addActiveJobsToSubdomains(subdomains);

    res.json({
        domain,
        maxPage,
        subdomains,
        timestamp: Date.now()
    });
});

//TODO: re-write this function. checking domainId is no longer needed.
//submit sublist3r job for a given domainId
router.get("/id/:domainId/run/subsearch", async (req, res) => {
    const newJob = await toolQueue.add("sublist3r", {hostname: res.locals.domain.hostname, domainId: res.locals.domain._id});  //TODO: check if it actually been added
    if (newJob != null) {  //not sure if this ever happens, as the function isn't .add(..) function isn't properly documented
        return res.json({
            success: true,
            jobId: newJob.id
        });
    }
    else {
        return res.json({
            success: false,
            message: `failed to add a job with ${domainId} as the domainId`,
        });                
    }
});

router.get("/id/:domainId/s/:subdomainId", async (req, res) => {
    res.json({
        success: true,
        subdomain: await queueQuery.addActiveJobsToSubdomain(res.locals.subdomain)
    });
});

//submit ispy job for a given domain
router.get("/id/:domainId/s/:subdomainId/ispy", async (req, res) => {
    const newJob = await toolQueue.add("ispy", {
        subdomainId: res.locals.subdomain._id
    });
    
    return res.json({
        success: true,
        jobId: newJob.id
    });
})

module.exports = router;