/*
 * Imports
 */
const MessageRepository = require("../modules/Messages/MessageRepository");
const MessageService = require("../modules/Messages/MessageService");
const Logger = require("../logic/Logger");
const Utils = require("../logic/Utils");
const Constants = require("../logic/Constants");
const MessageUtils = require("./logic/MessageUtils");
const BASE = "WhatsAppScheduler:";
var intervalCount = null;

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

async function processQueueDevelopment() {
  try {
    if (await MessageUtils.shouldSendWhatsApp()) {
      let pendingMessage = global.scheduledQueue.shift();
      let currentClientId = null;
      let formattedNumber = null;
      let device = null;
      if (pendingMessage !== null && pendingMessage !== undefined) {
        console.log(
          "Sending message with code: " + pendingMessage.CODIGO_MENSAGEM
        );
        let allCompanyDevices = await MessageUtils.fetchAllCompanyDevices();
        //Send messages
        formattedNumber = Utils.formatNumber("31996934484");
        let companyCode = !Utils.isEmpty(pendingMessage.CODIGO_EMPRESA)
          ? pendingMessage.CODIGO_EMPRESA
          : 1;
        device = MessageUtils.selectSeqDevice(allCompanyDevices[companyCode]);

        currentClientId =
          device !== undefined && device !== null ? device.clientId : undefined;

        if (
          formattedNumber !== null &&
          currentClientId !== undefined &&
          currentClientId !== null
        ) {
          response = await MessageService.sendWhatsAppMessage(
            currentClientId,
            formattedNumber,
            Utils.formatUnicodeToEmojisInText(
              "This is a development test, please ignore..."
            )
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

        if (response.success === false && !pendingMessage.ACEITA_SMS) {
          console.log(
            "DEV: Message with code: " +
              pendingMessage.CODIGO_MENSAGEM +
              " failed"
          );
        } else if (response.success === false && pendingMessage.ACEITA_SMS) {
          console.log(
            "DEV: Message with code " +
              pendingMessage.CODIGO_MENSAGEM +
              " will be sent via sms"
          );
        } else if (response.success === true) {
          console.log(
            "DEV: Message with code " +
              pendingMessage.CODIGO_MENSAGEM +
              " was sent successfully"
          );
        }
      }
    }
  } catch (err) {
    console.log("processQueueDevelopment: " + err);
  }
}

async function processQueueOne() {
  try {
    if (await MessageUtils.shouldSendWhatsApp()) {
      let pendingMessage = global.scheduledQueue.shift();
      let currentClientId = null;
      let formattedNumber = null;
      let device = null;
      if (pendingMessage !== null && pendingMessage !== undefined) {
        if (pendingMessage.ACEITA_WHATSAPP === "SIM") {
          if (
            pendingMessage.CODIGO_TIPO_MENSAGEM == 1 &&
            pendingMessage.ACEITA_PROMOCOES === "NÃO"
          ) {
            MessageRepository.updateMessageStatus(
              pendingMessage.CODIGO_MENSAGEM,
              Constants.CHANNEL.noMarketing,
              "-1"
            );

            return;
          }

          let allCompanyDevices = await MessageUtils.fetchAllCompanyDevices();
          let companyCode = !Utils.isEmpty(pendingMessage.CODIGO_EMPRESA)
            ? pendingMessage.CODIGO_EMPRESA
            : 1;

          if (
            Array.isArray(allCompanyDevices[companyCode]) &&
            allCompanyDevices[companyCode].length > 0
          ) {
            console.log(
              "Sending message with code: " + pendingMessage.CODIGO_MENSAGEM
            );
            //Send messages
            formattedNumber = Utils.formatNumber(pendingMessage.CELULAR);
            device = MessageUtils.selectSeqDevice(
              allCompanyDevices[companyCode]
            );

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
              console.log(
                "Message with code: " +
                  pendingMessage.CODIGO_MENSAGEM +
                  " failed"
              );
              MessageRepository.updateMessageStatus(
                pendingMessage.CODIGO_MENSAGEM,
                Constants.CHANNEL.failed,
                device !== undefined && device !== null ? device.number : ""
              );

              Logger.error(
                response.message,
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
                  deviceArrayLength: Array.isArray(
                    allCompanyDevices[companyCode]
                  )
                    ? allCompanyDevices[companyCode].length
                    : null,
                  pendingMessageCompany: pendingMessage.CODIGO_EMPRESA,
                  status: "failed",
                }
              );
            } else if (response.success === true) {
              console.log(
                "Message with code " +
                  pendingMessage.CODIGO_MENSAGEM +
                  " was sent successfully"
              );
              MessageRepository.updateMessageStatus(
                pendingMessage.CODIGO_MENSAGEM,
                Constants.CHANNEL.sentViaWhatsApp,
                device !== undefined && device !== null ? device.number : ""
              );
            }
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
    if (
      process.env.NODE_ENV === Constants.PRODUCTION_ENV &&
      intervalCount !== null
    ) {
      if (global.intervalEvent === null) {
        global.intervalEvent = setInterval(processQueueOne, intervalCount);
        console.log(BASE + " Message interval event has been started");
      } else {
        clearInterval(global.intervalEvent);
        global.intervalEvent = setInterval(processQueueOne, intervalCount);
        console.log(BASE + " Message interval event has been re-started");
      }

      global.eventSessionInfo.intervalEventTime = intervalCount;
      console.log(
        BASE + "Scheduler is running... [count:" + intervalCount + "]"
      );
    } else if (process.env.NODE_ENV === Constants.DEVELOPMENT_ENV) {
      global.intervalEvent = setInterval(processQueueDevelopment, 60000);
      console.log(
        BASE + "[DEV] Scheduler is running... [count:" + intervalCount + "]"
      );
    }
  },
  stop: function () {
    console.log(BASE + "Stopping message scheduler..");
    clearInterval(global.intervalEvent);
    global.scheduledQueue = [];
    global.intervalEvent = null;
  },
  getIntervalCount: function () {
    return intervalCount;
  },
  setIntervalCount: function (i) {
    if (typeof i === "number") intervalCount = i;
  },
};

module.exports = WhatsAppScheduler;
