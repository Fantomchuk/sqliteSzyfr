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
 * Służy do lokalnej bazy danych
 * @module DataBase
 * @memberof backendJS
 */
class DataBase {
    db = null;

    keyToDB = null;

    #dbName = "nameLocalDB";

    #keytarService = "_serviceNameInKeyChain";

    #keytarAccount = "_accountNameInKeyChain";

    #keytarKey = `${uuid()}-${uuid()}-${uuid()}-${uuid()}`;

    #flagEncrypted = false;

    #encryptionDb = async () => {
        return new Promise((resolve, reject) => {
            // serialize -> zabezpiecza wykonywanie wszyskich run-ów po kolei
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
    };

    connect = async () => {
        if (!this.keyToDB) await this.#getKeyForDB();

        return new Promise((resolve, reject) => {
            // AppColorLog.warning("+++++++++", this.#flagEncrypted);
            if (this.#flagEncrypted === "encrypted") {
                // AppColorLog.info("::1:: DB open and encrypted");
                resolve();
                return;
            }
            if (this.#flagEncrypted === "notEncrypted") {
                // AppColorLog.info("::2:: DB open and notEncrypted");
                reject(new Error("encrypted ERROR"));
                return;
            }

            // AppColorLog.success("--------------");
            if (this.db) {
                // AppColorLog.success("::3:: DB open, but NOT encrypted");
                setTimeout(() => {
                    this.connect()
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
    };

    disconnect = () => {
        if (this.db) this.db.close();
        this.db = null;
    };

    run = (command, params = []) => {
        return new Promise(async (resolve, reject) => {
            try {
                await this.connect();

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
                        // this -> kontekst dla db.run, potrzebujemy dla Aktualizacii i dla Usuwania rekordów
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
    };

    all = (command, params = []) => {
        return new Promise(async (resolve, reject) => {
            try {
                await this.connect();
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
    };

    #getKeyForDB = async () => {
        try {
            // zrobiono przez zmienną bo await, moze sie nadpisac nulem, a set pasword sie wywala jak szybko ustawiamy nowe haslo
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
    };

    testInsert = async () => {
        // try {
        //     await this.connect();
        //     this.db.serialize(() => {
        //         this.db.run("CREATE TABLE IF NOT EXISTS lorem (info TEXT)");
        //         var temp = Date.now();
        //         var stmt = this.db.prepare("INSERT INTO lorem VALUES (?)");
        //         for (var i = 0; i < 3; i++) {
        //             stmt.run("Ipsum " + temp+ "_"+ i);
        //         }
        //         stmt.finalize();
        //     });
        // }catch (error) {}
    };

    getAllRows = async () => {
        return new Promise(async (resolve, reject) => {
            try {
                await this.connect();

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
    };
}
module.exports = new DataBase();
