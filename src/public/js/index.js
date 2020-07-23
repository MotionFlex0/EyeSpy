const { credential } = require("firebase-admin");

window.onload = () => {
    M.AutoInit();
    const progressBar = document.querySelector("#progressBar");
    const submitBtn =  document.querySelector("#submitBtn");
    submitBtn.addEventListener("click", () => {
        const email = document.querySelector("#email");
        const password = document.querySelector("#password");

        if (email.value !== "" && password.value !== "") {
            submitBtn.parentElement.parentElement.classList.add("hide"); //the button's row node
            progressBar.parentElement.classList.remove("hide");
            firebase.auth().signInWithEmailAndPassword(email.value, password.value)
            .then((credentials) => {
                //if (credentials.user
            })


        }

    });
};