const MessageRepository = require("../modules/Messages/MessageRepository");
const MessageUtils = require("./logic/MessageUtils");
const Logger = require("../logic/Logger");
const Utils = require("../logic/Utils");
const Constants = require("../logic/Constants");
const https = require("https");
const url = require("url");
const crypto = require("crypto");
const util = require("util");
const querystring = require("querystring");
const BASE = "SmsScheduler:";
var realUrl =
  "https://smsapi.ap-southeast-1.myhuaweicloud.com:443/sms/batchSendDiffSms/v1"; //Application access address and API access URI
const SENDER = "smsapp0000000259";

var monitorIntervalEvent = null;
var intervalCount = null;
var queryInterval = null;
var statusCallBack = "";

/*
 * Functions
 */

function extractTemplateParamsFromRawText(text, messageType) {
  try {
    if (messageType !== null && text !== null) {
      let params = [];
      switch (messageType.trim()) {
        case "Arte não conforme":
          params.push(text.split("-")[0].split("Item")[1].trim());
          params.push(split("-")[1].split("está")[0].trim());
          return;

        case "Disponível na base":
          params.push(text.split("contém item")[0].split("pedido")[1].trim());
          return;

        case "Nota fiscal emitida":
          params.push(
            text.split("seu pedido")[1].split("foi emitida")[0].trim()
          );
          return;

        case "Pagamento confirmado":
          params.push(text.split("em")[0].split("seu pedido")[1].trim()); //first var
          params.push(text.split("em")[1].split("foi CONFIRMADO")[0].trim()); //second var
          return params;

        case "Cadastro aprovado":
          params.push(text.split("Parabéns")[0].split("!")[0].trim());
          return params;

        default:
          return ["",""];
          break;
      }
    }
  } catch (err) {
    console.log(err);
    return ["",""];
  }

  return ["",""];
}

function initDiffSms(receiver, templateId, templateParas, signature) {
  if (null !== signature && signature.length > 0) {
    return {
      to: receiver,
      templateId: templateId,
      templateParas: templateParas,
      signature: signature,
    };
  }
  return { to: receiver, templateId: templateId, templateParas: templateParas };
}

function buildWsseHeader(appKey, appSecret) {
  var crypto = require("crypto");
  var util = require("util");

  var time = new Date(Date.now()).toISOString().replace(/.[0-9]+\Z/, "Z"); //Created
  var nonce = crypto.randomBytes(64).toString("hex"); //Nonce
  var passwordDigestBase64Str = crypto
    .createHash("sha256")
    .update(nonce + time + appSecret)
    .digest("base64"); //PasswordDigest

  return util.format(
    'UsernameToken Username="%s",PasswordDigest="%s",Nonce="%s",Created="%s"',
    appKey,
    passwordDigestBase64Str,
    nonce,
    time
  );
}

function sendSMS(receiver, templateId, templateParams) {
  return new Promise((resolve, reject) => {
    try {
      var urlobj = url.parse(realUrl); //Parse the realUrl character string and return a URL object.

      var options = {
        host: urlobj.hostname, //Host name
        port: urlobj.port, //Port
        path: urlobj.pathname, //URI
        method: "POST", //The request method is POST.
        headers: {
          //Request headers
          "Content-Type": "application/json",
          Authorization:
            'WSSE realm="SDP",profile="UsernameToken",type="Appkey"',
          "X-WSSE": buildWsseHeader(
            Constants.HUAWEI_APP_KEY,
            Constants.HUAWEI_APP_SECRETE
          ),
        },
        rejectUnauthorized: false, //Ignore the certificate trust issues to prevent API calling failures caused by HTTPS certificate authentication failures.
      };

      var body = JSON.stringify({
        //Request body)
        from: SENDER,
        statusCallback: "",
        smsContent: [
          //smsContent. If the signature name is not required, set signature to null.
          initDiffSms(
            receiver,
            templateId,
            templateParams,
            Constants.HUAWEI_APP_SIGNATURE
          ),
        ],
      });

      var req = https.request(options, (res) => {
        console.log("statusCode:", res.statusCode); //The response code is recorded.

        res.setEncoding("utf8"); //Set the response data encoding format.
        res.on("data", (d) => {
          console.log("resp:", d); //The response data is recorded.

          /*
          Example response
          {"result":[{"originTo":"+5531996934484","createTime":"2023-03-02T12:16:10Z","from":"smsapp0000000259","smsMsgId":"98c7a3f6-b1b2-4dd7-9ce7-6b8ba0e2c269_3266164","status":"000000"}],"code":"000000","description":"Success"}
          */

          if (
            res.statusCode == 200 &&
            d !== null &&
            d.description === "Success"
          ) {
            resolve({ success: true, responseMessage: d });
          } else resolve({ success: false, responseMessage: d });
        });
      });

      req.on("error", (e) => {
        console.error(e.message); //When a request error occurs, error details are recorded.
        resolve({ success: false });
      });

      req.write(body); //Send data in the request body.
      req.end(); //End the request.
    } catch (err) {
      console.log(err);
      resolve({ success: false });
    }
  });
}

function buildRequestBody(
  sender,
  receiver,
  templateId,
  templateParas,
  statusCallBack,
  signature
) {
  if (signature !== null && signature.length > 0) {
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
  var mongoClient = await MongoDB.getDatabase().catch((err) => {});

  try {
    if ((await MessageUtils.shouldSendSMS()) && mongoClient !== null) {
      const database = mongoClient.db(MongoDB.dbName);
      const collection = database.collection(
        MessageUtils.getMessageCollectionName()
      );

      let pendingMessage = await collection.findOneAndDelete(
        {},
        { sort: { _id: 1 } }
      );
      pendingMessage =
        pendingMessage !== null &&
        pendingMessage !== undefined &&
        typeof pendingMessage === "object"
          ? pendingMessage.value
          : null;

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
            if (
              pendingMessage.TEMPLATE_SMS_HUAWEI !== undefined &&
              pendingMessage.TEMPLATE_SMS_HUAWEI !== null
            ) {
              response = await sendSMS(
                "+" + formattedNumber,
                pendingMessage.TEMPLATE_SMS_HUAWEI,
                extractTemplateParamsFromRawText(pendingMessage.SMS,pendingMessage.NOME_TIPO_MENSAGEM)
              ).catch((err) => {
                console.log(err);
              });
            } else
              response = {
                success: false,
                message: "Template was not available",
              };
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
              targetNumber: Utils.isEmpty(pendingMessage.CELULAR)
                ? undefined
                : pendingMessage.CELULAR.trim(),
              formattedTargetNumber: formattedNumber,
              messageId: pendingMessage.CODIGO_MENSAGEM,
              messageRegisterDate: pendingMessage.DATA_CADASTRO,
              messageTypeCode: pendingMessage.CODIGO_TIPO_MENSAGEM,
              apiResponse: response.responseMessage,
              status: "failed",
            });
          } else {
            MessageRepository.updateMessageStatus(
              pendingMessage.CODIGO_MENSAGEM,
              Constants.CHANNEL.sentViaSMS,
              "huawei"
            );

            Logger.info(pendingMessage.SMS, "SmsScheduler.processQueue()", {
              targetNumber: Utils.isEmpty(pendingMessage.CELULAR)
                ? undefined
                : pendingMessage.CELULAR.trim(),
              formattedTargetNumber: formattedNumber,
              messageId: pendingMessage.CODIGO_MENSAGEM,
              messageRegisterDate: pendingMessage.DATA_CADASTRO,
              messageTypeCode: pendingMessage.CODIGO_TIPO_MENSAGEM,
              pendingMessageCompany: pendingMessage.CODIGO_EMPRESA,
              apiResponse: response.responseMessage,
              status: "success",
            });
          }
        }
      }
    }
  } catch (err) {
    console.log(err);
    Logger.error(err, "SmsScheduler.processQueue()", {});
  } finally {
    mongoClient.close();
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
      
      console.log(BASE + "Scheduler is running..." + intervalCount + "]");
    }
  },
  stop: function () {
    console.log(BASE + "Stopping message scheduler and emptying queue...");
    clearInterval(global.smsIntervalEvent);

    global.smsIntervalEvent = null;
  },
  sendSMS: sendSMS,
};

module.exports = SmsScheduler;
