/*
 * Imports
 */
const MessageRepository = require("../modules/Messages/MessageRepository");
const MessageService = require("../modules/Messages/MessageService");
const WhatsAppScheduler = require("./WhatsAppScheduler");
const SmsScheduler = require("./SmsScheduler");
const MessageUtils = require("./logic/MessageUtils");
const Logger = require("../logic/Logger");
const Utils = require("../logic/Utils");
const Constants = require("../logic/Constants");
const ClientManager = require("../modules/Client/ClientManager");
const CompanyService = require("../modules/Company/CompanyService");
const MongoDB = require("../logic/MongoDB");
const cron = require("node-cron");
const BASE = "MessageCore:";
var loggingTasks = null;
var intervalCheckerTask = null;
var queryInterval = null;

/*
 * Functions
 */

async function emptyQueue() {
  try {
    let mongoClient = await MongoDB.getDatabase();
    const database = mongoClient.db(MongoDB.dbName);
    const collection = database.collection(
      MessageUtils.getMessageCollectionName("WHATSAPP")
    );
    const collectionSms = database.collection(
      MessageUtils.getMessageCollectionName("SMS")
    );

    await collection.deleteMany({ CODIGO_TIPO_MENSAGEM: { $ne: undefined } });
    await collectionSms.deleteMany({
      CODIGO_TIPO_MENSAGEM: { $ne: undefined },
    });
    return true;
  } catch (err) {
    console.log(err);
    return false;
  }
}

async function processBlockedMessages(blockedMessages) {
  if (Array.isArray(blockedMessages) && blockedMessages.length > 0) {
    blockedMessages.forEach(async (message) => {
      if (message.CODIGO_TIPO_MENSAGEM == 1) {
        MessageRepository.updateMessageStatus(
          message.CODIGO_MENSAGEM,
          message.ACEITA_PROMOCOES === "SIM"
            ? Constants.CHANNEL.notAllowed
            : Constants.CHANNEL.noMarketing,
          null
        );
      } else {
        MessageRepository.updateMessageStatus(
          message.CODIGO_MENSAGEM,
          Constants.CHANNEL.notAllowed,
          null
        );
      }
    });
  }
}

async function processSMSMessages(pendingSMSMessages) {
  try {
    if (Array.isArray(pendingSMSMessages) && pendingSMSMessages.length > 0) {
      let mongoClient = await MongoDB.getDatabase();
      const database = mongoClient.db(MongoDB.dbName);
      const collection = database.collection(
        MessageUtils.getMessageCollectionName("SMS")
      );

      for (let i = 0; i < pendingSMSMessages.length; i++) {
        await collection.updateOne(
          pendingSMSMessages[i],
          {
            $set: {
              CODIGO_MENSAGEM: pendingSMSMessages[i].CODIGO_MENSAGEM,
            },
          },
          { upsert: true }
        );
      }
      mongoClient.close();
    }
  } catch (err) {
    console.log(err);
  }
}

async function processWhatsAppMessages(pendingWhatsAppMessages) {
  try {
    if (
      Array.isArray(pendingWhatsAppMessages) &&
      pendingWhatsAppMessages.length > 0
    ) {
      let mongoClient = await MongoDB.getDatabase();
      const database = mongoClient.db(MongoDB.dbName);
      const collection = database.collection(
        MessageUtils.getMessageCollectionName("WHATSAPP")
      );

      for (let i = 0; i < pendingWhatsAppMessages.length; i++) {
        await collection.updateOne(
          pendingWhatsAppMessages[i],
          {
            $set: {
              CODIGO_MENSAGEM: pendingWhatsAppMessages[i].CODIGO_MENSAGEM,
            },
          },
          { upsert: true }
        );
      }
      mongoClient.close();
    }
  } catch (err) {
    console.log(err);
  }
}

async function initServiceCore() {
  //Empty queue before starting any process...
  await emptyQueue();

  console.log("Trying to start service core...");
  let queryInt = await MessageRepository.fetchQueryInterval();

  if (
    queryInt !== null &&
    queryInt !== undefined &&
    queryInt.length > 0 &&
    (typeof queryInt[0] == "string" || typeof queryInt[0] == "number") &&
    isNaN(parseFloat(queryInt[0])) == false
  ) {
    queryInterval = parseFloat(queryInt[0]) * 1000.0; //convert to milliseconds

    if (global.queryIntervalEvent === null) {
      global.queryIntervalEvent = setInterval(
        fetchPendingMessages,
        queryInterval
      );
      console.log(BASE + " Query event has been started");
    }
  }

  //Logs the amount of messages sent in one hour
  loggingTasks = cron.schedule("0 * * * *", sendLogs);
  loggingTasks.start();
  //Check the interval parameter in database every 2 minutes
  intervalCheckerTask = cron.schedule("*/10 * * * *", checkEventInterval);
  intervalCheckerTask.start();

  console.log(BASE + " is running... [query:" + queryInterval + "]");
}

/*
 * Events
 */

async function checkEventInterval() {
  try {
    let currentQueryInterval = await MessageRepository.fetchQueryInterval();
    let currentSendingInterval = await MessageRepository.fetchInterval();

    if (
      currentSendingInterval !== null &&
      currentSendingInterval !== undefined &&
      currentSendingInterval.length > 0 &&
      (typeof currentSendingInterval[0] == "string" ||
        typeof currentSendingInterval[0] == "number") &&
      isNaN(parseFloat(currentSendingInterval[0])) == false
    ) {
      currentSendingInterval = parseFloat(currentSendingInterval[0]) * 1000.0;

      if (currentSendingInterval !== WhatsAppScheduler.getIntervalCount()) {
        console.log("Sending interval has changed, restarting service...");
        WhatsAppScheduler.setIntervalCount(currentSendingInterval);
        WhatsAppScheduler.stop();
        console.clear();
        WhatsAppScheduler.start();
      }
    }

    if (
      currentQueryInterval !== null &&
      currentQueryInterval !== undefined &&
      currentQueryInterval.length > 0 &&
      (typeof currentQueryInterval[0] == "string" ||
        typeof currentQueryInterval[0] == "number") &&
      isNaN(parseFloat(currentQueryInterval[0])) == false
    ) {
      currentQueryInterval = parseFloat(currentQueryInterval[0]) * 1000.0; //convert to milliseconds

      if (currentQueryInterval !== queryInterval) {
        //restart the interval
        queryInterval = currentQueryInterval;
        clearInterval(global.queryIntervalEvent);
        console.clear();
        console.log("Query interval has changed, restarting service...");
        global.queryIntervalEvent = setInterval(
          fetchPendingMessages,
          queryInterval
        );
        console.log("Done");
      }
    }
  } catch (err) {
    console.log(err);
  }
}

async function sendLogs() {
  try {
    //WhatsApp version
    console.clear();
    if (await MessageUtils.shouldSendWhatsApp()) {
      console.log("Sending logs to the following people...");
      let monitors = await MessageRepository.fetchMonitors();
      console.log(JSON.stringify(monitors));

      if (Array.isArray(monitors) && monitors.length > 0) {
        let allCompanyDevices = await MessageUtils.fetchAllCompanyDevices();
        //Company id number 1 is always 'Zap Grafica'
        let device = MessageUtils.selectSeqDevice(allCompanyDevices[1]);
        let currentClientId =
          device !== undefined && device !== null ? device.clientId : undefined;
        let currentDate = Utils.convertTZ(new Date(), "America/Sao_Paulo")
          .toLocaleDateString()
          .split("/");
        let date = Utils.convertTZ(new Date(), "America/Sao_Paulo");

        currentDate =
          currentDate[1] + "/" + currentDate[0] + "/" + currentDate[2];
        currentDate += ` entre ${
          date.getHours().toString().length == 1
            ? "0" + date.getHours()
            : date.getHours()
        }:00 e ${date.getHours() + 1 > 23 ? "00" : date.getHours() + 1}:00`;

        if (currentClientId !== undefined && currentClientId !== null) {
          for (let i = 0; i < monitors.length; i++) {
            let formattedNumber = Utils.formatNumber(monitors[i]);
            if (formattedNumber !== null) {
              let count = await MessageRepository.fetchSentMessagesCount();

              await MessageService.sendWhatsAppMessage(
                currentClientId,
                formattedNumber,
                `*${
                  Array.isArray(count) && count.length > 0
                    ? count[0]
                    : "UNAVAILABLE"
                }* mensagens foram enviadas.\n*${currentDate}*`
              );
            }
          }
        }
      }
    } else {
      ClientManager.destroyAllClientSessions();
    }
  } catch (err) {
    console.log(err);
  } finally {
    //Call the garbage collector each hour
    //The event above will run each 60 minutes
    Utils.callGC();
  }
}

async function fetchPendingMessages() {
  try {
    let pendingWhatsAppMessages = [];
    let pendingSMSMessages = [];
    let pendingBlockedMessages = [];
    let shouldProcessBlockedMessages = false;

    if (await MessageUtils.shouldSendWhatsApp()) {
      //Add this line when the SMS is done AND CP.WHATSAPP = 'SIM'
      pendingWhatsAppMessages =
        await MessageRepository.fetchPendingWhatsAppMessages();
      processWhatsAppMessages(pendingWhatsAppMessages);
      shouldProcessBlockedMessages = true;
    }

    if (await MessageUtils.shouldSendSMS()) {
      pendingSMSMessages = await MessageRepository.fetchPendingSmsMessages();
      processSMSMessages(pendingSMSMessages);
      shouldProcessBlockedMessages = true;
    }

    if (shouldProcessBlockedMessages) {
      pendingBlockedMessages =
        await MessageRepository.fetchClientBlockedMessages();
      processBlockedMessages(pendingBlockedMessages);
    }
  } catch (err) {
    console.log(err);
  }
}

/*
 * Main
 */
const MessageCore = {
  start: function () {
    console.log("Trying to start all message services...");
    //Init whatsapp and sms services
    initServiceCore();
    WhatsAppScheduler.start();
    SmsScheduler.start();
  },
  stop: function () {
    console.clear();
    console.log("Trying to stop all message services...");
    //Stop all services
    clearInterval(global.queryIntervalEvent);
    global.queryIntervalEvent = null;
    loggingTasks.stop();
    intervalCheckerTask.stop();
    emptyQueue();
    WhatsAppScheduler.stop();
    SmsScheduler.stop();
  },
};

module.exports = MessageCore;
