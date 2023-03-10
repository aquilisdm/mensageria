const cron = require("node-cron");
const MessageCore = require("./MessageCore");
const Utils = require("../logic/Utils");
const DataManager = require('./DataManager');

var clearConsoleTask = cron.schedule("*/12 * * * *", () => {
  console.clear();
});

var restartTask = cron.schedule(
    "0 22 * * *",
    () => {
      console.log("Running a job at 11:00 PM at America/Sao_Paulo timezone");
      MessageCore.stop();
      DataManager.stop();
      Utils.callGC();
      MessageCore.start();
      DataManager.start();
    },
    {
      scheduled: true,
      timezone: "America/Sao_Paulo",
    }
  );
  
  var clearTask = cron.schedule("*/20 * * * *", () => {
    console.log("Calling GC...");
    Utils.callGC();
    console.log("done");
  });

const Cronjobs = {
  start: function () {
    restartTask.start();
    clearTask.start(); 
    clearConsoleTask.start();
  },
  stop: function () {
    restartTask.stop();
    clearTask.stop();
    clearConsoleTask.stop();
  },
};

module.exports = Cronjobs;
