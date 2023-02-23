const MongoDB = require("./MongoDB");
const Utils = require("./Utils");

const Logger = {
  error: function (err, location, additionalDetails) {
    return new Promise(async (resolve, reject) => {
      MongoDB.getDatabase()
        .then(async (client) => {
          const database = client.db(MongoDB.dbName);
          const collection = database.collection("logs");

          await collection.insertOne({
            level: "error",
            message: err,
            endpoint: location,
            date: Utils.convertTZ(new Date(), "America/Sao_Paulo").toString(),
            additionalDetails:
              additionalDetails !== undefined ? additionalDetails : {},
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
  info: function (info, location, additionalDetails) {
    return new Promise(async (resolve, reject) => {
      MongoDB.getDatabase()
        .then(async (client) => {
          const database = client.db(MongoDB.dbName);
          const collection = database.collection("logs");

          await collection.insertOne({
            level: "info",
            message: info,
            endpoint: location,
            date: Utils.convertTZ(new Date(), "America/Sao_Paulo").toString(),
            additionalDetails:
              additionalDetails !== undefined ? additionalDetails : {},
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
