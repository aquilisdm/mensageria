const MongoDB = require("../logic/MongoDB");
const INTERVAL_COUNT = 14400.0 * 1000.0;
var interval = null;
var moment = require("moment");
var Utils = require("../logic/Utils");

/**
 *
 * Main
 *
 **/

async function processOldLogData() {
  try {
    let client = await MongoDB.getDatabase();
    const database = client.db(MongoDB.dbName);
    const collection = database.collection("logs");
    //{$gte:ISODate(""),$lt:ISODate("")}
    let startDate = Utils.convertTZ(
      moment(new Date()).subtract(1, "week"),
      "America/Sao_Paulo"
    );
    let endDate = Utils.convertTZ(
      moment(new Date()).subtract(2, "day"),
      "America/Sao_Paulo"
    );

    await collection.deleteMany({
      status: "success",
      "additionalDetails.messageRegisterDate": {
        $gte: startDate,
        $lt: endDate,
      },
    });
  } catch (err) {
    console.log("processOldLogData: " + err);
  }
}

const DataManager = {
  start: function () {
    console.log("Starting data manager...");
    interval = setInterval(processOldLogData, INTERVAL_COUNT);
    console.log("Data manager is running [" + INTERVAL_COUNT + "]");
  },
  stop: function () {
    if (interval !== null) clearInterval(interval);
  },
};

module.exports = DataManager;
