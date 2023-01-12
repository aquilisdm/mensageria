const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const Logger = require("../../logic/Logger");
const { v4: uuidv4 } = require("uuid");
const ClientManager = require("../Client/ClientManager");
const EventEmitter = require("events");
let eventEmitter = new EventEmitter();
var clientMap = {};

eventEmitter.on("newClient", function (clientId) {
  if (clientMap[clientId] !== null && clientMap[clientId] !== undefined) {
    clientMap[clientId].on("disconnected", () => {
      console.log("Device has been disconnected " + clientId);
      Logger.info(clientId + " has been disconnected", "MessageService.eventEmitter");

      ClientManager.deleteClient(clientId);
      clientMap[clientId] = undefined;
    });
  }
});

function establishOrCreateConnection(clientId) {
  return new Promise(async (resolve, reject) => {
    if (clientMap[clientId] === undefined) {
      clientMap[clientId] = ClientManager.createClientSession(clientId);

      try {
        //Initialize the client
        await clientMap[clientId].initialize();
        resolve(true);
      } catch (err) {
        console.log(err);
        resolve(false);
      }
    } else {
      resolve(true);
    }
  });
}

const MessageService = {
  startConnection: function () {
    return new Promise(async (resolve, reject) => {
      resolve({ success: await establishOrCreateConnection() });
    });
  },
  endConnection: function (clientId) {
    return new Promise(async (resolve, reject) => {
      if (await establishOrCreateConnection(clientId)) {
        clientMap[clientId].destroy();
        clientMap[clientId] = undefined;
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
        clientMap[clientId].logout();
        clientMap[clientId] = undefined;
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
          let info = clientMap[clientId].info;
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
        clientMap[clientId]
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
        clientMap[clientId]
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
          let wpClientId = await clientMap[clientId].getNumberId(number);

          if (wpClientId !== null) {
            //Send message
            await clientMap[clientId].sendMessage(
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
  authenticate: function (callback, userId) {
    return new Promise(async (resolve, reject) => {
      try {
        const uniqueRandomID = uuidv4().replaceAll("-", "");

        const client = ClientManager.createClientSession(uniqueRandomID);

        client.on("qr", (qr) => {
          // Generate and scan this code with your phone
          //qrcode.generate(qr, { small: true });
          callback({ qr: qr, clientId: uniqueRandomID, ready: false });
        });

        client.on("ready", () => {
          //console.log("Client is ready!");
          //console.log("ID: " + uniqueRandomID);
          ClientManager.setClientId(
            uniqueRandomID,
            client.info !== undefined ? client.info : {},
            userId
          );
          //Save the connection
          clientMap[uniqueRandomID] = client;
          eventEmitter.emit("newClient", uniqueRandomID);
          client.info.uniqueRandomID = uniqueRandomID;
          Logger.info(client.info, "MessageService.authenticate()");
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
