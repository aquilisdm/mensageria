const sql = require("mssql");

const sqlConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  server: process.env.DB_HOST,
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
  options: {
    encrypt: false, // for azure
    trustServerCertificate: false, // change to true for local dev / self-signed certs
  },
};

const database = {
  connect: async function () {
    try {
      // make sure that any items are correctly URL encoded in the connection string
      return sql.connect(sqlConfig);
    } catch (err) {
      console.log(err);
    }
  },
};

module.exports = database;
