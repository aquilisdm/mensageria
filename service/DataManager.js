
//const MongoDB = require("../logic/MongoDB");
//const INTERVAL_COUNT = 3600000;
//var interval = null;

/**
 *
 * Main
 *

async function processOldLogData() {
  let client = await MongoDB.getDatabase();
  const database = client.db(MongoDB.dbName);
  const collection = database.collection("message_logs");
  //{$gte:ISODate(""),$lt:ISODate("")}
  let startDate = Utils.convertTZ(new Date(new Date().toLocaleDateString()), "America/Sao_Paulo");
  let endDate = Utils.convertTZ(new Date(new Date().toLocaleDateString()), "America/Sao_Paulo");

  const errors = await collection
    .find({ $gte: startDate, $lt: endDate })
    .toArray();
}

const DataManager = {
  start: function () {
    console.log("Starting data manager...");
    interval = setInterval(processOldLogData, INTERVAL_COUNT);
  },
  stop: function () {
    if (interval !== null) clearInterval(interval);
  },
};

module.exports = DataManager;

 */
