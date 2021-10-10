const ModelDB = require("../core/ModelDB");

class Users extends ModelDB {
    tableName = "users";

    constructor() {
        super();
        this.init();
    }

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
