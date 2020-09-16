const bodyParser = require("body-parser")
const cookieParser = require("cookie-parser");
const childProcess = require("child_process")
const csurf = require("csurf");
const exphs = require("express-handlebars");
const express = require("express");
const http = require("http");
const path = require("path");
const socketio = require("socket.io")

const app = express();
const server = http.createServer(app);
const io = socketio(server);

const csrfProtection = csurf({cookie:true});

const mongoose = require("mongoose")

const config = require("./config/prod");
const dashboard = require("./routes/dashboard");
const { exit } = require("process");

//const browser = puppeteer.launch();
(() => { // Check if python is installed, before starting server -- TODO: improve readability
    try {
        childProcess.execSync("python --version");
    }
    catch (ex) {
        console.error("ERROR: python needs to be install and added to the PATH/env variable");
        exit(-1);
    }
})();

app.use(bodyParser.json())
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));
app.use(config.website.rootImagePath, express.static(config.systemRootImagePath))
app.set("views", path.join(__dirname, "../views"));

app.engine("hbs", exphs({extname:"hbs"}));
app.set("view engine", "hbs");

app.use("/dashboard", dashboard);
app.use("/api/domains", require("./api/domains"));
app.use("/api/job", require("./api/job"))

app.get("/", (req, res) => {
    const script = ["js/index.js"];
    res.render("index", {title:"Login page", script});
});

server.listen(5000);

mongoose.connect(config.database.url, {useNewUrlParser: true});
const db = mongoose.connection;

db.on("error", console.error.bind(console, "connection error:"));
db.on("open", () => {
    console.log("successfully connected");
});

//NAME: EyeSpy