const uuid = require("uuid");
const MongoDB = require("../../logic/MongoDB");

const CompanyRepository = {

  getCompanyById: function(id) {
    return new Promise((resolve, reject) => {
      MongoDB.getDatabase()
        .then(async (client) => {
          const database = client.db(MongoDB.dbName);
          const collection = database.collection("companies");
          const findResult = await collection.find({id:id}).toArray();

          client.close();
          resolve(findResult);
        })
        .catch((err) => {
          if (error instanceof MongoServerError) {
            console.log(`Error worth logging: ${error}`);
          }
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
          if (error instanceof MongoServerError) {
            console.log(`Error worth logging: ${error}`); // special case for some reason
          }
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
            resolve({success: true});
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
          if (error instanceof MongoServerError) {
            console.log(`Error worth logging: ${error}`); // special case for some reason
          }

          resolve({ success: false, message: err });
        });
    });
  },
};

module.exports = CompanyRepository;
