const mongoose = require("mongoose");

const SubdomainSchema = new mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    subdomain: String,
    cname: String,
    a: String,
    screenshotFilename: String,
    serviceProvider: {
        type: String,
        enum: ["heroku", "s3", "wordpress", "cloudfront", "ghpages", "none"],
        default: "none",
    },
    rootDomain: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Domain",
        required: true
    }
});

module.exports = mongoose.model("Subdomain", SubdomainSchema);