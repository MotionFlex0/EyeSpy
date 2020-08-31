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
    config.systemRootImagePath = `${homedir}/Pictures/eyespy`;
}
else {
    config.systemRootImagePath = "";
}

//#endregion config -- DO NOT EDIT BELOW THIS LINE

assert(config.systemRootImagePath != "", 'config.imagePath == ""');

if (!fs.existsSync(config.systemRootImagePath))
    fs.mkdirSync(config.systemRootImagePath);

module.exports = config;