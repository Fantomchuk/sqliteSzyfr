const { app, dialog } = require("electron");
const fs = require("fs");

const keytar = require("keytar");
const { v4: uuid } = require("uuid");

const sqlite3 = require("@journeyapps/sqlcipher").verbose();

const AppColorLog = require("./AppColorLog");
const LocalLogs = require("./LocalLogs");

const userLocalDB = `${app.getPath("userData")}/localDb`;
if (!fs.existsSync(`${userLocalDB}`)) fs.mkdirSync(`${userLocalDB}`);

/**
 * Створюється один екземпляр класу, на якому і проводимо всі операції.
 * Цей екземпляр експортуємо з цього файлу, і будемо його підключати в інших файлах.
 * @class DataBase
 * @classdesc Відповідає за локальну базу даних
 * @see https://github.com/mapbox/node-sqlite3/wiki/API
 * @example
 * const DataBase = require("./backend/core/DataBase");
 */
class DataBase {
    db = null;

    // Ключ яким зашифрована база даних
    keyToDB = null;
    // має бути #

    // Назва бази даних в папці файлів
    #dbName = "nameLocalDB";

    // Назва сервісу в бібліотеці keytar
    #keytarService = " ";

    // Назва акаунта в бібліотеці keytar
    #keytarAccount = "_accountNameInKeyChain";

    // Дефолтовий ключ для шифровання створений на основі uuid.
    #keytarKey = `${uuid()}-${uuid()}-${uuid()}-${uuid()}`;

    // Змінна яка нам вказує чи база даних в момент запуску додатку є розшифрована.
    #flagEncrypted = null;

    // Після того як відкриється зєднання з базою, розшифровує її
    async #encryptionDb() {
        return new Promise((resolve, reject) => {
            // serialize -> забезпечує виконання всіх run-ів по черзі
            this.db.serialize(() => {
                this.db.run(`PRAGMA cipher_compatibility = 4`, [], (errPragma) => {
                    if (errPragma) {
                        this.#flagEncrypted = "notEncrypted";
                        reject(errPragma);
                    }
                });

                this.db.run(`PRAGMA encoding = 'UTF-8'`, [], (errPragma) => {
                    if (errPragma) {
                        this.#flagEncrypted = "notEncrypted";
                        reject(errPragma);
                    }
                });

                this.db.run(`PRAGMA key = '${this.keyToDB}'`, [], (errPragma) => {
                    if (errPragma) {
                        this.#flagEncrypted = "notEncrypted";
                        reject(errPragma);
                    } else {
                        this.#flagEncrypted = "encrypted";
                        resolve();
                    }
                });
            });
        });
    }

    // Виконує підключення до локальної бази даних
    async #connect() {
        if (!this.keyToDB) await this.#getKeyForDB();

        return new Promise((resolve, reject) => {
            // як база розшиврована то далі можемо робити дії на базі
            if (this.#flagEncrypted === "encrypted") {
                resolve();
                return;
            }
            if (this.#flagEncrypted === "notEncrypted") {
                reject(new Error("encrypted ERROR"));
                return;
            }

            if (this.db) {
                setTimeout(() => {
                    this.#connect()
                        .then(() => {
                            resolve();
                        })
                        .catch((err) => {
                            reject(err);
                        });
                }, 500);
            } else {
                AppColorLog.info(`:::: start open DB   ${this.keyToDB}`);
                this.db = new sqlite3.Database(`${userLocalDB}/${this.#dbName}.sqlite`, (error) => {
                    if (error) {
                        AppColorLog.error(`error connected to db: ${JSON.stringify(error, null, 4)}`);
                        LocalLogs.add("DataBase", "connect", "error connection to db", error);
                        setTimeout(() => {
                            dialog
                                .showMessageBox(null, {
                                    type: "error",
                                    message: "ERROR CONNECTION TO LOCAL DB",
                                    buttons: ["ok"],
                                })
                                .then(() => app.quit());
                        }, 1000);
                    } else {
                        // розшифровуємо базу
                        this.#encryptionDb()
                            .then(() => {
                                resolve();
                            })
                            .catch((err) => {
                                reject(err);
                            });
                    }
                });
            }
        });
    }

    // Отримуємо ключ до розшифрування локальної бази даних
    async #getKeyForDB() {
        try {
            const keyFromKeytar = await keytar.getPassword(this.#keytarService, this.#keytarAccount);
            if (!keyFromKeytar) {
                if (!this.keyToDB) {
                    this.keyToDB = this.#keytarKey;
                    await keytar.setPassword(this.#keytarService, this.#keytarAccount, this.#keytarKey);
                }
            } else {
                this.keyToDB = keyFromKeytar;
            }

            return true;
        } catch (error) {
            AppColorLog.error(`error connected to keytar: ${JSON.stringify(error, null, 4)}`);
            setTimeout(() => {
                dialog
                    .showMessageBox(null, { type: "error", message: "ERROR Library 'keytar' ", buttons: ["ok"] })
                    .then(() => app.quit());
            }, 1000);
            return false;
        }
    }

    // Виконує закриття локальної бази
    disconnect() {
        if (this.db) this.db.close();
        this.db = null;
    }

    /**
     * Використовуємо поданий SQL запит, не повертає в більшості випадків жодного результату
     * @async
     * @param {string} command SQL запит
     * @param {Array} params Параметри до SQL запиту
     * @returns {Promise<object>}
     * @example
     * const DataBase = require("./backend/core/DataBase");
     * await DataBase.run('UPDATE users SET name=? WHERE id=?', ['Nazar', 2]);
     *
     */
    async run(command, params = []) {
        return new Promise(async (resolve, reject) => {
            try {
                await this.#connect();

                // AppColorLog.success(`${this.db}   ${command}   ${params}`);
                this.db.run(command, params, function (errorRun) {
                    if (errorRun) {
                        const errOut = { ...errorRun };
                        errOut.command = command;
                        errOut.params = params;
                        AppColorLog.error(`error run db 1: ${JSON.stringify(errOut, null, 4)}`);
                        LocalLogs.add("DataBase", "run", "error 1 run command", errOut);
                        reject(errOut);
                    } else {
                        // this -> контент для db.run, це потребуємо для актуалізації і видалення рекордів
                        const out = {};
                        if (this.lastID) out.lastID = this.lastID;
                        if (this.changes) out.changes = this.changes;
                        resolve(out);
                    }
                });
            } catch (error) {
                error.command = command;
                error.params = params;
                AppColorLog.error(`error run db 2: ${JSON.stringify(error, null, 4)}`);
                LocalLogs.add("DataBase", "run", "error 2 run command", error);
                reject(error);
            }
        });
    }

    /**
     * Використовуємо для побрання невеликих кількостей рекордів(даних). Всі рекорди побераються і тримаються в памяті
     * @async
     * @param {string} command SQL запит
     * @param {Array} params Параметри до SQL запиту
     * @returns {Promise<object>}
     * @example
     * const DataBase = require("./backend/core/DataBase");
     * await DataBase.all('SELECT * FROM users WHERE name=?', ['Nazar]);
     */
    async all(command, params = []) {
        return new Promise(async (resolve, reject) => {
            try {
                await this.#connect();
                this.db.all(command, params, (errorAll, list) => {
                    if (errorAll) {
                        const errOut = { ...errorAll };
                        errOut.command = command;
                        errOut.params = params;
                        AppColorLog.error(`error all db 1: ${JSON.stringify(errOut, null, 4)}`);
                        LocalLogs.add("DataBase", "all", "error 1 all command", errOut);
                        reject(errOut);
                    } else {
                        resolve(list);
                    }
                });
            } catch (error) {
                error.command = command;
                error.params = params;
                AppColorLog.error(`error all db 2: ${JSON.stringify(error, null, 4)}`);
                LocalLogs.add("DataBase", "all", "error 2 all command", error);
                reject(error);
            }
        });
    }

    /**
     * Використовуємо для побрання великої кількості даних
     * @async
     * @param {string} command SQL запит
     * @param {Array} params Параметри до SQL запиту
     * @returns {Promise<object>}
     * @example
     * const DataBase = require("./backend/core/DataBase");
     * await DataBase.each('SELECT * FROM USERS', []);
     */
    async each(command, params = []) {
        return new Promise(async (resolve, reject) => {
            try {
                const outList = [];
                await this.#connect();
                this.db.each(
                    command,
                    params,
                    (errorOne, oneObj) => {
                        if (errorOne) {
                            const errOut = { ...errorOne };
                            errOut.command = command;
                            errOut.params = params;
                            AppColorLog.error(`error each db 1: ${JSON.stringify(errOut, null, 4)}`);
                            LocalLogs.add("DataBase", "each", "error 1 each command", errOut);
                        } else {
                            outList.push(oneObj);
                        }
                    },
                    (errorAll, r) => {
                        if (errorAll) {
                            const errOut = { ...errorAll };
                            errOut.command = command;
                            errOut.params = params;
                            AppColorLog.error(`error each db 2: ${JSON.stringify(errOut, null, 4)}`);
                            LocalLogs.add("DataBase", "each", "error 2 each command", errOut);
                            reject(errOut);
                        } else {
                            resolve(outList);
                        }
                    }
                );
            } catch (error) {
                error.command = command;
                error.params = params;
                AppColorLog.error(`error each db 3: ${JSON.stringify(error, null, 4)}`);
                LocalLogs.add("DataBase", "each", "error 3 each command", error);
                reject(error);
            }
        });
    }

    /**
     * Повертає всі записи з бази даних для табличкі 'Users'
     * Дана функція прикладова, для отримання всіх записів якої небудь табличкі варто скористатися з класи яка називається так само як табличка в базі
     * @example
     * const list = await DataBase.getAllRows();
     *
     * @async
     * @returns {Promise<object>}
     */
    async getAllRows() {
        return new Promise(async (resolve, reject) => {
            try {
                await this.#connect();

                const list = {};
                this.db.serialize(() => {
                    // rowid -> AUTOINCREMENT
                    this.db.each(
                        "SELECT rowid AS id_Q, * FROM users",
                        (err, row) => {
                            if (row.id_Q) list[row.id_Q] = row;
                        },
                        () => {
                            resolve(list);
                        }
                    );
                });
            } catch (error) {
                reject(error);
            }
        });
    }
}
module.exports = new DataBase();
