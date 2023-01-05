const MongoDB = require("./MongoDB");

const Logger = {
  error: function (err, location) {
    return new Promise(async (resolve, reject) => {
      MongoDB.getDatabase()
        .then(async (client) => {
          const database = client.db(MongoDB.dbName);
          const collection = database.collection("logs");

          await collection.insertOne({
            level: "error",
            message: err,
            endpoint: location,
            date: new Date().toUTCString(),
          });

          client.close();
          resolve(true);
        })
        .catch((err) => {
          console.log(err);
          resolve(false);
        });
    });
  },
  info: function (info,location) {
    return new Promise(async (resolve, reject) => {
      MongoDB.getDatabase()
        .then(async (client) => {
          const database = client.db(MongoDB.dbName);
          const collection = database.collection("logs");

          await collection.insertOne({
            level: "info",
            message: info,
            endpoint: location,
            date: new Date().toUTCString(),
          });

          client.close();
          resolve(true);
        })
        .catch((err) => {
          console.log(err);
          resolve(false);
        });
    });
  },
};

module.exports = Logger;
