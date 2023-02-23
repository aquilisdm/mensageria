/*
 * Imports
 */
const MongoDB = require("../logic/MongoDB");
const MessageService = require("../modules/Messages/MessageService");
const Logger = require("../logic/Logger");
const fs = require("node:fs");
const ClientManager = require("../modules/Client/ClientManager");
const { v4: uuidv4 } = require("uuid");
/*
 * Declarations
 */
const MAX_ITERATIONS_PER_MINUTE = 1024; //Maximum interactions per minute
var interval = null;

/*
 * Events
 */
global.eventEmitter.on("addMessage", (msg) => {
  if (msg !== undefined && msg !== null) {
    msg.id = uuidv4();
    global.queue.push(msg);
    saveMessage(msg);
  }
});

global.eventEmitter.on("removeMessage", (msg) => {
  if (msg !== undefined && msg !== null) {
    global.queue = global.queue.filter((value) => {
      return value.id !== msg.id;
    });

    removeMessage(msg.id);
  }
});

/*
 * Functions
*/
async function fetchMessagesByStatus(status) {
  let client = await MongoDB.getDatabase();
  const database = client.db(MongoDB.dbName);
  const collection = database.collection("message_logs");
  const findResult = await collection.find({ status: status }).toArray();
  client.close();

  return findResult;
}

async function updateMessageStatus(id, status, reason) {
  let client = await MongoDB.getDatabase();
  const database = client.db(MongoDB.dbName);
  const collection = database.collection("message_logs");
  await collection.updateOne({ id: id }, { $set: { status: status, reason: reason } });
  client.close();
}


async function updatePendingMessagesStatusByClientId(clientId, status) {
  let client = await MongoDB.getDatabase();
  const database = client.db(MongoDB.dbName);
  const collection = database.collection("message_logs");
  await collection.updateMany({ clientId: clientId, status: "pending" }, { $set: { status: status } });
  client.close();
}

async function saveMessage(message) {
  let client = await MongoDB.getDatabase();
  const database = client.db(MongoDB.dbName);
  const collection = database.collection("message_logs");

  await collection.insertOne({
    id: message.id,
    clientId: message.clientId,
    message: message.message,
    number: message.number,
    ip: message.ip,
    status: "pending",
    date: new Date().toString(),
  });

  client.close();
}

async function removeMessage(id) {
  let client = await MongoDB.getDatabase();
  const database = client.db(MongoDB.dbName);
  const collection = database.collection("message_logs");
  await collection.deleteMany({ id: id });
  client.close();
}

async function processQueue() {
  let thisQueue = Array.from(global.queue);
  let i = 0;
  let response;

  while (i < MAX_ITERATIONS_PER_MINUTE && i < thisQueue.length) {
    if (
      fs.existsSync(
        "/mnt/prod/wpmessager/.wwebjs_auth/session-" + thisQueue[i].clientId
      )
    ) {
      response = await MessageService.sendTextMessage(
        thisQueue[i].clientId,
        thisQueue[i].number,
        thisQueue[i].message
      );

      if (response.success === false) {
        updateMessageStatus(thisQueue[i].id, "failed",response.message);
      } else {
        updateMessageStatus(thisQueue[i].id, "sent",null);
      }
    } else {
      Logger.error(
        "The message could not be sent because the device was disconnected",
        "MessageDispatcher.processQueue()",
        {
          targetNumber: thisQueue[i].number,
          clientId: thisQueue[i].clientId,
          message: thisQueue[i].message,
        }
      );

      ClientManager.deleteClient(thisQueue[i].clientId);
      updatePendingMessagesStatusByClientId(thisQueue[i].clientId, "invalid_client");
    }

    //Remove message from memory global.queue
    global.queue.shift();

    i++;
  }

  thisQueue = [];
}

/*
 * Main
 */
const MessageDispatcher = {
  restart: async function () {
    console.log("Trying to restart message dispatcher...");
    let pendingMessages = await fetchMessagesByStatus("pending");

    if (
      pendingMessages !== undefined &&
      pendingMessages !== null &&
      pendingMessages.length > 0
    ) {
      global.queue = pendingMessages;
    }

    if (interval !== null) {
      clearTimeout(interval);
    }
    interval = setInterval(processQueue, 60000);

    console.log("Message dispatcher has been restarted...");
  },
  start: async function () {
    console.log("Starting message dispatcher...");
    if (interval === null) {
      let pendingMessages = await fetchMessagesByStatus("pending");

      if (
        pendingMessages !== undefined &&
        pendingMessages !== null &&
        pendingMessages.length > 0
      ) {
        global.queue = pendingMessages;
      }

      interval = setInterval(processQueue, 60000);

      console.log("Message dispatcher has been started");
    } else {
      clearTimeout(interval);
      interval = setInterval(processQueue, 60000);
      console.log("Message dispatcher has been re-started");
    }
  },
  stop: function () {
    console.log("Stopping message dispatcher...");
    global.queue = [];
    clearTimeout(interval);
  },
  size: function () {
    return global.queue.length;
  },
};

module.exports = MessageDispatcher;
