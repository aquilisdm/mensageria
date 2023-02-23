const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const Logger = require("../../logic/Logger");
const MessageRepository = require("./MessageRepository");
const { v4: uuidv4 } = require("uuid");
const ClientManager = require("../Client/ClientManager");
const EventEmitter = require("events");
const eventEmitter = new EventEmitter();
const Utils = require("../../logic/Utils");
eventEmitter.setMaxListeners(120);

eventEmitter.on("newClient", async function (clientId, userId) {
  if (
    global.clientMap[clientId] !== null &&
    global.clientMap[clientId] !== undefined
  ) {
    global.clientMap[clientId].on("disconnected", async () => {
      console.log(
        "Device has been disconnected " +
          clientId +
          " at " +
          new Date().toString()
      );

      Logger.info(
        clientId + " has been disconnected",
        "MessageService.eventEmitter",
        { userId: userId, clientId: clientId }
      );

      ClientManager.deleteClient(clientId);
      global.clientMap[clientId].removeAllListeners("disconnected");
      await global.clientMap[clientId].destroy();
      delete global.clientMap[clientId];
    });
  }
});

function establishOrCreateConnection(clientId) {
  return new Promise(async (resolve, reject) => {
    if (global.clientMap[clientId] === undefined) {
      global.clientMap[clientId] = ClientManager.createClientSession(clientId);
      
      try {
        //Initialize the client
        await global.clientMap[clientId].initialize();
       
        resolve(true);
      } catch (err) {
        console.log(err);
        delete global.clientMap[clientId];
        resolve(false);
      }
    } else resolve(true);
  });
}

const MessageService = {
  sendWhatsAppMessage: function (clientId, number, message) {
    return new Promise(async (resolve, reject) => {
      try {
        if (await establishOrCreateConnection(clientId)) {
          let wpClientId = await global.clientMap[clientId].getNumberId(number);

          if (wpClientId !== null) {
            //Send message
            await global.clientMap[clientId].sendMessage(
              wpClientId._serialized,
              message
            );
            resolve({
              success: true,
              message: "Message was sent successfully!",
              code: 1,
            });
          } else {
            resolve({
              success: false,
              message: "This number is not registered in WhatsApp",
              code: 0,
            });
          }
        } else {
          resolve({
            success: false,
            message:
              "Message could not be sent due to an internal connection error",
            code: 1,
          });
        }
      } catch (err) {
        console.log(err);
        resolve({ success: false, message: err });
      }
    });
  },
  fetchMessageByNumber: function (params) {
    if (
      params.number !== undefined &&
      params.number.length <= 14 &&
      ((!Utils.isEmpty(params.channel) && params.channel.length <= 60) ||
        (!Utils.isEmpty(params.channel2) && params.channel2.length <= 60) ||
        (!Utils.isEmpty(params.channel3) && params.channel3.length <= 60))
    ) {
      if (
        Utils.isDate(new Date(params.startDate)) &&
        Utils.isDate(new Date(params.endDate))
      ) {
        let startDate = new Date(params.startDate);
        let endDate = new Date(params.endDate);

        let startDateArray = startDate.toLocaleDateString().split("/");
        let endDateArray = endDate.toLocaleDateString().split("/");
        params.startDate =
          startDateArray[2] +
          "-" +
          startDateArray[1] +
          "-" +
          startDateArray[0] +
          " " +
          startDate
            .toLocaleTimeString()
            .replace("PM", "")
            .replace("AM", "")
            .trim();

        params.endDate =
          endDateArray[2] +
          "-" +
          endDateArray[1] +
          "-" +
          endDateArray[0] +
          " " +
          endDate
            .toLocaleTimeString()
            .replace("PM", "")
            .replace("AM", "")
            .trim();
      }

      return MessageRepository.fetchMessageByNumber(params);
    } else
      return new Promise((resolve, reject) => {
        resolve([]);
      });
  },
  startConnection: function () {
    return new Promise(async (resolve, reject) => {
      resolve({ success: await establishOrCreateConnection() });
    });
  },
  endConnection: function (clientId) {
    return new Promise(async (resolve, reject) => {
      if (await establishOrCreateConnection(clientId)) {
        global.clientMap[clientId].destroy();
        global.clientMap[clientId] = undefined;
        resolve(true);
      } else {
        resolve(false);
      }
    });
  },
  logout: function (clientId) {
    return new Promise(async (resolve, reject) => {
      ClientManager.deleteClient(clientId);
      const timeout = setTimeout(() => {
        resolve(false);
      }, 5000);
      if (await establishOrCreateConnection(clientId)) {
        clearTimeout(timeout);
        global.clientMap[clientId].logout();
        global.clientMap[clientId] = undefined;
        resolve(true);
      } else {
        resolve(false);
      }
    });
  },
  getDeviceInfo: function (clientId) {
    return new Promise(async (resolve, reject) => {
      try {
        const timeout = setTimeout(() => {
          resolve({
            success: false,
            message:
              "ClientId hasn't been found or the device was disconnected...",
          });
        }, 5000);

        if (await establishOrCreateConnection(clientId)) {
          clearTimeout(timeout);
          let info = global.clientMap[clientId].info;
          resolve({ success: true, deviceInfo: info });
        } else {
          resolve({
            success: false,
            message:
              "ClientId hasn't been found or the device was disconnected...",
          });
        }
      } catch (err) {
        console.log(err);
        reject(err);
      }
    });
  },
  getChatMessagesByChatId: function (clientId, chatId) {
    return new Promise(async (resolve, reject) => {
      if (await establishOrCreateConnection(clientId)) {
        global.clientMap[clientId]
          .getChatById(chatId)
          .then(async (chat) => {
            if (chat !== null) {
              let messages = await chat.fetchMessages({
                fromMe: false,
                limit: 200,
              });
              resolve(messages);
            } else {
              console.log("No chat with this id was found");
              resolve([]);
            }
          })
          .catch((err) => {
            console.log(err);
            resolve([]);
          });
      } else {
        console.log(
          "Connection could not be established at getChatMessagesByChatId"
        );
        resolve([]);
      }
    });
  },
  getCurrentUserChats: function (clientId) {
    return new Promise(async (resolve, reject) => {
      if (await establishOrCreateConnection(clientId)) {
        global.clientMap[clientId]
          .getChats()
          .then((chats) => {
            resolve(chats);
          })
          .catch((err) => {
            resolve([]);
          });
      } else {
        resolve([]);
      }
    });
  },
  sendTextMessage: function (clientId, number, message) {
    return new Promise(async (resolve, reject) => {
      try {
        if (await establishOrCreateConnection(clientId)) {
          let wpClientId = await global.clientMap[clientId].getNumberId(number);

          if (wpClientId !== null) {
            //Send message
            await global.clientMap[clientId].sendMessage(
              wpClientId._serialized,
              message
            );
            resolve({
              success: true,
              message: "Message was sent successfully!",
              code: 1,
            });
          } else {
            resolve({
              success: false,
              message: "This number is not registered in WhatsApp",
              code: 0,
            });
          }
        } else {
          resolve({
            success: false,
            message:
              "Message could not be sent due to an internal connection error",
            code: 1,
          });
        }
      } catch (err) {
        console.log(err);
        resolve({ success: false, message: err });
      }
    });
  },
  authenticate: function (callback, userId, ip) {
    return new Promise(async (resolve, reject) => {
      try {
        const uniqueRandomID = uuidv4().replaceAll("-", "");

        const client = ClientManager.createClientSession(uniqueRandomID);

        client.on("qr", (qr) => {
          //Just in development
          //qrcode.generate(qr, { small: true });
          callback({ qr: qr, clientId: uniqueRandomID, ready: false });
        });

        client.on("ready", async () => {
          //console.log("Client is ready!");
          console.log("ID: " + uniqueRandomID);

          await ClientManager.setClientId(
            uniqueRandomID,
            client.info !== undefined ? client.info : {},
            userId,
            ip
          );

          //Save the connection
          global.clientMap[uniqueRandomID] = client;
          eventEmitter.emit("newClient", uniqueRandomID, userId);
          client.info.uniqueRandomID = uniqueRandomID;
          Logger.info(client.info, "MessageService.authenticate()");
          client.removeAllListeners("qr");
          client.removeAllListeners("ready");
          callback({ ready: true, clientId: uniqueRandomID });
        });

        client.initialize();
      } catch (err) {
        console.log(err);
        //client.destroy();
        resolve({ ready: false, message: err });
      }
    });
  },
};

module.exports = MessageService;
