window.onload = () => {
    M.AutoInit();

    document.querySelector("#search").addEventListener("input", async (e) => {
        progress.showPreloader();
        const searchText = document.querySelector("#search").value;
        const contents = await api.requestNewPage(searchText, 0, config.count);
        progress.hidePreloader();

        pagination.setMaxPage(config.maxPage = contents.maxPage);
        pagination.updatePageNumber(1);
        card.updateCardsFromServerJson(contents);



        // const domainListNodes = document.querySelectorAll("#subdomain_list > a:not(#default_subdomain_item)");
        // if (searchText != "") {
        //     let listEmpty = true;
        //     for (let n of domainListNodes) {
        //         if (n.innerHTML.toLowerCase().includes(searchText.toLowerCase())) {
        //            if (n.classList.contains("hide"))
        //                 n.classList.remove("hide");
        //             listEmpty = false;
        //         }
        //         else
        //             n.classList.add("hide");

        //         //if list
        //     }
        // }
        // else {
        //     for (let n of domainListNodes) {
        //         if (n.classList.contains("hide"))
        //             n.classList.remove("hide");
        //     }
        // }
        console.log("event fired");
    });

    // document.querySelector("#scanBtn").addEventListener("click", () => {
    //     fetch("/api/domains/subscan");
    // });

    document.querySelectorAll(".pagination > li.pli, li.pli_max, li.chevron_left, li.chevron_right").forEach(
        e => e.addEventListener("click", paginationHandler)
    );


}

async function paginationHandler(ev) {
    if (ev.srcElement.parentNode.parentNode.classList.contains("chevron_left"))
        pagination.updatePageNumber(pagination.getCurrentPage()-1);
    else if (ev.srcElement.parentNode.parentNode.classList.contains("chevron_right"))
        pagination.updatePageNumber(pagination.getCurrentPage()+1);
    else 
        pagination.updatePageNumber(ev.srcElement.innerHTML);

    progress.showPreloader();
    const newPage = pagination.getCurrentPage();
    const contents = await api.requestNewPage(document.querySelector("#search").value, (newPage-1)*config.count, config.count);
    progress.hidePreloader();
    card.updateCardsFromServerJson(contents);

}

const api = {
    requestNewPage: async function(query, start, count) {
        const q = encodeURIComponent(query);
        const s = encodeURIComponent(start);
        const c = encodeURIComponent(count);
        return await (await fetch(`/api/domains/id/${config.domainId}/subdomains?q=${q}&start=${s}&count=${c}`)).json();
    }
}

const card = {
    //0-based index
    toggleVisibility: function(cardNum, visible) {
        const cards = document.querySelectorAll(".sub_card");
        if (cards.length > cardNum) {
            cards[cardNum].classList.toggle("hide", !visible);
        }
    },
    updateCardsFromServerJson: function(resp) {
        const sub_card = document.querySelectorAll(".sub_card");
        for (let i = 0; i < sub_card.length; i++) {
            //sub_card[i].childNodes[0].childNodes[0].src = """
            if (resp.subdomains.length > i) {
                card.toggleVisibility(i, true);
                sub_card[i].querySelector(".card-content > p").innerHTML = resp.subdomains[i].subdomain;
            }
            else
                card.toggleVisibility(i, false);
        }
    }
}

const debounce = {
    check: function() {
        return this.locked == undefined ? false : this.locked;
    },
    lock: function() {
        this.locked = true;
    },
    unlock: function() {
        this.locked = false;
    }
}

const progress = {
    showPreloader: function() {
        const preloader = document.querySelector("#card_preloader");
        for (let i = 0; i < config.count; i++) 
            card.toggleVisibility(i, false);
        preloader.classList.add("active");
        preloader.classList.remove("hide");
    },
    hidePreloader: function() {
        const preloader = document.querySelector("#card_preloader");
        for (let i = 0; i < config.count; i++) 
            card.toggleVisibility(i, false);
        preloader.classList.add("hide");
        preloader.classList.remove("active");    
    }
}

const pagination = {
    getCurrentPage: function() {
        return parseInt(
            document.querySelector(".pagination > li.active").childNodes[0].innerHTML
        );
    },
    setItemDisabled: function(element, disable) { 
        if (disable) {
            element.classList.add("disabled");
            element.classList.remove("waves-effect");
            element.childNodes[0].classList.add("ternary-color-text");
            element.childNodes[0].classList.remove("secondary-color-text");
        }
        else {
            element.classList.remove("disabled");
            element.classList.add("waves-effect");
            element.childNodes[0].classList.remove("ternary-color-text");
            element.childNodes[0].classList.add("secondary-color-text");

        }
    },
    setMaxPage: function (maxPage) {
        const pli_max = document.querySelector(".pagination > .pli_max");
        pli_max.childNodes[0].innerHTML = maxPage;
    },
    updatePageNumber: function(pageNum) {
        pageNum = parseInt(pageNum);
        if (isNaN(pageNum) || pageNum < 1 || pageNum > config.maxPage || this.getCurrentPage() == pageNum) 
            return;

        const activeItem = document.querySelector(".pagination > li.active");
        activeItem.classList.remove("active", "primary-color");
        if (pageNum <= 3) {
            const numberedItems = document.querySelectorAll(".pagination > li.pli");
            for (let i = 0; i < numberedItems.length; i++) {
                if (i+1 == pageNum) 
                    numberedItems[i].classList.add("active", "primary-color");
                numberedItems[i].childNodes[0].innerHTML = i+1;
            } 

        }
        else if (pageNum+2>=config.maxPage) {
            const numberedItems = document.querySelectorAll(".pagination > li.pli");
            for (let i = 0, j = -5; i < numberedItems.length; i++, j++) {
                if (config.maxPage+j == pageNum) 
                    numberedItems[i].classList.add("active", "primary-color");
                numberedItems[i].childNodes[0].innerHTML = config.maxPage + j;
            } 
        }
        else {
            const numberedItems = document.querySelectorAll(".pagination > li.pli");
            for (let i = 0, j = -2; i < numberedItems.length; i++, j++) {
                if (j == 0) 
                    numberedItems[i].classList.add("active", "primary-color");
                numberedItems[i].childNodes[0].innerHTML = pageNum+j;
            }   
        }
    
        const chev_left = document.querySelector(".pagination > .chevron_left");
        const chev_right = document.querySelector(".pagination > .chevron_right");
        const seperator = document.querySelector(".pagination > .seperator");
        const pli_max = document.querySelector(".pagination > .pli_max");
        this.setItemDisabled(chev_left, pageNum == 1);
        this.setItemDisabled(chev_right, pageNum == config.maxPage);
        seperator.classList.toggle("hide", pageNum+2>=config.maxPage);
        pli_max.classList.toggle("active", pageNum == config.maxPage);


    }
}