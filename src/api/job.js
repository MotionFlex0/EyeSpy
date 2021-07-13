const express = require("express");
const router = express.Router();
const toolQueue = require("../workers/tools")

const BulkJob = require("../models/bulk_job");

//jobId = document id

router.use("/:jobId", async (req, res, next) => {
    const job = await toolQueue.getJob(req.params.jobId);
    if (job == null) 
        return res.status(404).json({
            success: false,
            message: "cannot find that job in queue"
        });

    res.locals.job = job;
    next();
})

router.get("/:jobId/status", async (req, res) => {
    const job = await toolQueue.getJob(req.params.jobId);
    if (job != null) {
        let data = null;
        let error = null;
        const progress = await job.progress();
        const isFinished = await job.isCompleted() || await job.isFailed();
        

        if (isFinished) {
            try {
                data = await job.finished();
            }
            catch (e) {
                error = e;
            }
        }

        res.json({
            success: true,
            progress: progress.toFixed(2), // toFixed is not super accurate but it should be sufficient
            finished: isFinished,
            name: job.name,
            ...data && {data},
            ...error && {error}
        });
    }
    else {
        res.status(404).json({
            success: false,
            message: "cannot find that job in queue"
        });
    }
});

router.delete("/:jobId", async (req, res) => {
    await res.locals.job.moveToFailed({message: "job deleted using /api/:jobId"}, true);
    res.json({
        success: true
    });
});

module.exports = router;