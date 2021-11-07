const ModelDB = require("../core/ModelDB");

/**
 * Створюється один екземпляр класу, на якому і проводимо всі операції.
 * Цей екземпляр експортуємо з цього файлу, і будемо його підключати в інших файлах.
 * @class Users
 * @augments ModelDB
 * @see <a href="ModelDB.html" style='color: red;'>ModelDB</a>
 * @classdesc в даній табличці будемо зберігати інформацію про наших користувачів
 * @example
 * const UsersDBModel = require("./backend/dbModels/Settings");
 * await UsersDBModel.delete({delAll: 1});
 */
class Users extends ModelDB {
    /**
     * @type {string} Назва таблиці в локальній базі даних
     * @default "users"
     */
    tableName = "users";

    constructor() {
        super();
        this.init();
    }

    /**
     * Структура схеми в базі даних
     * @property {number} id порядковий номер <i style='color: #FF0000;'>унікальний</i>
     * @property {string} name імя користувача
     * @property {string} last_name прізвища користувача
     * @property {string} birth_day дата народження <i style='color: #FF0000;'>new Date().toISOString()</i>
     * @example
     * {
     *      id: 1,
     *      name: "Nazar",
     *      last_name: new Date().toISOString(),
     *      birth_day: "1991-09-19T00:00:00.000Z"
     * }
     */
    schema = {
        id: {
            name: "id",
            type: "INTEGER",
            notnull: 0,
            dflt_value: null,
            pk: 1,
        },
        name: {
            name: "name",
            type: "TEXT",
            notnull: 1,
            dflt_value: "''",
            pk: 0,
        },
        last_name: {
            name: "last_name",
            type: "TEXT",
            notnull: 1,
            dflt_value: "''",
            pk: 0,
        },
        // new Date().toISOString();
        birth_day: {
            name: "birth_day",
            type: "TEXT",
            notnull: 1,
            dflt_value: "''",
            pk: 0,
        },
    };
}
module.exports = new Users();
