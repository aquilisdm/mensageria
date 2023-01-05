const uuid = require("uuid");
const MongoDB = require("../../logic/MongoDB");

const CompanyRepository = {
  getCompanyById: function (id) {
    return new Promise((resolve, reject) => {
      MongoDB.getDatabase()
        .then(async (client) => {
          const database = client.db(MongoDB.dbName);
          const collection = database.collection("companies");
          const findResult = await collection.find({ id: id }).toArray();

          client.close();
          resolve(findResult);
        })
        .catch((err) => {
          reject(err);
        });
    });
  },
  getCompanies: function () {
    return new Promise((resolve, reject) => {
      MongoDB.getDatabase()
        .then(async (client) => {
          const database = client.db(MongoDB.dbName);
          const collection = database.collection("companies");
          const findResult = await collection.find({}).toArray();

          client.close();
          resolve(findResult);
        })
        .catch((err) => {
          reject(err);
        });
    });
  },
  createCompany: function (name) {
    return new Promise((resolve, reject) => {
      let id = uuid.v1();

      MongoDB.getDatabase()
        .then(async (client) => {
          const database = client.db(MongoDB.dbName);
          const collection = database.collection("companies");
          const findResult = await collection.find({ name: name }).toArray();

          if (findResult !== null && findResult.length <= 0) {
            await collection.insertOne({ id: id, name: name });
            resolve({ success: true });
          } else {
            resolve({
              success: false,
              message: "This company name is already taken",
            });
          }

          client.close();
          resolve({ success: true });
        })
        .catch((error) => {
          resolve({ success: false, message: err });
        });
    });
  },
};

module.exports = CompanyRepository;
