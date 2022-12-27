const { MongoClient } = require("mongodb");
// Connection URL
const url = "mongodb://127.0.0.1:27017/wpmessager?directConnection=true";
const client = new MongoClient(url);
const dbName = "wpmessager";

module.exports = {
  getDatabase: function () {
    return new Promise(async (resolve, reject) => {
      await client.connect();
      resolve(client);
    });
  },
  dbName:dbName
};
