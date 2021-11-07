const ModelDB = require("../core/ModelDB");

/**
 * Створюється один екземпляр класу, на якому і проводимо всі операції.
 * Цей екземпляр експортуємо з цього файлу, і будемо його підключати в інших файлах.
 * @class Settings
 * @augments ModelDB
 * @see <a href="ModelDB.html" style='color: red;'>ModelDB</a>
 * @classdesc В даній таблиці зберігаємо якісь додаткові налаштування ташого користувача
 * @example
 * const SettingsDBModel = require("./backend/dbModels/Settings");
 * await SettingsDBModel.delete({delAll: 1});
 */
class Settings extends ModelDB {
    /**
     * @type {string} Назва таблиці в локальній базі даних
     * @default "settings"
     */
    tableName = "settings";

    constructor() {
        super();
        this.init();
    }

    /**
     * Структура схеми в базі даних
     * @property {string} key ключ <i style='color: #FF0000;'>унікальний</i>
     * @property {string} value значення
     * @example
     * {
     *      key: "kkk",
     *      value: "1234"
     * }
     */
    schema = {
        key: {
            name: "key",
            type: "TEXT",
            notnull: 0,
            dflt_value: null,
            pk: 1,
        },
        value: {
            name: "value",
            type: "TEXT",
            notnull: 0,
            dflt_value: null,
            pk: 0,
        },
    };
}
module.exports = new Settings();
