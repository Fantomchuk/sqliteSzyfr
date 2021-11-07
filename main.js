const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");

const { debounceTime, map } = require("rxjs/operators");
const DataBase = require("./backend/core/DataBase");
const LocalLogs = require("./backend/core/LocalLogs");

const SettingsDBModel = require("./backend/dbModels/Settings");
const UsersDBModel = require("./backend/dbModels/Users");

let pipeList = [];

UsersDBModel.$.pipe(
    map((oneRow) => {
        // console.log("map: oneRow => ", oneRow);
        pipeList.push(oneRow);
    }),
    debounceTime(500)
).subscribe(() => {
    // console.log("--------refresh list UsersDBModel--------");
});
SettingsDBModel.$.pipe(
    map((oneRow) => {
        // console.log("map: oneRow => ", oneRow);
        pipeList.push(oneRow);
    }),
    debounceTime(500)
).subscribe(() => {
    // console.log("--------refresh list--------");
});

ipcMain.on("100::askServer", (event) => {
    event.reply("100::backToClient", { action: "START" });
});

ipcMain.on("1000:askServer", async (event) => {
    // var list = await DataBase.testGet();
    try {
        const db = await UsersDBModel.find({
            limit: 10,
            page: 1,
            orderBy: { id: "DESC" },
        });

        // var list = UsersDBModel.find({
        //     where: "name = ?",
        //     params: ['Nazar']
        // })

        event.reply("1000:backToClient", { db, action: "beforAdded", pipeList });
    } catch (error) {
        event.reply("1000:backToClient", { error });
    }
});

ipcMain.on("2000:askServer", async (event) => {
    try {
        const user1 = {
            onlyInsert: 1,
            name: "Nazar",
            last_name: new Date().toISOString(),
            birth_day: "1991-09-19T00:00:00.000Z",
        };
        await UsersDBModel.upsert(user1);
        LocalLogs.add("MAIN", "UsersDBModel", "firstObj", user1);

        const user2 = { id: 2, name: "Tetiana", last_name: new Date().toISOString() };
        await UsersDBModel.upsert(user2);
        LocalLogs.add("MAIN", "UsersDBModel", "seckondObj", user2);

        const settings = { key: "password", value: "1234Naz" };
        await SettingsDBModel.upsert(settings);
        LocalLogs.add("MAIN", "SettingsDBModel", "obj", settings);

        const pathLocalFiles = LocalLogs.getFullPath();
        event.reply("2000:backToClient", {
            pathLocalFiles,
            upsertUsers: "+2 rows in table Users",
            upsertSettings: "+1 row in table Settings",
            pipeList,
            action: "added",
        });
    } catch (error) {
        event.reply("2000:backToClient", { error });
    }
});

ipcMain.on("3000:askServer", async (event) => {
    try {
        const db = await DataBase.getAllRows();
        LocalLogs.add("MAIN", "UsersDBModel", "after");
        event.reply("3000:backToClient", { db, dbPassword: DataBase.keyToDB, action: "afterAdded", pipeList });
    } catch (error) {
        event.reply("3000:backToClient", { error });
    }
});

ipcMain.on("4000:askServer", (event) => {
    event.reply("4000:backToClient", { action: "END" });
});

function createWindow() {
    // Create the browser window.
    const mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
        },
    });
    mainWindow.loadFile("index.html");

    // command+R
    mainWindow.webContents.on("devtools-reload-page", () => {
        pipeList = [];
    });

    // Open the DevTools.
    mainWindow.webContents.openDevTools();
}

app.whenReady().then(() => {
    createWindow();

    app.on("activate", function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on("window-all-closed", function () {
    if (process.platform !== "darwin") app.quit();
});
