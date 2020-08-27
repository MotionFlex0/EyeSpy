const mongoose = require("mongoose");

const url = require("url");

const domainSchema = mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    hostname: {
        type: String,
        required: "Host cannot be empty",
        unique: true
    },
    tls_supported: Boolean,
    last_scan_timestamp: Date
});

module.exports = mongoose.model("Domain", domainSchema);