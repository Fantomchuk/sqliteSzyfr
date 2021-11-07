const ModelDB = require("../core/ModelDB");

class Example extends ModelDB {
    tableName = "example";

    constructor() {
        super();
        this.init();
    }

    // name          -> nazwa kolumny
    // type          -> typ danych( NULL, INTEGER, REAL, TEXT, BLOB )
    // notnull       -> 1: NOT NULL, 0: null
    // dflt_value    -> znaczenia z defoultu
    // pk            -> PRIMARY KEY
    // https://www.sqlite.org/datatype3.html

    // nie nazywać pola ['rowid', 'cid']
    schema = {
        cid: {
            name: "cid",
            type: "INTEGER",
            notnull: 1,
            dflt_value: 0,
            pk: 0,
        },
    };
}
module.exports = new Example();
