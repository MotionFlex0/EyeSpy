const fs = require("fs");
const os = require("os");
const path = require("path");
const uuid = require("uuid");

const { assert } = require("console");

const config = {};

const homedir = os.homedir();

config.website = require("./core/website");
config.database = require("./core/database");
config.tempPath = fs.mkdtempSync(path.join(os.tmpdir(), "sdb-"));

//#region config -- DO NOT EDIT ABOVE THIS LINE 
if (os.platform() == "win32") { //Windows
    config.imagePath = `${homedir}/Pictures/eyespy`;
}
else {
    config.imagePath = "";
}

//#endregion config -- DO NOT EDIT BELOW THIS LINE

assert(config.imagePath != "", 'config.imagePath == ""');

if (!fs.existsSync(config.imagePath))
    fs.mkdirSync(config.imagePath);

module.exports = config;