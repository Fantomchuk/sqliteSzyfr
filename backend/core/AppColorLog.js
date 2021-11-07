// Module allows for colored console input in developement
const instructions = {
    Reset: "\x1b[0m",

    Bright: "\x1b[1m",
    Dim: "\x1b[2m",
    Underscore: "\x1b[4m",
    Blink: "\x1b[5m",
    Reverse: "\x1b[7m",
    Hidden: "\x1b[8m",

    FgBlack: "\x1b[30m",
    FgRed: "\x1b[31m",
    FgGreen: "\x1b[32m",
    FgYellow: "\x1b[33m",
    FgBlue: "\x1b[34m",
    FgMagenta: "\x1b[35m",
    FgCyan: "\x1b[36m",
    FgWhite: "\x1b[37m",

    BgBlack: "\x1b[40m",
    BgRed: "\x1b[41m",
    BgGreen: "\x1b[42m",
    BgYellow: "\x1b[43m",
    BgBlue: "\x1b[44m",
    BgMagenta: "\x1b[45m",
    BgCyan: "\x1b[46m",
    BgWhite: "\x1b[47m",
};
/**
 * Даний модуль служить до кольоровання логів які друкуємо в консолі на стороні сервера
 * @module AppColorLog
 */
module.exports = {
    /**
     * Виведе в консоль білий текст на червоному фоні
     * @param {string|number} msg повідомлення яке хочемо надрукувати
     * @example
     * const AppColorLog = require("./backend/core/AppColorLog");
     * AppColorLog.error("test");
     */
    error(msg) {
        console.log(`${instructions.BgRed}${msg}${instructions.Reset}`);
    },

    /**
     * Виведе в консоль чорний текст на синьому фоні
     * @param {string|number} msg повідомлення яке хочемо надрукувати
     * @example
     * const AppColorLog = require("./backend/core/AppColorLog");
     * AppColorLog.info("test");
     */
    info(msg) {
        console.log(`${instructions.BgCyan}${instructions.FgBlack}${msg}${instructions.Reset}`);
    },

    /**
     * Виведе в консоль чорний текст на зеленому фоні
     * @param {string|number} msg повідомлення яке хочемо надрукувати
     * @example
     * const AppColorLog = require("./backend/core/AppColorLog");
     * AppColorLog.success("test");
     */
    success(msg) {
        console.log(`${instructions.BgGreen}${instructions.FgBlack}${msg}${instructions.Reset}`);
    },

    /**
     * Виведе в консоль чорний текст на жовтому фоні
     * @param {string|number} msg повідомлення яке хочемо надрукувати
     * @example
     * const AppColorLog = require("./backend/core/AppColorLog");
     * AppColorLog.warning("test");
     */
    warning(msg) {
        console.log(`${instructions.BgYellow}${instructions.FgBlack}${msg}${instructions.Reset}`);
    },
};
