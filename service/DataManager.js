const MongoDB = require("../logic/MongoDB");
var cron = require("node-cron");

/**
 *
 * Main
 *
 **/

//Every Saturday at 12:00 AM
var deleteOldLogsTask = cron.schedule("0 0 * * SAT", async () => {
  try {
    let client = await MongoDB.getDatabase();
    const database = client.db(MongoDB.dbName);
    const collection = database.collection("logs");

    await collection.deleteMany({ status: "failed" });
  } catch (err) {
    console.log(err);
  }
});

const DataManager = {
  start: function () {
    deleteOldLogsTask.start();
  },
  stop: function () {
    deleteOldLogsTask.stop();
  },
};

module.exports = DataManager;
