var LocalStorage = require("node-localstorage").LocalStorage;
let localStorage = new LocalStorage("./storage");
const MongoDB = require("../../logic/MongoDB");
const WinstonLogger = require("../../winston_logger");
WinstonLogger.init();

const UserRepository = {
  findUsers: function () {
    return new Promise(async (resolve, reject) => {
      MongoDB.getDatabase()
        .then(async (client) => {
          const database = client.db(MongoDB.dbName);
          const collection = database.collection("users");
          const findResult = await collection.find({}).toArray();

          client.close();
          resolve(findResult);
        })
        .catch((err) => {
          WinstonLogger.logger.log("error", {
            level: "error",
            message: err,
            date: new Date().toUTCString(),
            location: "UserRepository.findUsers()",
          });
          reject(err);
        });
    });
  },
  findUsersByName: function (name) {
    return new Promise(async (resolve, reject) => {
      MongoDB.getDatabase()
        .then(async (client) => {
          const database = client.db(MongoDB.dbName);
          const collection = database.collection("users");
          const findResult = await collection.find({ name: name }).toArray();

          client.close();
          resolve(findResult);
        })
        .catch((err) => {
          WinstonLogger.logger.log("error", {
            level: "error",
            message: err,
            date: new Date().toUTCString(),
            location: "UserRepository.findUsersByName()",
          });
          reject(err);
        });
    });
  },
  findUsersById: function (id) {
    return new Promise(async (resolve, reject) => {
      MongoDB.getDatabase()
        .then(async (client) => {
          const database = client.db(MongoDB.dbName);
          const collection = database.collection("users");
          const findResult = await collection.find({ id: id }).toArray();

          client.close();
          resolve(findResult);
        })
        .catch((err) => {
          WinstonLogger.logger.log("error", {
            level: "error",
            message: err,
            date: new Date().toUTCString(),
            location: "UserRepository.findUsersByName()",
          });
          reject(err);
        });
    });
  },
  createUser: function (name, password, company) {
    return new Promise(async (resolve, reject) => {
      MongoDB.getDatabase()
        .then(async (client) => {
          const database = client.db(MongoDB.dbName);
          const collection = database.collection("users");
          
          await collection.insertOne({
            id: new Date().getTime(),
            name: name,
            password: password,
            company: company,
            date: new Date().toLocaleString("pt-BR"),
          });

          client.close();
          resolve({ success: true });
        })
        .catch((err) => {
          WinstonLogger.logger.log("error", {
            level: "error",
            message: err,
            date: new Date().toUTCString(),
            location: "UserRepository.createUser()",
          });
          resolve({ success: false, message: err });
        });
    });
  },
};

module.exports = UserRepository;
