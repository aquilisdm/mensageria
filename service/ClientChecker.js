const MongoDB = require("../logic/MongoDB");
const Logger = require("../logic/Logger");
const { v4: uuidv4 } = require("uuid");
var LocalStorage = require("node-localstorage").LocalStorage;

var interval = null;

async function checkForPendingClients() {
  let localStorage = new LocalStorage("./clients");

  let clients = localStorage.getItem("temp_clients");
  clients =
    clients !== null && clients !== undefined ? JSON.parse(clients) : [];

  if (clients.length > 0) {
    let mongoClient = await MongoDB.getDatabase();
    const database = mongoClient.db(MongoDB.dbName);
    const collection = database.collection("clients");
    let thisClients = Array.from(clients);
    for (let i = 0; i < thisClients.length; i++) {
      try {
        await collection.insertOne(thisClients[i]);
        clients.shift();
      } catch (err) {
        console.log(err);
      }
    }

    localStorage.setItem("temp_clients", JSON.stringify(clients));
  }
}

const ClientChecker = {
  start: function () {
    console.log("Stating ClientChecker...");
    if (interval === null)
      interval = setInterval(checkForPendingClients, 30000);
  },
  stop: function () {
    if (interval !== null) clearTimeout(interval);
  },
};

module.exports = ClientChecker;
