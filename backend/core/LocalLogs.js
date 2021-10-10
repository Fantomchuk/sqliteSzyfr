const { app, dialog } = require("electron");
const fs = require("fs");

const AppColorLog = require("./AppColorLog");

const userLocalLogs = `${app.getPath("userData")}/localLogs`;
if (!fs.existsSync(`${userLocalLogs}`)) fs.mkdirSync(`${userLocalLogs}`);

/**
 * Służy do lokalnych logów
 * @module LocalLogs
 * @memberof backendJS
 */
class LocalLogs {
    #extension = ".log";

    #controller = null;

    #action = null;

    #msg = null;

    #json = null;

    #date = null;

    #getCallerFile = () => {
        const originalFunc = Error.prepareStackTrace;

        let callerFileName;
        let callerFileLine;
        let callerFileColumn;
        try {
            const err = new Error();
            Error.prepareStackTrace = function (error, stack) {
                return stack;
            };
            const currentFileName = err.stack.shift().getFileName();

            while (err.stack.length) {
                const temp = err.stack.shift();

                callerFileName = temp.getFileName();
                callerFileColumn = temp.getColumnNumber();
                callerFileLine = temp.getLineNumber();

                if (currentFileName !== callerFileName) break;
            }
        } catch (error) {
            // empty
        }
        Error.prepareStackTrace = originalFunc;

        return `${callerFileName}:${callerFileLine}:${callerFileColumn}`;
    };

    #checkFileExist = () => {
        const path = `${userLocalLogs}/${this.#date.getUTCFullYear()}/${
            parseInt(this.#date.getUTCMonth(), 10) + 1
        }/${parseInt(this.#date.getUTCDate(), 10)}/${this.#controller}${this.#extension}`;
        try {
            // console.log(1);
            const status = fs.existsSync(path, fs.constants.F_OK);
            if (status) this.#writeToFile();
            else throw new Error("file not exist");
        } catch (error) {
            // console.log(2);
            this.#checkDayDir();
        }
    };

    #checkDayDir = () => {
        const path = `${userLocalLogs}/${this.#date.getUTCFullYear()}/${
            parseInt(this.#date.getUTCMonth(), 10) + 1
        }/${parseInt(this.#date.getUTCDate(), 10)}`;
        try {
            // console.log(3);
            const status = fs.existsSync(path, fs.constants.F_OK);
            if (status) this.#createFile();
            else throw new Error("Folder day not exist");
        } catch (error) {
            // console.log(4);
            this.#checkMonthDir();
        }
    };

    #checkMonthDir = () => {
        const path = `${userLocalLogs}/${this.#date.getUTCFullYear()}/${parseInt(this.#date.getUTCMonth(), 10) + 1}`;
        try {
            // console.log(5);
            const status = fs.existsSync(path, fs.constants.F_OK);
            if (status) this.#createDayDir();
            else throw new Error("Folder month not exist");
        } catch (error) {
            // console.log(6);
            this.#checkYearDir();
        }
    };

    #checkYearDir = () => {
        const path = `${userLocalLogs}/${this.#date.getUTCFullYear()}`;
        try {
            // console.log(7);
            const status = fs.existsSync(path, fs.constants.F_OK);
            if (status) this.#createMonthDir();
            else throw new Error("Folder year not exist");
        } catch (error) {
            // console.log(8);
            this.#createYearDir();
        }
    };

    #createYearDir = () => {
        const path = `${userLocalLogs}/${this.#date.getUTCFullYear()}`;
        try {
            // console.log(9);
            fs.mkdirSync(path);
            this.#createMonthDir();
        } catch (error) {
            AppColorLog.warning("LocalLogs::ERROR createYearDir");
            dialog.showMessageBox(null, { type: "error", message: "LocalLogs::ERROR createYearDir", buttons: ["ok"] });
        }
    };

    #createMonthDir = () => {
        const path = `${userLocalLogs}/${this.#date.getUTCFullYear()}/${parseInt(this.#date.getUTCMonth(), 10) + 1}`;
        try {
            // console.log(10);
            fs.mkdirSync(path);
            this.#createDayDir();
        } catch (error) {
            AppColorLog.warning("LocalLogs::ERROR createMonthDir");
            dialog.showMessageBox(null, { type: "error", message: "LocalLogs::ERROR createMonthDir", buttons: ["ok"] });
        }
    };

    #createDayDir = () => {
        const path = `${userLocalLogs}/${this.#date.getUTCFullYear()}/${
            parseInt(this.#date.getUTCMonth(), 10) + 1
        }/${parseInt(this.#date.getUTCDate(), 10)}`;
        try {
            // console.log(11);
            fs.mkdirSync(path);
            this.#createFile();
        } catch (error) {
            AppColorLog.warning("LocalLogs::ERROR createDayDir");
            dialog.showMessageBox(null, { type: "error", message: "LocalLogs::ERROR createDayDir", buttons: ["ok"] });
        }
    };

    #createFile = () => {
        const path = `${userLocalLogs}/${this.#date.getUTCFullYear()}/${
            parseInt(this.#date.getUTCMonth(), 10) + 1
        }/${parseInt(this.#date.getUTCDate(), 10)}/${this.#controller}${this.#extension}`;
        try {
            // console.log(12);
            fs.writeFileSync(path, "", { encoding: "utf8", flags: "a" });
            this.#writeToFile();
        } catch (error) {
            AppColorLog.warning(`LocalLogs::ERROR createFile ${error}`);
            dialog.showMessageBox(null, {
                type: "error",
                message: `LocalLogs::ERROR createFile${error}`,
                buttons: ["ok"],
            });
        }
    };

    #writeToFile = () => {
        const path = `${userLocalLogs}/${this.#date.getUTCFullYear()}/${
            parseInt(this.#date.getUTCMonth(), 10) + 1
        }/${parseInt(this.#date.getUTCDate(), 10)}/${this.#controller}${this.#extension}`;

        const hours = this.#date.getUTCHours() < 10 ? `0${this.#date.getUTCHours()}` : `${this.#date.getUTCHours()}`;
        const minutes =
            this.#date.getUTCMinutes() < 10 ? `0${this.#date.getUTCMinutes()}` : `${this.#date.getUTCMinutes()}`;
        const seconds =
            this.#date.getUTCSeconds() < 10 ? `0${this.#date.getUTCSeconds()}` : `${this.#date.getUTCSeconds()}`;
        const time = `${hours}:${minutes}:${seconds}`;

        const oneRow = `${time}::${this.#action}::${this.#msg}::${this.#json}\r\n`;

        let fileObj;
        try {
            // console.log(13);
            fileObj = fs.openSync(path, "a");
            fs.appendFileSync(fileObj, oneRow, "utf8");
        } catch (error) {
            // console.log(14);
            AppColorLog.warning(`LocalLogs::ERROR createFile ${error}`);
            dialog.showMessageBox(null, {
                type: "error",
                message: `LocalLogs::ERROR createFile${error}`,
                buttons: ["ok"],
            });
        } finally {
            // console.log(15);
            if (fileObj !== undefined) fs.closeSync(fileObj);
        }
    };

    add = (controller, action, msg, json) => {
        if (controller) {
            this.#controller = `${controller}`;
            this.#controller = this.#controller.toLocaleLowerCase();
        } else {
            AppColorLog.warning(`LocalLogs::ERROR first parameter(controller) is not found:  ${this.#getCallerFile()}`);
            return;
        }

        if (action) {
            this.#action = `${action}`;
            this.#action = this.#action.toLocaleLowerCase();
        } else {
            AppColorLog.warning(`LocalLogs::ERROR first parameter(action) is not found:  ${this.#getCallerFile()}`);
            return;
        }

        if (msg && Object.prototype.toString.call(msg) === "[object String]") {
            this.#msg = msg;
        } else {
            AppColorLog.warning(`LocalLogs::ERROR first parameter(msg) is not string:  ${this.#getCallerFile()}`);
            return;
        }

        if (json) {
            this.#json = JSON.stringify(json);
        } else {
            this.#json = JSON.stringify({});
        }

        this.#date = new Date();
        this.#checkFileExist();
    };

    getFullPath = () => {
        return `${userLocalLogs}/${this.#date.getUTCFullYear()}/${
            parseInt(this.#date.getUTCMonth(), 10) + 1
        }/${parseInt(this.#date.getUTCDate(), 10)}/${this.#controller}${this.#extension}`;
    };
}
module.exports = new LocalLogs();
