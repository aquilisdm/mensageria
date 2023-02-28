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
const BASE = "MessageCore:";
var monitorIntervalEvent = null;
var queryInterval = null;
var intervalEventChecker = null;

/*
 * Functions
 */

async function processBlockedMessages(blockedMessages) {
  if (Array.isArray(blockedMessages) && blockedMessages.length > 0) {
    blockedMessages.forEach(async (message) => {
      if (message.CODIGO_TIPO_MENSAGEM == 1) {
        MessageRepository.updateMessageStatus(
          message.CODIGO_MENSAGEM,
          message.ACEITA_PROMOCOES === "SIM"
            ? Constants.CHANNEL.notAllowed
            : Constants.CHANNEL.noMarketing,
          "0"
        );
      } else {
        MessageRepository.updateMessageStatus(
          message.CODIGO_MENSAGEM,
          Constants.CHANNEL.notAllowed,
          "0"
        );
      }
    });
  }
}

async function processSMSMessages(pendingSMSMessages) {
  if (Array.isArray(pendingSMSMessages) && pendingSMSMessages.length > 0) {
    pendingSMSMessages.forEach((message) => {
      if (
        Array.from(global.smsScheduledQueue).filter((value) => {
          return message.CODIGO_MENSAGEM === value.CODIGO_MENSAGEM;
        }).length <= 0
      ) {
        global.smsScheduledQueue.push(message);
      } else {
        Logger.info(
          "Tried to add more then one message with the same code: " +
            message.CODIGO_MENSAGEM,
          "MessageCore.processSMSMessages()",
          {
            messageId: message.CODIGO_MENSAGEM,
            targetNumber: message.CELULAR,
            channel: message.CANAL,
            isAllowed: message.PERMITE,
            dueDate: message.DATA_VALIDADE,
            priority: message.PRIORIDADE_ENVIO,
            date: Utils.convertTZ(new Date(), "America/Sao_Paulo").toString(),
          }
        );
      }
    });
  }
}

async function processWhatsAppMessages(pendingWhatsAppMessages) {
  if (
    Array.isArray(pendingWhatsAppMessages) &&
    pendingWhatsAppMessages.length > 0
  ) {
    pendingWhatsAppMessages.forEach((message) => {
      if (
        Array.from(global.scheduledQueue).filter((value) => {
          return message.CODIGO_MENSAGEM === value.CODIGO_MENSAGEM;
        }).length <= 0
      ) {
        global.scheduledQueue.push(message);
      } else {
        Logger.info(
          "Tried to add more then one message with the same code: " +
            message.CODIGO_MENSAGEM,
          "MessageCore.fetchPendingMessages()",
          {
            messageId: message.CODIGO_MENSAGEM,
            targetNumber: message.CELULAR,
            channel: message.CANAL,
            isAllowed: message.PERMITE,
            dueDate: message.DATA_VALIDADE,
            priority: message.PRIORIDADE_ENVIO,
            date: Utils.convertTZ(new Date(), "America/Sao_Paulo").toString(),
          }
        );
      }
    });
  }
}

async function initServiceCore() {
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

    global.eventSessionInfo.queryEventTime = queryInterval;
  }

  if (monitorIntervalEvent === null) {
    monitorIntervalEvent = setInterval(sendLogsToMonitors, 3600000);
  }

  if (intervalEventChecker === null) {
    intervalEventChecker = setInterval(checkEventInterval, 120000);
  }

  console.log(BASE + " is running... [query:" + queryInterval + "]");
}

/*
 * Events
 */

async function checkEventInterval() {
  let currentQueryInterval = await MessageRepository.fetchQueryInterval();
  let currentSendingInterval = await MessageRepository.fetchInterval();

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
      initServiceCore();
    }
  }

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
      WhatsAppScheduler.setIntervalCount(currentSendingInterval);
      WhatsAppScheduler.stop();
      console.clear();
      console.log("Sending interval has changed, restarting service...");
      WhatsAppScheduler.start();
    }
  }
}

async function sendLogsToMonitors() {
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
}

async function fetchPendingMessages() {
  try {
    let pendingWhatsAppMessages = [];
    let pendingSMSMessages = [];
    let pendingBlockedMessages = [];
    let shouldProcessBlockedMessages = false;

    if (await MessageUtils.shouldSendWhatsApp()) {
      pendingWhatsAppMessages =
        await MessageRepository.fetchPendingWhatsAppMessages();
      processWhatsAppMessages(pendingWhatsAppMessages);
      shouldProcessBlockedMessages = true;
      global.eventEmitter.emit("queueMove",pendingWhatsAppMessages);
    }

    /*
    if (await MessageUtils.shouldSendSMS()) {
      pendingSMSMessages = await MessageRepository.fetchPendingSmsMessages();
      processSMSMessages(pendingSMSMessages);
      shouldProcessBlockedMessages = true;
    }
    */

    if (shouldProcessBlockedMessages) {
      pendingBlockedMessages =
        await MessageRepository.fetchClientBlockedMessages();
      processBlockedMessages(pendingBlockedMessages);
      global.eventEmitter.emit("queueMove",pendingBlockedMessages);
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
    //SmsScheduler.start();
  },
  stop: function () {
    console.clear();
    console.log("Trying to stop all message services...");
    //Stop all services
    clearInterval(global.queryIntervalEvent);
    clearInterval(monitorIntervalEvent);
    global.queryIntervalEvent = null;
    monitorIntervalEvent = null;

    WhatsAppScheduler.stop();
    SmsScheduler.stop();
  }
};

module.exports = MessageCore;