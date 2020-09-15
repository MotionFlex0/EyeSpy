const mongoose = require("mongoose");

const bulkJob = mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    name: String,
    finished: {
        type: Boolean,
        default: false
    },
    jobs: Array,
    data: String
});

module.exports = mongoose.model("BulkJob", bulkJob);