const MongoDB = require("../../logic/MongoDB");
const Logger = require("../../logic/Logger");
const { v4: uuidv4 } = require("uuid");

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
          Logger.error(err, "UserRepository.findUsers()");
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
          Logger.error(err, "UserRepository.findUsersByName()");
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
          Logger.error(err, "UserRepository.findUsersById()");
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
            id: uuidv4(),
            name: name,
            password: password,
            company: company,
            date: new Date().toLocaleString("pt-BR"),
          });

          client.close();
          resolve({ success: true });
        })
        .catch((err) => {
          Logger.error(err, "UserRepository.createUser()");
          resolve({ success: false, message: err });
        });
    });
  },
};

module.exports = UserRepository;
