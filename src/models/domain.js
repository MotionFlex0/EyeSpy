const mongoose = require("mongoose");
const url = require("url");

const toolQueue = require("../workers/tools");

const DomainSchema = mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    hostname: {
        type: String,
        required: "Host cannot be empty",
        unique: true,
    },
    tls_supported: Boolean,
    last_scan_timestamp: Date,
    bulk_job_id: { //bulk_image_job
        type: String,
        default: null
    } // non-null if there is a bulk-job for this domain
});

DomainSchema.methods.getActiveJobs = function() {
    let activeJobs = await toolQueue.getJobs(["active", "delayed", "waiting"]);
    return activeJobs.filter(j => j.name == "ispy-bulk" && j.data.domainId == this._id);
}

module.exports = mongoose.model("Domain", DomainSchema);