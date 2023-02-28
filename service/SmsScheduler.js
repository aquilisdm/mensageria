const MessageRepository = require("../modules/Messages/MessageRepository");
const MessageUtils = require("./logic/MessageUtils");
const Logger = require("../logic/Logger");
const Utils = require("../logic/Utils");
const Constants = require("../logic/Constants");
const https = require("https");
const url = require("url");
const crypto = require("crypto");
const util = require("util");
const BASE = "SmsScheduler:";
var realUrl =
  "https://smsapi.ap-southeast-1.myhuaweicloud.com:443/sms/batchSendDiffSms/v1"; //Application access address and API access URI
const SENDER = "smsapp0000000259";

var monitorIntervalEvent = null;
var intervalCount = null;
var queryInterval = null;
var statusCallBack = "";

function buildWsseHeader() {
  var crypto = require("crypto");
  var util = require("util");
  //A definir a secret key
  var time = new Date(Date.now()).toISOString().replace(/.[0-9]+\Z/, "Z"); //Created
  var nonce = crypto.randomBytes(64).toString("hex"); //Nonce
  var passwordDigestBase64Str = crypto
    .createHash("sha256")
    .update(nonce + time + Constants.HUAWEI_APP_SECRETE)
    .digest("base64"); //PasswordDigest

  return util.format(
    'UsernameToken Username="%s",PasswordDigest="%s",Nonce="%s",Created="%s"',
    Constants.HUAWEI_APP_KEY,
    passwordDigestBase64Str,
    nonce,
    time
  );
}

/*
 * Functions
 */

function sendSMS(receiver, message) {
  return new Promise((resolve, reject) => {
    var urlObject = url.parse(realUrl); //Parse the realUrl character string and return a URL object.

    var options = {
      host: urlObject.hostname, //Host name
      port: urlObject.port, //Port
      path: urlObject.pathname, //URI
      method: "POST", //The request method is POST.
      headers: {
        //Request headers
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: 'WSSE realm="SDP",profile="UsernameToken",type="Appkey"',
        "X-WSSE": buildWsseHeader(),
      },
      rejectUnauthorized: false, //Ignore the certificate trust issues to prevent API calling failures caused by HTTPS certificate authentication failures.
    };

    //A definir id do template,parametros e api secret key
    var body = buildRequestBody(
      SENDER,
      receiver,
      Constants.TEMPLATE_ID,
      [message],
      statusCallBack,
      Constants.HUAWEI_APP_SIGNATURE
    );

    var req = https.request(options, (res) => {
      res.setEncoding("utf8"); //Set the response data encoding format.
      res.on("data", (d) => {
        //console.log("resp:", d); //The response data is recorded.
        resolve({ success: true });
      });

      req.on("error", (e) => {
        console.error(e.message); //When a request error occurs, error details are recorded.
        Logger.error(e.message, "SmsScheduler.sendSMS()", {});
        resolve({ success: false });
      });
      req.write(body); //Send data in the request body.
      req.end(); //End the request.
    });
  });
}

/**
 * Construct the request body.
 *
 * @param sender
 * @param receiver
 * @param templateId
 * @param templateParas
 * @param statusCallBack
 * @param signature | Signature name, which must be specified when the universal template for Chinese mainland SMS is used.
 * @returns bool
 */
function buildRequestBody(
  sender,
  receiver,
  templateId,
  templateParas,
  statusCallBack,
  signature
) {
  if (null !== signature && signature.length > 0) {
    return querystring.stringify({
      from: sender,
      to: receiver,
      templateId: templateId,
      templateParas: templateParas,
      statusCallback: statusCallBack,
      signature: signature,
    });
  }

  return querystring.stringify({
    from: sender,
    to: receiver,
    templateId: templateId,
    templateParas: templateParas,
    statusCallback: statusCallBack,
  });
}

/*
 * Events
 */
async function processQueue() {
  try {
    if (await MessageUtils.shouldSendSMS()) {
      let pendingMessage = global.smsScheduledQueue.shift();
      let formattedNumber = null;
      if (pendingMessage !== null && pendingMessage !== undefined) {
        if (
          pendingMessage.ACEITA_SMS !== undefined &&
          pendingMessage.ACEITA_SMS === "SIM"
        ) {
          if (
            pendingMessage.CODIGO_TIPO_MENSAGEM == 1 &&
            pendingMessage.ACEITA_PROMOCOES === "NÃO"
          ) {
            MessageRepository.updateMessageStatus(
              pendingMessage.CODIGO_MENSAGEM,
              Constants.CHANNEL.noMarketing,
              ""
            );

            return;
          }

          //Send messages
          formattedNumber = Utils.formatNumber(pendingMessage.CELULAR);

          if (formattedNumber !== null) {
            //Send sms here
            response = await sendSMS(
              "+" + formattedNumber,
              Utils.formatUnicodeToEmojisInText(pendingMessage.SMS)
            ).catch((err) => {
              console.log(err);
            });
          } else
            response = {
              success: false,
              message: "The phone number is invalid",
            };

          if (response.success === false) {
            MessageRepository.updateMessageStatus(
              pendingMessage.CODIGO_MENSAGEM,
              Constants.CHANNEL.failed,
              device !== undefined && device !== null ? device.number : ""
            );

            Logger.error(response.message, "SmsScheduler.processQueue()", {
              senderNumber: SENDER,
              targetNumber: Utils.isEmpty(pendingMessage.CELULAR)
                ? undefined
                : pendingMessage.CELULAR.trim(),
              formattedTargetNumber: formattedNumber,
              messageId: pendingMessage.CODIGO_MENSAGEM,
              messageRegisterDate: pendingMessage.DATA_CADASTRO,
              messageTypeCode: pendingMessage.CODIGO_TIPO_MENSAGEM,
              pendingMessageCompany: pendingMessage.CODIGO_EMPRESA,
              status: "failed",
            });
          } else {
            MessageRepository.updateMessageStatus(
              pendingMessage.CODIGO_MENSAGEM,
              Constants.CHANNEL.sentViaSMS,
              "huawei"
            );

            Logger.info(pendingMessage.SMS, "SmsScheduler.processQueue()", {
              senderNumber: SENDER,
              targetNumber: Utils.isEmpty(pendingMessage.CELULAR)
                ? undefined
                : pendingMessage.CELULAR.trim(),
              formattedTargetNumber: formattedNumber,
              messageId: pendingMessage.CODIGO_MENSAGEM,
              messageRegisterDate: pendingMessage.DATA_CADASTRO,
              messageTypeCode: pendingMessage.CODIGO_TIPO_MENSAGEM,
              pendingMessageCompany: pendingMessage.CODIGO_EMPRESA,
              status: "success",
            });
          }
        }
      }
    } else {
      global.smsScheduledQueue = [];
    }
  } catch (err) {
    console.log(err);
    Logger.error(err, "SmsScheduler.processQueue()", {});
  }
}

/*
 * Main
 */
const SmsScheduler = {
  start: async function () {
    console.log(BASE + "Starting sms scheduler...");
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
      if (global.smsIntervalEvent === null) {
        global.smsIntervalEvent = setInterval(processQueue, intervalCount);
        console.log(BASE + " Message interval event has been started");
      } else {
        clearInterval(global.smsIntervalEvent);
        global.smsIntervalEvent = setInterval(processQueue, intervalCount);
        console.log(BASE + " Message interval event has been re-started");
      }

      global.eventSessionInfo.smsIntervalEventTime = intervalCount;
      console.log(BASE + "Scheduler is running..." + intervalCount + "]");
    }
  },
  stop: function () {
    console.log(BASE + "Stopping message scheduler and emptying queue...");
    global.smsScheduledQueue = [];
    clearInterval(global.smsIntervalEvent);

    global.smsIntervalEvent = null;
  },
  sendSMS: sendSMS,
};

module.exports = SmsScheduler;
