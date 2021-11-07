const { Subject } = require("rxjs");
const DataBase = require("./DataBase");
const AppColorLog = require("./AppColorLog");
const LocalLogs = require("./LocalLogs");

/**
 * @class ModelDb
 * @classdesc Батьківській клас для всіх моделей бази даниих
 * @example
 * const DataBase = require("./backend/core/ModelDB");
 * class назваТабличкіКласс extends ModelDB
 */
class ModelDb {
    // для того щоб наслухувати всі зміни для елементів які вже побрані з бази
    $ = new Subject();

    // Створюємо структуру бази даних
    async init() {
        console.log("init");
        const initName = `CREATE TABLE IF NOT EXISTS ${this.tableName} ${this.#createSchema()}`;
        try {
            await DataBase.run(initName);
            this.#checkStructure();
        } catch (error) {
            AppColorLog.error(`modelDB:init table '${this.tableName}'`);
            LocalLogs.add("ModelDB", "init", `${this.tableName}`, {
                error: "modelDB:init table error",
            });
        }
    }

    // Hа основі структури обєкту моделі будуємо текст моделі бази даних
    #createSchema() {
        const out = [];
        for (const key in this.schema) {
            if (Object.prototype.hasOwnProperty.call(this.schema, key)) {
                let string = "";
                const element = this.schema[key];
                if (element.name) {
                    string += `${element.name} `;

                    if (element.type) {
                        string += `${element.type} `;
                    }

                    if (element.pk) {
                        string += `PRIMARY KEY `;
                        if (element.type.toUpperCase() === "INTEGER") {
                            string += ` AUTOINCREMENT `;
                        }
                    }

                    if (element.notnull) {
                        string += `NOT NULL `;
                    }

                    if (element.dflt_value !== null) {
                        string += `DEFAULT ${element.dflt_value} `;
                    }

                    out.push(string);
                }
            }
        }
        return `(${out.join(", ")})`;
    }

    // провіряємо останню версію бази і виконуємо оновлення структури і бази
    // як маємо нове поле в схемі, то до бази додаємо колонку з дефолтовим значенням
    // як видаляємо колонку, то видаляємо все з бази звязане з цією колонкою
    // відбувається одразу при першому підключенні класи. require("./backend/dbModels/назваТабличкіКласс");
    async #checkStructure() {
        let flagRebuildTable = false;
        try {
            const schemaInDB = await DataBase.all(`PRAGMA table_info (${this.tableName})`);
            const schemaInDBWithProperty = {};

            // провіряємо чи при переносі даних в попередньому старті додатку не вивалилося
            const statusOldTable = await DataBase.all(
                `SELECT name FROM sqlite_master WHERE type='table' AND name='TempOrigin_${this.tableName}';`
            );
            // якщо вивалилося то повертаємо стару структуру
            if (statusOldTable.length > 0) {
                await DataBase.run(`DROP TABLE ${this.tableName};`);
                await DataBase.run(`ALTER TABLE TempOrigin_${this.tableName} RENAME TO ${this.tableName};`);
            }

            // провіряємо чи колонка не була видалена
            for (const one in schemaInDB) {
                if (Object.prototype.hasOwnProperty.call(schemaInDB, one)) {
                    const tmpElement = schemaInDB[one];
                    // cid -> ID колонкі. Видаляємо бо в моделі цього не маємо
                    if (typeof tmpElement.cid !== "undefined") {
                        delete tmpElement.cid;
                    }

                    schemaInDBWithProperty[tmpElement.name] = tmpElement;
                    if (!Object.prototype.hasOwnProperty.call(this.schema, tmpElement.name)) {
                        flagRebuildTable = true;
                        break;
                    }
                }
            }

            // Провіряємо чи не була додана нова колонка, фбо не наступила якась зміна
            for (const one in this.schema) {
                if (Object.prototype.hasOwnProperty.call(this.schema, one)) {
                    const tmpElement = this.schema[one];

                    if (!Object.prototype.hasOwnProperty.call(schemaInDBWithProperty, tmpElement.name)) {
                        flagRebuildTable = true;
                        break;
                    } else {
                        const tmp1 = JSON.stringify(tmpElement);
                        const tmp2 = JSON.stringify(schemaInDBWithProperty[tmpElement.name]);

                        if (tmp1 !== tmp2) {
                            flagRebuildTable = true;
                            break;
                        }
                    }
                }
            }

            if (flagRebuildTable) {
                // змінюємо назву табличкі на TempOrigin_ + назва
                AppColorLog.warning(`change table schema: ${this.tableName}`);
                await DataBase.run(`ALTER TABLE ${this.tableName} RENAME TO TempOrigin_${this.tableName};`);

                // Створюємо наново нашу табличку
                const initName = `CREATE TABLE IF NOT EXISTS ${this.tableName} ${this.#createSchema()}`;
                await DataBase.run(initName);

                let flagError = false;
                const dropOld = () => {
                    if (!flagError) {
                        DataBase.run(`DROP TABLE TempOrigin_${this.tableName};`);
                    } else {
                        AppColorLog.error(`modelDB:checkStructure copy items '${this.tableName}'`);
                        LocalLogs.add("ModelDB", "checkStructure", `${this.tableName}`, {
                            error: "modelDB:checkStructure copy items",
                        });
                    }
                };

                // переносимо дані
                DataBase.db.each(
                    `SELECT * FROM TempOrigin_${this.tableName};`,
                    [],
                    (errorOne, oneObj) => {
                        if (errorOne) {
                            flagError = errorOne;
                        } else {
                            this.upsert(oneObj);
                        }
                    },
                    (errorAll, r) => {
                        if (errorAll) {
                            flagError = errorAll;
                        }
                        dropOld();
                    }
                );
            }
        } catch (error) {
            AppColorLog.error(`modelDB:checkStructure rebuild the table '${this.tableName}'`);
            LocalLogs.add("ModelDB", "checkStructure", `${this.tableName}`, {
                error: "modelDB:checkStructure rebuild the table",
            });
        }
    }

    /**
     * Додає або оновлює дані в базі даних
     * @async
     * @param {{}} obj Структура об'єкту залежить від структири схеми конкретної моделі бази даних
     * @example
     * const назваТабличкіКласс = require("./backend/dbModels/назваТабличкіКласс");
     * await назваТабличкіКласс.upsert({name: 'Nazar'});
     * await назваТабличкіКласс.upsert({name: 'Nazar2', id: 2});
     * @returns {Promise<object>} повертає об'єкт якій ми додали до бази даних
     * @throws {Error} поданий параметр до функції не є об'єктем
     * @throws {Error} в параметрах об'єкта не має унікального поля
     * @throws {Error} Помилка з рівня вище(з функцій бази даних)
     */
    async upsert(obj) {
        if (Object.prototype.toString.call(obj) !== "[object Object]") {
            AppColorLog.error(`modelDB:upsert '${this.tableName}': params(obj) is not object`);
            LocalLogs.add("ModelDB", "upsert", `${this.tableName}`, {
                error: "modelDB:upsert, params(obj) is not object",
            });
            throw new Error("modelDB:upsert, params(obj) is not object");
        }

        const paramsWhere = [];
        const valueWhere = [];

        const paramsSet = [];
        const valueSet = [];

        const paramsINSERT = [];
        const valueINSERT = [];
        const questionsINSERT = [];

        for (const one in this.schema) {
            if (Object.prototype.hasOwnProperty.call(this.schema, one)) {
                const oneElement = this.schema[one];
                const columnName = oneElement.name;

                if (typeof obj[columnName] !== "undefined") {
                    paramsINSERT.push(columnName);
                    valueINSERT.push(obj[columnName]);
                    questionsINSERT.push("?");

                    if (oneElement.pk) {
                        paramsWhere.push(`${columnName}=?`);
                        valueWhere.push(obj[columnName]);
                    } else {
                        paramsSet.push(`${columnName}=?`);
                        valueSet.push(obj[columnName]);
                    }
                }
            }
        }

        if (typeof obj.onlyInsert === "undefined" && paramsWhere.length === 0) {
            AppColorLog.error(`modelDB:upsert '${this.tableName}': obj not have UNIQUE fields`);
            LocalLogs.add("ModelDB", "upsert", `${this.tableName}`, {
                error: "modelDB:upsert obj not have UNIQUE fields",
            });
            throw new Error("modelDB:upsert obj not have UNIQUE fields");
        }

        try {
            const stringParamsINSERT = paramsINSERT.join(", ");
            const stringQuestionsINSERT = questionsINSERT.join(", ");
            const commandINSERT = `INSERT OR IGNORE INTO ${this.tableName} (${stringParamsINSERT}) VALUES(${stringQuestionsINSERT})`;
            await DataBase.run(commandINSERT, valueINSERT);
            if (typeof obj.onlyInsert === "undefined") {
                const strWhere = ` WHERE ${paramsWhere.join(", ")} `;
                const strSet = ` SET ${paramsSet.join(", ")} `;
                const valueUPDATE = valueSet.concat(valueWhere);
                const commandUPDATE = `UPDATE ${this.tableName} ${strSet} ${strWhere}`;
                await DataBase.run(commandUPDATE, valueUPDATE);
            }
            const upsertRow = {};
            paramsSet.forEach((param, index) => {
                const tmpName = param.split("=")[0];
                upsertRow[tmpName] = valueSet[index];
            });
            paramsWhere.forEach((param, index) => {
                const tmpName = param.split("=")[0];
                upsertRow[tmpName] = valueWhere[index];
            });
            this.$.next(upsertRow);

            return upsertRow;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Шукає всі записи з бази даних
     * @async
     * @param {object} obj - об'єкт до шукання.
     * @param {string} [obj.where] - умова пошуку
     * @param {Array} [obj.params] - параметри пошуку
     * @param {Array} [obj.groupBy] - параметри групування
     * @param {number} [obj.page] - сторінка для результата
     * @param {number} [obj.limit] - кількість результатів на сторінці
     * @param {{}} [obj.orderBy] - об'єкт для сортування {'назва поля': DESC|ASC}
     * @example
     * const назваТабличкіКласс = require("./backend/dbModels/назваТабличкіКласс");
     * await назваТабличкіКласс.find({limit: 10, page: 1, orderBy: { id: "DESC" }});
     * @returns {Promise<object>} повертає знайдені об'єкти з бази даних
     * @throws {Error} Помилка в структурі поданого об'єкту
     * @throws {Error} Помилка з рівня вище(з функцій бази даних)
     */
    async find(obj) {
        let errorText = "";
        if (Object.prototype.toString.call(obj) !== "[object Object]") {
            errorText = `modelDB:find '${this.tableName}': arg(obj) is not object`;
        } else if (obj.where && Object.prototype.toString.call(obj.where) !== "[object String]") {
            errorText = `modelDB:find '${this.tableName}': where not String`;
        } else if (obj.params && Object.prototype.toString.call(obj.params) !== "[object Array]") {
            errorText = `modelDB:find '${this.tableName}': obj.params not Array`;
        } else if (obj.groupBy && Object.prototype.toString.call(obj.groupBy) !== "[object Array]") {
            errorText = `modelDB:find '${this.tableName}': groupBy not Array`;
        } else if (obj.page && Object.prototype.toString.call(obj.page) !== "[object Number]") {
            errorText = `modelDB:find '${this.tableName}': page not Number`;
        } else if (obj.limit && Object.prototype.toString.call(obj.limit) !== "[object Number]") {
            errorText = `modelDB:find '${this.tableName}': limit not Number`;
        } else if (obj.orderBy && Object.prototype.toString.call(obj.orderBy) !== "[object Object]") {
            errorText = `modelDB:find '${this.tableName}': orderBy not Object`;
        } else if (typeof obj.where !== "undefined" && (obj.where.match(/\?/g) || []).length) {
            if (!obj.params || obj.params.length !== (obj.where.match(/\?/g) || []).length) {
                errorText = `modelDB:find '${this.tableName}': count '?' in where not eq. count params`;
            }
        }

        if (errorText) {
            AppColorLog.error(errorText);
            LocalLogs.add("ModelDB", "find", `${this.tableName}`, { errorText });
            throw new Error(errorText);
        }

        let paramsSearch = [];
        let paramsWhere = "";
        if (obj.params) paramsSearch = obj.params;
        if (obj.where) paramsWhere = ` WHERE ${obj.where} `;

        const paramsLimit = obj.limit ? parseInt(obj.limit, 10) : null;
        const paramsPage = obj.page ? parseInt(obj.page, 10) : null;

        let perPage = "";
        if (paramsPage && paramsLimit) {
            perPage = ` LIMIT ${obj.limit} OFFSET ${(paramsPage - 1) * paramsLimit}`;
        }

        const tmpListOrder = [];
        let orderBy = "";
        if (obj.orderBy) {
            for (const key in obj.orderBy) {
                if (Object.prototype.hasOwnProperty.call(obj.orderBy, key)) {
                    if (obj.orderBy[key].toUpperCase() === "DESC" || obj.orderBy[key].toUpperCase() === "ASC") {
                        tmpListOrder.push(`LOWER(${key}) ${obj.orderBy[key]}`);
                    }
                }
            }
            if (tmpListOrder.length) {
                orderBy = ` ORDER BY ${tmpListOrder.join(", ")}`;
            }
        }

        let groupBy = "";
        if (obj.groupBy && obj.groupBy.length) {
            groupBy = ` GROUP BY ${obj.groupBy.join(", ")}`;
        }

        try {
            const commandSELECT = `SELECT * FROM ${this.tableName} ${paramsWhere} ${groupBy} ${orderBy} ${perPage}`;
            const list = await DataBase.each(commandSELECT, paramsSearch);

            return list;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Видаляє дані з бази даних
     * @async
     * @param {object} obj об'єкт по якому будемо робити видалення
     * @param {string} [obj.where] - умова пошуку
     * @param {Array} [obj.params] - параметри пошуку
     * @param {boolean} [obj.delAll] - параметр для видалення всіх записів з табличкі бази даних
     * @example
     * const назваТабличкіКласс = require("./backend/dbModels/назваТабличкіКласс");
     * await назваТабличкіКласс.delete({delAll: 1});
     * @returns {boolean} поверне <i style='color: #FF0000;'>true</i> коли поправно виконається
     * @throws {Error} Помилка в структурі поданого об'єкту
     * @throws {Error} Помилка з рівня вище(з функцій бази даних)
     */
    async delete(obj) {
        let errorText = "";
        if (Object.prototype.toString.call(obj) !== "[object Object]") {
            errorText = `modelDB:delete '${this.tableName}': arg(obj) is not object`;
        } else if (obj.where && Object.prototype.toString.call(obj.where) !== "[object String]") {
            errorText = `modelDB:delete '${this.tableName}': where not String`;
        } else if (obj.params && Object.prototype.toString.call(obj.params) !== "[object Array]") {
            errorText = `modelDB:delete '${this.tableName}': obj.params not Array`;
        } else if (obj.where && (obj.where.match(/\?/g) || []).length) {
            if (!obj.params || obj.params.length !== (obj.where.match(/\?/g) || []).length) {
                errorText = `modelDB:delete '${this.tableName}': count '?' in where not eq. count params`;
            }
        } else if (typeof obj.where === "undefined" && typeof obj.delAll === "undefined") {
            errorText = `modelDB:delete '${this.tableName}': obj.delAll is not defined`;
        }

        if (errorText) {
            AppColorLog.error(errorText);
            LocalLogs.add("ModelDB", "delete", `${this.tableName}`, { errorText });
            throw new Error(errorText);
        }

        let paramsSearch = [];
        let paramsWhere = "";
        if (obj.params) paramsSearch = obj.params;
        if (obj.where) paramsWhere = ` WHERE ${obj.where} `;

        try {
            const commandDELETE = `DELETE FROM ${this.tableName} ${paramsWhere}`;
            const deletedStatus = await DataBase.run(commandDELETE, paramsSearch);

            if (deletedStatus.changes > 0) {
                this.$.next({ deletedFromDb: 1 });
            }

            return true;
        } catch (error) {
            throw error;
        }
    }
}
module.exports = ModelDb;

//! Для того щоб наслухувати зміни в побраних елементах, використовуємо
// ###############################################################
// const { debounceTime, map } = require("rxjs/operators");     #
// UsersDBModel.$.pipe(                                         #
//     map((oneRow) => {                                        #
//         console.log("map: oneRow => ", oneRow);              #
//     }),                                                      #
//     debounceTime(3000),                                      #
// ).subscribe(() => {                                          #
//     console.log("--------refresh list--------");             #
// });                                                          #
// ###############################################################

//! Приклад для транзакції, варто використати Database#exec
// ###############################################################
// await DataBase.run('BEGIN TRANSACTION');                     #
// try {                                                        #
//     await DataBase.run('BEGIN TRANSACTION');                 #
//                                                              #
//     await UsersDBModel.upsert({id: 16, name: '345678'});     #
//     await SettingDBModel.upsert({id: 17, name: 'test'});     #
//                                                              #
//     await DataBase.run('COMMIT TRANSACTION');                #
// } catch (error) {                                            #
//     AppColorLog.error(`ROLLBACK TRANSACTION`);               #
//     await DataBase.run('ROLLBACK TRANSACTION');              #
// }                                                            #
// ###############################################################
