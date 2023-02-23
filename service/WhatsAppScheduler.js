/*
 * Imports
 */
const MessageRepository = require("../modules/Messages/MessageRepository");
const MessageService = require("../modules/Messages/MessageService");
const Logger = require("../logic/Logger");
const Utils = require("../logic/Utils");
const Constants = require("../logic/Constants");
const ClientManager = require("../modules/Client/ClientManager");
const CompanyService = require("../modules/Company/CompanyService");
const MessageUtils = require("./logic/MessageUtils");
const BASE = "WhatsAppScheduler:";
var monitorIntervalEvent = null;
var intervalCount = null;
var queryInterval = null;

/*
 * Functions
 */

async function next() {
  WhatsAppScheduler.stopIntervalEvent();
  await processQueueOne();
  WhatsAppScheduler.startIntervalEvent();
}

/*
 * Events
 */

async function processQueueOne() {
  try {
    if (await MessageUtils.shouldSendWhatsApp()) {
      let pendingMessage = global.scheduledQueue.shift();
      let currentClientId = null;
      let formattedNumber = null;
      let device = null;
      if (pendingMessage !== null && pendingMessage !== undefined) {
        console.log("Sending message with code: "+pendingMessage.CODIGO_MENSAGEM);
        if (
          pendingMessage.ACEITA_WHATSAPP !== undefined &&
          pendingMessage.ACEITA_WHATSAPP === "SIM"
        ) {
          let allCompanyDevices = await MessageUtils.fetchAllCompanyDevices();
          //Send messages
          formattedNumber = Utils.formatNumber(pendingMessage.CELULAR);
          let companyCode = !Utils.isEmpty(pendingMessage.CODIGO_EMPRESA)
            ? pendingMessage.CODIGO_EMPRESA
            : 1;
          device = MessageUtils.selectSeqDevice(allCompanyDevices[companyCode]);

          currentClientId =
            device !== undefined && device !== null
              ? device.clientId
              : undefined;

          if (
            formattedNumber !== null &&
            currentClientId !== undefined &&
            currentClientId !== null
          ) {
            response = await MessageService.sendWhatsAppMessage(
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
            console.log("Message with code: "+pendingMessage.CODIGO_MENSAGEM+" failed");
            MessageRepository.updateMessageStatus(
              pendingMessage.CODIGO_MENSAGEM,
              Constants.CHANNEL.failed,
              device !== undefined && device !== null ? device.number : ""
            );

            Logger.error(response.message, "WhatsAppScheduler.processQueue()", {
              senderNumber:
                device !== undefined && device !== null
                  ? device.number
                  : undefined,
              targetNumber: Utils.isEmpty(pendingMessage.CELULAR)
                ? undefined
                : pendingMessage.CELULAR.trim(),
              formattedTargetNumber: formattedNumber,
              clientId: currentClientId,
              messageId: pendingMessage.CODIGO_MENSAGEM,
              messageRegisterDate: pendingMessage.DATA_CADASTRO,
              messageTypeCode: pendingMessage.CODIGO_TIPO_MENSAGEM,
              deviceArrayLength: Array.isArray(allCompanyDevices[companyCode])
                ? allCompanyDevices[companyCode].length
                : null,
              pendingMessageCompany: pendingMessage.CODIGO_EMPRESA,
              status: "failed",
            });
          } else if (response.success === true) {
            console.log("Message with code "+pendingMessage.CODIGO_MENSAGEM+" was sent");
            MessageRepository.updateMessageStatus(
              pendingMessage.CODIGO_MENSAGEM,
              Constants.CHANNEL.sentViaWhatsApp,
              device !== undefined && device !== null ? device.number : ""
            );

            Logger.info(
              pendingMessage.WHATSAPP,
              "WhatsAppScheduler.processQueue()",
              {
                senderNumber:
                  device !== undefined && device !== null
                    ? device.number
                    : undefined,
                targetNumber: Utils.isEmpty(pendingMessage.CELULAR)
                  ? undefined
                  : pendingMessage.CELULAR.trim(),
                formattedTargetNumber: formattedNumber,
                clientId: currentClientId,
                messageId: pendingMessage.CODIGO_MENSAGEM,
                messageRegisterDate: pendingMessage.DATA_CADASTRO,
                messageTypeCode: pendingMessage.CODIGO_TIPO_MENSAGEM,
                pendingMessageCompany: pendingMessage.CODIGO_EMPRESA,
                status: "success",
              }
            );
          }
        }
      }
    } else {
      global.scheduledQueue = [];
    }
  } catch (err) {
    console.log(err);
    Logger.error(err, "WhatsAppScheduler.processQueue()", {});
  }
}

/*
 * Main
 */
const WhatsAppScheduler = {
  start: async function () {
    console.log(BASE + "Starting message scheduler...");
    let sendingInterval = await MessageRepository.fetchInterval();

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

    //Initialize message distribution event
    if (intervalCount !== null) {
      if (global.intervalEvent === null) {
        global.intervalEvent = setInterval(processQueueOne, intervalCount);
        console.log(BASE + " Message interval event has been started");
      } else {
        clearInterval(global.intervalEvent);
        global.intervalEvent = setInterval(processQueueOne, intervalCount);
        console.log(BASE + " Message interval event has been re-started");
      }

      global.eventSessionInfo.intervalEventTime = intervalCount;
    }

    console.log(BASE + "Scheduler is running... [count:" + intervalCount + "]");
  },
  stop: function () {
    console.log(BASE + "Stopping message scheduler and emptying queue...");
    clearInterval(global.intervalEvent);
    global.scheduledQueue = [];
    global.intervalEvent = null;
  },
  startIntervalEvent: function () {
    //Initialize message distribution event
    if (intervalCount !== null) {
      if (global.intervalEvent === null) {
        global.intervalEvent = setInterval(processQueueOne, intervalCount);
      }
    }
  },
  stopIntervalEvent: function () {
    clearInterval(global.intervalEvent);
    global.intervalEvent = null;
  },
};

module.exports = WhatsAppScheduler;
