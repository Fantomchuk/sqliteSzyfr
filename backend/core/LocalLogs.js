const { app, dialog } = require("electron");
const fs = require("fs");

const AppColorLog = require("./AppColorLog");

const userLocalLogs = `${app.getPath("userData")}/localLogs`;
if (!fs.existsSync(`${userLocalLogs}`)) fs.mkdirSync(`${userLocalLogs}`);

/**
 * Створюється один екземпляр класу, на якому і проводимо всі операції.
 * Цей екземпляр експортуємо з цього файлу, і будемо його підключати в інших файлах.
 * @class LocalLogs
 * @classdesc Відповідає за додання і створення локальних файлів з комунікатами логів
 * @example
 * const LocalLogs = require("./backend/core/LocalLogs");
 */
class LocalLogs {
    // розширення файла до якого будемо записувати
    #extension = ".log";

    // назва контроллера
    #controller = null;

    // назва акції
    #action = null;

    // текст який записуємо до лога
    #msg = null;

    // додаткова інформація до логу
    #json = null;

    // дата додання лога, потрібна для створення файлу
    #date = null;

    // функція яка поверне нам файл, лінійку і позицію де було викликано функцію add() з помилкою
    static #getCallerFile() {
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
    }

    // Провіряє чи істує файл з сьогоднішньою датою
    #checkFileExist() {
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
    }

    // Провіряє чи істує папка з днем
    #checkDayDir() {
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
    }

    // Провіряє чи істує папка місяця
    #checkMonthDir() {
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
    }

    // Провіряє чи істує папка року
    #checkYearDir() {
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
    }

    // Створює папку року
    #createYearDir() {
        const path = `${userLocalLogs}/${this.#date.getUTCFullYear()}`;
        try {
            // console.log(9);
            fs.mkdirSync(path);
            this.#createMonthDir();
        } catch (error) {
            AppColorLog.warning("LocalLogs::ERROR createYearDir");
            dialog.showMessageBox(null, { type: "error", message: "LocalLogs::ERROR createYearDir", buttons: ["ok"] });
        }
    }

    // Створює папку місяця
    #createMonthDir() {
        const path = `${userLocalLogs}/${this.#date.getUTCFullYear()}/${parseInt(this.#date.getUTCMonth(), 10) + 1}`;
        try {
            // console.log(10);
            fs.mkdirSync(path);
            this.#createDayDir();
        } catch (error) {
            AppColorLog.warning("LocalLogs::ERROR createMonthDir");
            dialog.showMessageBox(null, { type: "error", message: "LocalLogs::ERROR createMonthDir", buttons: ["ok"] });
        }
    }

    // Створює папку дня
    #createDayDir() {
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
    }

    // Створює файл
    #createFile() {
        const path = `${userLocalLogs}/${this.#date.getUTCFullYear()}/${
            parseInt(this.#date.getUTCMonth(), 10) + 1
        }/${parseInt(this.#date.getUTCDate(), 10)}/${this.#controller}${this.#extension}`;
        try {
            // console.log(12);
            // (V1) s.writeFileSync(path, "", { encoding: "utf8", flags: "a" });
            this.#writeToFile();
        } catch (error) {
            AppColorLog.warning(`LocalLogs::ERROR createFile ${error}`);
            dialog.showMessageBox(null, {
                type: "error",
                message: `LocalLogs::ERROR createFile${error}`,
                buttons: ["ok"],
            });
        }
    }

    // Записує до файла лог
    #writeToFile() {
        const path = `${userLocalLogs}/${this.#date.getUTCFullYear()}/${
            parseInt(this.#date.getUTCMonth(), 10) + 1
        }/${parseInt(this.#date.getUTCDate(), 10)}/${this.#controller}${this.#extension}`;

        const dataForTime = new Date();
        const hours = dataForTime.getUTCHours() < 10 ? `0${dataForTime.getUTCHours()}` : `${dataForTime.getUTCHours()}`;
        const minutes =
            dataForTime.getUTCMinutes() < 10 ? `0${dataForTime.getUTCMinutes()}` : `${dataForTime.getUTCMinutes()}`;
        const seconds =
            dataForTime.getUTCSeconds() < 10 ? `0${dataForTime.getUTCSeconds()}` : `${dataForTime.getUTCSeconds()}`;
        const time = `${hours}:${minutes}:${seconds}`;

        const oneRow = `${time}::${this.#action}::${this.#msg}::${this.#json}\r\n`;

        let fileObj;
        try {
            // console.log(13); не варто ьтак користатися, бо вчитуємо цілий файл
            // (V1) fileObj = fs.openSync(path, "a");
            // (V1) fs.appendFileSync(fileObj, oneRow, "utf8");
            fs.appendFileSync(path, oneRow);
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
    }

    /**
     * Створення і додання до файлу нового логу
     * @param {string} controller назва контроллера або модуля в якому викликана функція
     * @param {string} action назва акції яку виконуємо
     * @param {string} msg повідомлення яке хочемо записати
     * @param {object|string|number} [json] додаткові параметри до повідомлення
     * @return {undefined} не повертає нічого
     * @example
     * const LocalLogs = require("./backend/core/LocalLogs");
     * LocalLogs.add("MAIN", "UsersDBModel", "delete-user", {id: 1});
     */
    add(controller, action, msg, json) {
        if (controller) {
            this.#controller = `${controller}`;
            this.#controller = this.#controller.toLocaleLowerCase();
        } else {
            AppColorLog.warning(
                `LocalLogs::ERROR first parameter(controller) is not found:  ${LocalLogs.#getCallerFile()}`
            );
            return;
        }

        if (action) {
            this.#action = `${action}`;
            this.#action = this.#action.toLocaleLowerCase();
        } else {
            AppColorLog.warning(
                `LocalLogs::ERROR first parameter(action) is not found:  ${LocalLogs.#getCallerFile()}`
            );
            return;
        }

        if (msg && Object.prototype.toString.call(msg) === "[object String]") {
            this.#msg = msg;
        } else {
            AppColorLog.warning(`LocalLogs::ERROR first parameter(msg) is not string:  ${LocalLogs.#getCallerFile()}`);
            return;
        }

        if (json) {
            this.#json = JSON.stringify(json);
        } else {
            this.#json = JSON.stringify({});
        }

        this.#date = new Date();
        this.#checkFileExist();
    }

    /**
     * Повертає лінк до свореного файлу
     * @returns {string} лінк до файлу
     * @example
     * const LocalLogs = require("./backend/core/LocalLogs");
     * const pathLocalFiles = LocalLogs.getFullPath();
     * => "/Users/nazar/Library/Application Support/sqliteSzyfr/localLogs/2021/11/4/main.log"
     */
    getFullPath() {
        return `${userLocalLogs}/${this.#date.getUTCFullYear()}/${
            parseInt(this.#date.getUTCMonth(), 10) + 1
        }/${parseInt(this.#date.getUTCDate(), 10)}/${this.#controller}${this.#extension}`;
    }
}
module.exports = new LocalLogs();
