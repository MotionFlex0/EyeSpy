window.onload = () => {
    M.AutoInit();
    console.log("domains.js loaded");
    refreshDomainList();
    document.querySelector("#addButton").addEventListener("click", () => {
        const inputHostname = document.querySelector("#input_hostname")
        const hostname = inputHostname.value;
        if (hostname != "") {
            fetch("/api/domains", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({hostname})
            })
            .then(resp => resp.json())
            .then(res => {
                if (res.success)
                    refreshDomainList();

                const color = res.success ? "green lighten-2" : "red lighten-2";
                M.toast({html: `<div class=\"black-text text-accent-1\"><b>${res.message}</b></div>`, classes:color});
            })

            inputHostname.value = "";
        }
       
    });
    document.querySelector("#search").addEventListener("input", (e) => {
        const searchText = document.querySelector("#search").value;
        const domainListNodes = document.querySelectorAll("#domain_list > a:not(#default_domain_item)");
        if (searchText != "") {
            let listEmpty = true;
            for (let n of domainListNodes) {
                if (n.innerHTML.toLowerCase().includes(searchText.toLowerCase())) {
                   if (n.classList.contains("hide"))
                        n.classList.remove("hide");
                    listEmpty = false;
                }
                else
                    n.classList.add("hide");
            }
        }
        else {
            for (let n of domainListNodes) {
                if (n.classList.contains("hide"))
                    n.classList.remove("hide");
            }
        }
        console.log("event fired");
    });
};

function refreshDomainList() {
    return fetch("/api/domains/all")
    .then(resp => resp.json())
    .then(domains => {
        const domains_list = document.querySelector("#domain_list");
        const default_node = domains_list.querySelector("#default_domain_item");
        const domain_nodes = domains_list.querySelectorAll("a:not(#default_domain_item)");
        if (domains.result.length < 1) {
            domain_nodes.forEach(d => d.remove());
            default_node.classList.add("show");
        }
        else {
            domain_nodes.forEach(d => d.remove());
            default_node.classList.add("hide");
            domains.result.forEach(d => {
                const newNode = default_node.cloneNode();
                newNode.classList.remove("hide");
                newNode.id = "";
                newNode.dataset.uuid = d._id;
                newNode.innerHTML = d.hostname;
                newNode.href = `/dashboard/domains/${d._id}/search`;
                domains_list.appendChild(newNode);
            });
        }
        console.log(domains);
    })
    .catch(err => console.log(err));
}