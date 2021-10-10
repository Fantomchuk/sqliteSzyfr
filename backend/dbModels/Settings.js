const ModelDB = require("../core/ModelDB");

class Settings extends ModelDB {
    tableName = "settings";

    constructor() {
        super();
        this.init();
    }

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
