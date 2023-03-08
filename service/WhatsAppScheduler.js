/*
 * Imports
 */
const MessageRepository = require("../modules/Messages/MessageRepository");
const MessageService = require("../modules/Messages/MessageService");
const Logger = require("../logic/Logger");
const Utils = require("../logic/Utils");
const Constants = require("../logic/Constants");
const MessageUtils = require("./logic/MessageUtils");
const MongoDB = require("../logic/MongoDB");
const BASE = "WhatsAppScheduler:";
var intervalCount = null;

/*
 * Events
 */

async function processQueueOne() {
  var mongoClient = await MongoDB.getDatabase().catch((err) => {
    console.log(err);
  });

  try {
    if ((await MessageUtils.shouldSendWhatsApp()) && mongoClient !== null) {
      const database = mongoClient.db(MongoDB.dbName);
      const collection = database.collection(
        MessageUtils.getMessageCollectionName()
      );

      var pendingMessage = await collection.findOneAndDelete(
        {},
        { sort: { _id: 1 } }
      );

      pendingMessage =
        pendingMessage !== null &&
        pendingMessage !== undefined &&
        typeof pendingMessage === "object"
          ? pendingMessage.value
          : null;

      let currentClientId = null;
      let formattedNumber = null;
      let device = null;
      if (pendingMessage !== null && pendingMessage !== undefined) {
        if (pendingMessage.ACEITA_WHATSAPP === "SIM") {
          if (
            pendingMessage.CODIGO_TIPO_MENSAGEM == 1 &&
            pendingMessage.ACEITA_PROMOCOES.trim() !== "SIM" // == NÃO
          ) {
            MessageRepository.updateMessageStatus(
              pendingMessage.CODIGO_MENSAGEM,
              Constants.CHANNEL.noMarketing,
              null
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
            //New devices should not send Marketing messages
            if (pendingMessage.CODIGO_TIPO_MENSAGEM == 1) {
              allCompanyDevices[companyCode] = allCompanyDevices[
                companyCode
              ].filter((value) => {
                if (
                  value.isNewNumber !== null &&
                  value.isNewNumber !== undefined
                )
                  return value.isNewNumber.trim().toLowerCase() !== "sim";
                else return false;
              });

              device = MessageUtils.selectSeqMarketingDevice(
                allCompanyDevices[companyCode]
              );
            } else {
              device = MessageUtils.selectSeqDevice(
                allCompanyDevices[companyCode]
              );
            }

            //Send messages
            formattedNumber = Utils.formatNumber(pendingMessage.CELULAR);
            currentClientId =
              device !== undefined && device !== null
                ? device.clientId
                : undefined;

            if (
              formattedNumber !== null &&
              currentClientId !== undefined &&
              currentClientId !== null
            ) {
              console.log(
                "Sending message with code: " + pendingMessage.CODIGO_MENSAGEM
              );
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
            } else if (
              formattedNumber !== null &&
              (currentClientId == null || currentClientId == undefined) &&
              pendingMessage.CODIGO_TIPO_MENSAGEM == 1
            ) {
              console.log(
                "Client Id is null for message: " +
                  pendingMessage.CODIGO_MENSAGEM
              );
              return;
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
                device !== undefined && device !== null ? device.number : null
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
                  validTil: Utils.isDate(new Date(pendingMessage.DATA_VALIDADE))
                    ? new Date(pendingMessage.DATA_VALIDADE)
                    : pendingMessage.DATA_VALIDADE,
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
                device !== undefined && device !== null ? device.number : null
              );
            }
          }
        }
      }
    }
  } catch (err) {
    console.log(err);
    Logger.error(err, "WhatsAppScheduler.processQueue()", {});
  } finally {
    mongoClient.close();
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

      console.log(
        BASE + "Scheduler is running... [count:" + intervalCount + "]"
      );
    } else if (process.env.NODE_ENV === Constants.DEVELOPMENT_ENV) {
      global.intervalEvent = setInterval(
        processQueueDevelopment,
        intervalCount
      );
      console.log(
        BASE + "[DEV] Scheduler is running... [count:" + intervalCount + "]"
      );
    }
  },
  stop: function () {
    console.log(BASE + "Stopping message scheduler..");
    clearInterval(global.intervalEvent);
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
