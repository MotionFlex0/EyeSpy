const mongoose = require("mongoose");

const toolQueue = require("../workers/tools");

const SubdomainSchema = new mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    subdomain: {
        type: String,
        required: true
    },
    cname: String,
    a: String,
    imagePath: {
        type: String,
        default:""
    },
    serviceProvider: {
        type: String,
        enum: ["heroku", "s3", "wordpress", "cloudfront", "ghpages", "none"],
        default: "none",
    },
    rootDomain: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Domain",
        required: true
    },
    lastConnSuccessful: {
        type: String,
        enum: ["true", "false", "never"],
        default: "never"
    },
    lastError: String,
    lastStatusCode: Number
});

module.exports = mongoose.model("Subdomain", SubdomainSchema);