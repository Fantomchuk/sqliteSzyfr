const { Subject } = require("rxjs");
const DataBase = require("./DataBase");
const AppColorLog = require("./AppColorLog");
const LocalLogs = require("./LocalLogs");

class ModelDb {
    $ = new Subject();

    init = async () => {
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
    };

    /**
     * Na podstawie pliku modeli, budujemy string struktury bazy danych
     *
     */
    #createSchema = () => {
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
    };

    /**
     * Sprawdzamy ostatnia wersje, i apdejtujemy bazę,
     * jak mamy nowe pole w schemie, to defoltowo dodajemy to pole do bazy,
     * jak wycofujemy pole z schemy, to usuwamy z bazy
     */
    #checkStructure = async () => {
        let flagRebuildTable = false;
        const command = `PRAGMA table_info (${this.tableName})`;

        try {
            const schemaInDB = await DataBase.all(command);
            const schemaInDBWithProperty = {};

            // sprawdzamy czy kolumna nie została usunięta
            for (const one in schemaInDB) {
                if (Object.prototype.hasOwnProperty.call(schemaInDB, one)) {
                    const tmpElement = schemaInDB[one];
                    // cid -> ID kolumny. Usuwamy, bo w modelu tego nie mamy
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

            // sprawdzamy czy nie została dodana nowa kolumna, lub zmiana
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
                AppColorLog.warning(`change table schema: ${this.tableName}`);
                const allRows = await DataBase.all(`SELECT * FROM ${this.tableName}`);
                await DataBase.run(`ALTER TABLE ${this.tableName} RENAME TO TempOld_${this.tableName};`);

                const initName = `CREATE TABLE IF NOT EXISTS ${this.tableName} ${this.#createSchema()}`;
                await DataBase.run(initName);

                for (const one in allRows) {
                    if (Object.prototype.hasOwnProperty.call(allRows, one)) {
                        const oneRow = allRows[one];
                        this.upsert(oneRow);
                    }
                }

                DataBase.run(`DROP TABLE TempOld_${this.tableName};`);
            }
        } catch (error) {
            AppColorLog.error(`modelDB:checkStructure rebuild the table '${this.tableName}'`);
            LocalLogs.add("ModelDB", "checkStructure", `${this.tableName}`, {
                error: "modelDB:checkStructure rebuild the table",
            });
        }
    };

    upsert = async (obj) => {
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
    };

    find = async (obj) => {
        let errorText = "";
        if (Object.prototype.toString.call(obj) !== "[object Object]") {
            errorText = `modelDB:find '${this.tableName}': arg(obj) is not object`;
        } else if (
            typeof obj.where !== "undefined" &&
            Object.prototype.toString.call(obj.where) !== "[object String]"
        ) {
            errorText = `modelDB:find '${this.tableName}': where not String`;
        } else if (obj.params && Object.prototype.toString.call(obj.params) !== "[object Array]") {
            errorText = `modelDB:find '${this.tableName}': obj.params not Array`;
        } else if (obj.groupBy && Object.prototype.toString.call(obj.groupBy) !== "[object Array]") {
            errorText = `modelDB:find '${this.tableName}': groupBy not Array`;
        } else if (typeof obj.page !== "undefined" && Object.prototype.toString.call(obj.page) !== "[object Number]") {
            errorText = `modelDB:find '${this.tableName}': page not Number`;
        } else if (
            typeof obj.limit !== "undefined" &&
            Object.prototype.toString.call(obj.limit) !== "[object Number]"
        ) {
            errorText = `modelDB:find '${this.tableName}': limit not Number`;
        } else if (
            typeof obj.orderBy !== "undefined" &&
            Object.prototype.toString.call(obj.orderBy) !== "[object Object]"
        ) {
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
            const list = await DataBase.all(commandSELECT, paramsSearch);

            return list;
        } catch (error) {
            throw error;
        }
    };

    delete = async (obj) => {
        let errorText = "";
        if (Object.prototype.toString.call(obj) !== "[object Object]") {
            errorText = `modelDB:delete '${this.tableName}': arg(obj) is not object`;
        } else if (
            typeof obj.where !== "undefined" &&
            Object.prototype.toString.call(obj.where) !== "[object String]"
        ) {
            errorText = `modelDB:delete '${this.tableName}': where not String`;
        } else if (obj.params && Object.prototype.toString.call(obj.params) !== "[object Array]") {
            errorText = `modelDB:delete '${this.tableName}': obj.params not Array`;
        } else if (typeof obj.where !== "undefined" && (obj.where.match(/\?/g) || []).length) {
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
    };
}
module.exports = ModelDb;

//! nasłuchiwania zmian w tabeli
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

//! przykład użycia transakcji
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
