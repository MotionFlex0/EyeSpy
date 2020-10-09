const toolQueue = require("../workers/tools");
const Domain = require("../models/domain");
const Subdomain = require("../models/subdomain");

module.exports = {
    addActiveJobsToDomain: async function(domain) {
        const jobs = await this.getActiveDomainJobs(domain).then(arr => arr.map(j => j.id));
        return {
            ...domain.toJSON(),
            jobs
        }; 
    },
    addActiveJobsToSubdomain: async function(subdomain) {
        const jobs = (await this.getActiveSubdomainJobs(subdomain)).map(j => j.id);
        return {
            ...subdomain.toJSON(),
            jobs
        };
    },
    addActiveJobsToSubdomains: async function(subdomains) {
        let activeJobs = await toolQueue.getJobs(["active", "delayed", "waiting"]);
        if (Array.isArray(subdomains)) {
            subdomains = subdomains.map(s => {
                let jobs = activeJobs.filter(j => (j.name == "ispy" || j.name == "infodump") && j.data.subdomainId == s._id).map(j => j.id);
                //console.log({b:1, s});
                return {
                    ...s.toJSON(),
                    jobs
                }
            });
        }
        return subdomains;
    },
    getActiveDomainJobs: async function(domain) {
        let activeJobs = await toolQueue.getJobs(["active", "delayed", "waiting"]);
        return activeJobs.filter(j => (j.name == "ispy-bulk" || j.name == "sublist3r") && j.data.domainId == domain._id);
    },
    getActiveSubdomainJobs: async function(subdomain) {
        let activeJobs = await toolQueue.getJobs(["active", "delayed", "waiting"]);
        return activeJobs.filter(j => (j.name == "ispy" || j.name == "infodump") && j.data.subdomainId == subdomain._id);
    }
}