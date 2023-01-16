const MongoDB = require("./MongoDB");

const Logger = {
  message: function (message, status) {
    return new Promise(async (resolve, reject) => {
      MongoDB.getDatabase()
        .then(async (client) => {
          const database = client.db(MongoDB.dbName);
          const collection = database.collection("message_logs");

          await collection.insertOne({
            level: "message",
            clientId: message.clientId,
            message: message.message,
            number: message.number,
            ip: message.ip,
            status: status,
            date: new Date().toISOString(),
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
            date: new Date().toISOString(),
            additionalDetails: additionalDetails !== undefined ? additionalDetails : {},
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
            date: new Date().toISOString(),
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
