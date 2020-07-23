const cookieParser = require('cookie-parser');
const csurf = require('csurf');
const exphs = require("express-handlebars");
const express = require("express");
const http = require("http");
const path = require("path");
const puppeteer = require("puppeteer");
const socketio = require("socket.io")

const app = express();
const server = http.createServer(app);
const io = socketio(server);

const firebaseAdmin = require("firebase-admin");
const serviceAccount = require("../secrets/subdomain-bot-firebase-adminsdk-8bdwk-86b9a10cde.json")

const csrfProtection = csurf({cookie:true});

//const browser = puppeteer.launch();

app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));
app.set("views", path.join(__dirname, "../views"));

app.engine("hbs", exphs({extname:"hbs"}));
app.set("view engine", "hbs");

app.get("/", (req, res) => {
    const script = ["js/index.js"];
    res.render("index", {title:"Login page", script});
});

app.get("/dashboard", (req, res) => {
    const script = ["js/dashboard.js"];
    res.render("dashboard", {title:"Login page", script});
    
});

server.listen(5000, () => {
    console.log("server started");
    
});

// admin.initializeApp({
//     credential: admin.credential.cert(serviceAccount),
//     databaseURL: "https://subdomain-bot.firebaseio.com"
//   });