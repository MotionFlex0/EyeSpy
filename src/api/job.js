const express = require("express");
const router = express.Router();
const toolQueue = require("../workers/tools")

const BulkJob = require("../models/bulk_job");

//jobId = document id
router.get("/:jobId/status", async (req, res) => {
    const bulkType = req.query.type == "bulk";
    if (bulkType) {
        try {
            const jobs = await BulkJob.findById("")

        }
        catch (e){

        }
    }
    else {
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
                progress: progress,
                finished: isFinished,
                ...data && {data},
                ...error && {error},
                gba: await job.toJSON()
            });
        }
        else {
            res.status(404).json({
                success: false,
                message: "cannot find that job in queue"
            });
        }
    }
});

module.exports = router;