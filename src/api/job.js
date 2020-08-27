const express = require("express");
const router = express.Router();
const toolQueue = require("../workers/tools")

//jobId = document id
router.get("/:jobId/status", async (req, res) => {
    const job = await toolQueue.getJob(req.params.jobId);
    if (job != null) {
        const progress = await job.progress();
        const isFinished = await job.isCompleted();
        res.json({
            success: true,
            progress: progress,
            finished: isFinished,
            id: job.id
        });
    }
    else {
        res.status(404).json({
            success: false,
            message: "cannot find that job in queue"
        });
    }
});

module.exports = router;