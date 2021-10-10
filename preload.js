const { ipcRenderer } = require("electron");

window.addEventListener("DOMContentLoaded", () => {
    const replaceText = (selector, text) => {
        const element = document.getElementById(selector);
        if (element) element.innerText = text;
    };

    // eslint-disable-next-line no-restricted-syntax
    for (const dependency of ["chrome", "node", "electron"]) {
        replaceText(`${dependency}-version`, process.versions[dependency]);
    }

    setTimeout(() => {
        ipcRenderer.send("100::askServer");
    }, 100);
    setTimeout(() => {
        ipcRenderer.send("1000:askServer");
    }, 1000);
    setTimeout(() => {
        ipcRenderer.send("2000:askServer");
    }, 2000);
    setTimeout(() => {
        ipcRenderer.send("3000:askServer");
    }, 3000);
    setTimeout(() => {
        ipcRenderer.send("4000:askServer");
    }, 4000);

    ipcRenderer.on("100::backToClient", (event, serverAnswers) =>
        console.log("100::backToClient server answers: ", serverAnswers)
    );
    ipcRenderer.on("1000:backToClient", (event, serverAnswers) =>
        console.log("1000:backToClient server answers: ", serverAnswers)
    );
    ipcRenderer.on("2000:backToClient", (event, serverAnswers) =>
        console.log("2000:backToClient server answers: ", serverAnswers)
    );
    ipcRenderer.on("3000:backToClient", (event, serverAnswers) =>
        console.log("3000:backToClient server answers: ", serverAnswers)
    );
    ipcRenderer.on("4000:backToClient", (event, serverAnswers) =>
        console.log("4000:backToClient server answers: ", serverAnswers)
    );
    ipcRenderer.on("5000:backToClient", (event, serverAnswers) =>
        console.log("5000:backToClient server answers: ", serverAnswers)
    );
});
