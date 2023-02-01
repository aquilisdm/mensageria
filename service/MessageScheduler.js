/*
 * Imports
 */
const MongoDB = require("../logic/MongoDB");
const MessageRepository = require("../modules/Messages/MessageRepository");
const MessageService = require("../modules/Messages/MessageService");
const Logger = require("../logic/Logger");
const fs = require("node:fs");
const Utils = require("../logic/Utils");
const ClientManager = require("../modules/Client/ClientManager");
const CompanyService = require("../modules/Company/CompanyService");
const { v4: uuidv4 } = require("uuid");
const BASE = "MessageScheduler:";
var intervalEvent = null;
var queryIntervalEvent = null;
var monitorIntervalEvent = null;
var intervalCount = null;
var queryInterval = null;

/*
 * Functions
 */

async function shouldSendWhatsApp() {
  try {
    let shouldSendWhatsApp = await MessageRepository.fetchShouldSendWhatsApp();
    let startTime = await MessageRepository.fetchStartTime();
    let endTime = await MessageRepository.fetchEndTime();
    let currentDate = Utils.convertTZ(new Date(), "America/Sao_Paulo");

    if (
      Array.isArray(startTime) &&
      Array.isArray(endTime) &&
      startTime.length > 0 &&
      endTime.length > 0
    ) {
      startTime[0] =
        typeof startTime[0] === "number" || typeof startTime[0] === "string"
          ? parseInt(startTime[0])
          : -1;
      endTime[0] =
        typeof endTime[0] === "number" || typeof endTime[0] === "string"
          ? parseInt(endTime[0])
          : -1;

      return (
        Array.isArray(shouldSendWhatsApp) &&
        currentDate.getHours() >= startTime[0] &&
        currentDate.getHours() <= endTime[0] &&
        shouldSendWhatsApp.length > 0 &&
        typeof shouldSendWhatsApp[0] === "string" &&
        shouldSendWhatsApp[0].trim().toLowerCase() == "sim"
      );
    }

    return false;
  } catch (err) {
    console.log(err);
    return false;
  }
}

function selectSeqDevice(deviceList) {
  if (Array.isArray(deviceList) && deviceList.length > 0) {
    if (global.lastDeviceIndex + 1 > deviceList.length - 1) {
      global.lastDeviceIndex = 0;
    } else global.lastDeviceIndex = global.lastDeviceIndex + 1;

    return deviceList[global.lastDeviceIndex].clientId;
  }

  return undefined;
}

async function fetchAllCompanyDevices() {
  try {
    let companies = await CompanyService.getCompanies();
    let result = {};

    if (Array.isArray(companies)) {
      for (let i = 0; i < companies.length; i++) {
        let devicesFromCompanyX = await ClientManager.getClientsByCompanyId(
          companies[i].id
        );
        if (
          Array.isArray(devicesFromCompanyX) &&
          devicesFromCompanyX.length > 0
        ) {
          //Validate if session is still active for the given device
          let thisDevicesFromCompanyX = Array.from(devicesFromCompanyX);
          for (let y = 0; y < thisDevicesFromCompanyX.length; y++) {
            if (
              fs.existsSync(
                "/mnt/prod/wpmessager/.wwebjs_auth/session-" +
                  thisDevicesFromCompanyX[y].clientId
              ) == false
            ) {
              devicesFromCompanyX = devicesFromCompanyX.filter((device) => {
                return device.clientId !== thisDevicesFromCompanyX[y].clientId;
              });

              //Invalidate device in database
              //...
            }
          }

          //Array with all devices that belong to X company
          result[companies[i].id] = devicesFromCompanyX;
        }
      }
    }

    return result;
  } catch (err) {
    console.log(err);
    return {};
  }
}

/*
 * Events
 */

async function sendLogsToMonitors() {
  if (await shouldSendWhatsApp()) {
    let monitors = await MessageRepository.fetchMonitors();

    if (Array.isArray(monitors) && monitors.length > 0) {
      let allCompanyDevices = await fetchAllCompanyDevices();
      //Company id number 1 is always 'Zap Grafica'
      let currentClientId = selectSeqDevice(allCompanyDevices[1]);
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

            await MessageService.sendTextMessage(
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
  }
}

async function fetchPendingMessages() {
  try {
    if (await shouldSendWhatsApp()) {
      let pendingMessages = await MessageRepository.fetchPendingMessages();
      if (Array.isArray(pendingMessages) && pendingMessages.length > 0) {
        pendingMessages.forEach((message) => {
          global.scheduledQueue.push(message);
        });

        global.eventEmitter.emit("queueMove", pendingMessages);
      }
    } else {
      global.scheduledQueue = [];
    }
  } catch (err) {
    console.log(err);
  }
}

async function processQueueOne() {
  try {
    if (await shouldSendWhatsApp()) {
      let pendingMessage = global.scheduledQueue.shift();
      let allCompanyDevices = await fetchAllCompanyDevices();
      let currentClientId = null;
      let formattedNumber = null;

      if (pendingMessage !== null && pendingMessage !== undefined) {
        //Send messages
        formattedNumber = Utils.formatNumber(pendingMessage.CELULAR);
        currentClientId = selectSeqDevice(
          allCompanyDevices[pendingMessage.CODIGO_EMPRESA]
        );

        if (
          formattedNumber !== null &&
          currentClientId !== undefined &&
          currentClientId !== null
        ) {
          response = await MessageService.sendTextMessage(
            currentClientId,
            formattedNumber,
            Utils.formatUnicodeToEmojisInText(pendingMessage.WHATSAPP)
          ).catch((err) => {
            response = {
              success: false,
              message: err,
            };
          });
        } else
          response = {
            success: false,
            message: "The phone number or the clientId is invalid",
          };

        if (response.success === false) {
          MessageRepository.updateMessageStatus(
            pendingMessage.CODIGO_MENSAGEM,
            "FALHA"
          );

          Logger.error(response.message, "MessageScheduler.processQueue()", {
            targetNumber: pendingMessage.CELULAR,
            formattedTargerNumber: formattedNumber,
            clientId: currentClientId,
            messageId: pendingMessage.CODIGO_MENSAGEM,
          });
        } else {
          MessageRepository.updateMessageStatus(
            pendingMessage.CODIGO_MENSAGEM,
            "WHATSAPP"
          );
        }
      }
    }
  } catch (err) {
    console.log(err);
    Logger.error(err, "MessageScheduler.processQueue()", {});
  }
}

/*
 * Main
 */
const MessageScheduler = {
  start: async function () {
    console.log(BASE + "Starting message scheduler...");
    let sendingInterval = await MessageRepository.fetchInterval();
    let queryInt = await MessageRepository.fetchQueryInterval();

    if (
      sendingInterval !== null &&
      sendingInterval !== undefined &&
      sendingInterval.length > 0 &&
      (typeof sendingInterval[0] == "string" ||
        typeof sendingInterval[0] == "number") &&
      isNaN(parseFloat(sendingInterval[0])) == false
    ) {
      intervalCount = parseFloat(sendingInterval[0]) * 1000.0; //convert to milliseconds
    } else {
      console.log(
        BASE +
          " [Message interval] could not be fetched, event will not start..."
      );
    }

    if (
      queryInt !== null &&
      queryInt !== undefined &&
      queryInt.length > 0 &&
      (typeof queryInt[0] == "string" || typeof queryInt[0] == "number") &&
      isNaN(parseFloat(sendingInterval[0])) == false
    ) {
      queryInterval = parseFloat(queryInt[0]) * 1000.0; //convert to milliseconds
    } else {
      console.log(
        BASE + " [Query interval] could not be fetched, event will not start..."
      );
    }

    //Initialize message distribution event
    if (intervalEvent === null && intervalCount !== null) {
      intervalEvent = setInterval(processQueueOne, intervalCount);
      console.log(BASE + " Message interval event has been started");
    } else {
      clearTimeout(intervalEvent);
      intervalEvent = setInterval(processQueueOne, intervalCount);
      console.log(BASE + " Message interval event has been re-started");
    }

    //Initialize query event
    if (queryIntervalEvent === null && queryInterval !== null) {
      queryIntervalEvent = setInterval(fetchPendingMessages, queryInterval);
      console.log(BASE + " Query event has been started");
    } else {
      clearTimeout(intervalEvent);
      queryIntervalEvent = setInterval(fetchPendingMessages, queryInterval);
      console.log(BASE + " Query event has been re-started");
    }

    //Initialize monitor event
    if (monitorIntervalEvent === null) {
      monitorIntervalEvent = setInterval(sendLogsToMonitors, 3600000);
      console.log(BASE + " Monitor event has been started");
    } else {
      clearTimeout(monitorIntervalEvent);
      monitorIntervalEvent = setInterval(sendLogsToMonitors, 3600000);
      console.log(BASE + " Monitor event has been re-started");
    }

    console.log(
      BASE +
        "Scheduler is running..." +
        "[query: " +
        queryInterval +
        "] [count:" +
        intervalCount +
        "] [monitor: 3600000]"
    );
  },
  stop: function () {
    console.log(BASE + "Stopping message scheduler and emptying queue...");
    global.scheduledQueue = [];
    clearTimeout(intervalEvent);
    clearTimeout(queryIntervalEvent);
    clearTimeout(monitorIntervalEvent);
  },
  test: function () {
    return MessageRepository.fetchSentMessagesCount();
  },
};

module.exports = MessageScheduler;
