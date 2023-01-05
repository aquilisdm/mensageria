const MongoDB = require("../../logic/MongoDB");
const { Client, LocalAuth } = require("whatsapp-web.js");
const { MongoClient } = require("mongodb");
// Connection URL
const url = "mongodb://127.0.0.1:27017/wpmessager?directConnection=true";
const client = new MongoClient(url);
const dbName = "wpmessager";

const ClientManager = {
  deleteClient: function (clientId) {
    MongoDB.getDatabase()
      .then(async (client) => {
        const database = client.db(MongoDB.dbName);
        const collection = database.collection("clients");
        await collection.deleteMany({ clientId: clientId });
        client.close();
      })
      .catch((error) => {
        console.log(`Error worth logging: ${error}`); // special case for some reason
      });
  },
  setClientId: function (clientId, deviceInfo, userId) {
    if (clientId !== undefined && clientId !== null) {
      MongoDB.getDatabase()
        .then(async (client) => {
          const database = client.db(MongoDB.dbName);
          const collection = database.collection("clients");
          const findResult = await collection
            .find({ clientId: clientId })
            .toArray();

          if (findResult !== null && findResult.length <= 0) {
           await collection.insertOne({
              clientId: clientId,
              deviceInfo: deviceInfo,
              date: new Date().getTime(),
              userId: userId,
            });
          }

          client.close();
        })
        .catch((error) => {
          console.log(`Error worth logging: ${error}`);
        });
    }
  },
  getClients: function (id) {
    return new Promise(async (resolve, reject) => {
      //const database = await MongoDB.getDatabase();

      const client = new MongoClient(url);
      await client.connect();
      const database = client.db(MongoDB.dbName);
      const collection = database.collection("clients");
      resolve(await collection.find({ userId: id }).toArray());
    });
  },
  createClientSession: function (clientId) {
    const client = new Client({
      puppeteer: {
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-accelerated-2d-canvas",
          "--no-first-run",
          "--no-zygote",
          "--single-process", // <-- Only on Linux SO
          "--disable-gpu",
        ],
        headless: true,
      },
      authStrategy: new LocalAuth({ clientId: clientId }),
    });
    client.setMaxListeners(2048);
    return client;
  },
};

module.exports = ClientManager;
