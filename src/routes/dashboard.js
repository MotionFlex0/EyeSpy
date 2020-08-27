const express = require('express');
const router = express.Router();

const Domain = require("../models/domain")
const Subdomain = require("../models/subdomain")

const config = require("../config/prod")

const SUBDOMAINS_PER_PAGE = 8;

router.get("/", (req, res) => {
    const script = ["js/dashboard.js"];
    res.render("dashboard", {title:"Dashboard", script});
    
});

router.get("/domains", (req, res) => {
    const script = ["/js/dashboard/domain_list.js"];
    const css = ["/css/dashboard.css"];
    res.render("dashboard/domain_list", { title: "Dashboard - Domain list", script, css});
});

router.get("/domains/:domainId/search", (req, res) => {
    const script = ["/js/dashboard/domain_overview.js"];
    const css = ["/css/dashboard.css"];

    const intOrDefault = (val, defaultVal) => isNaN(parseInt(val)) ? defaultVal : parseInt(val);

    const query = req.query.q == undefined ? "" : req.query.q;
    const start = intOrDefault(req.query.start, 0);
    const count = intOrDefault(req.query.count, config.website.SUBDOMAINS_PER_PAGE);

    Domain.findById(req.params.domainId)
    .lean()
    .then((domain) => {
        Subdomain.find({rootDomain: domain._id})
        .sort({"subdomain":1})
        .lean()
        .then((subdomains) => {
            let maxPage = 1;
            if (subdomains.length > 0) {
                if (subdomains.length-1 < start)
                    start = 0;
                
                maxPage = Math.ceil(subdomains.length/count);
                // let splitArr = (x=>{let a=[];for(;x>0;x--)a[x-1]=[];return a;})(maxPage); //weird function but it essentially create a 2d array (x)
                // splitArr[0][0] = subdomains[0];
                // for (let i = 1; i < subdomains.length; i++)
                //     splitArr[Math.floor(i/SUBDOMAINS_PER_PAGE)][i%SUBDOMAINS_PER_PAGE] = subdomains[i];
                // subdomain = splitArr;
                const tempArr = [];
                for (let i = 0, j = start; i < count && j < subdomains.length; i++, j++)
                    tempArr[i] = subdomains[j];
                subdomains = tempArr;
            }

            console.log(domain)
            res.render("dashboard/domain_overview", {
                title: "Domain Overview",
                count,
                cardCount: [0,1,2,3,4,5,6,7],
                currentPage: Math.ceil(start+1/count),
                maxPage,
                subdomains,
                domain,
                script,
                css,
                imagePath: config.imagePath
            });
        });
    })
    .catch(err => res.status(404).send("could not find domain with that _id"));
});

router.get("/domains/:domainId/filter/:query", (req, res) => {

});

module.exports = router;