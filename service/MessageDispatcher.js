/*
 * Imports
 */
const MongoDB = require("../logic/MongoDB");
const EventEmitter = require("events");
const MessageService = require("../modules/Messages/MessageService");
const Logger = require("../logic/Logger");
const { v4: uuidv4 } = require("uuid");
/*
 * Declarations
 */
const MAX_ITERATIONS_PER_MINUTE = 400;
var queue = [];
var interval = null;
var eventEmitter = new EventEmitter();
/*
 * Events
 */
eventEmitter.on("addMessage", (msg) => {
  if (msg !== undefined && msg !== null) {
    msg.id = uuidv4(); //Unique random id
    queue.push(msg);
    saveMessage(msg);
  }
});

eventEmitter.on("removeMessage", (msg) => {
  if (msg !== undefined && msg !== null) {
    queue = queue.filter((value) => {
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
}

async function updateMessageStatus(id, status) {
  let client = await MongoDB.getDatabase();
  const database = client.db(MongoDB.dbName);
  const collection = database.collection("message_logs");
  await collection.updateOne({ id: id }, { $set: { status: status } });
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
    date: new Date().toISOString(),
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
  let thisQueue = queue;
  let i = 0;
  let response;

  while (i < MAX_ITERATIONS_PER_MINUTE && i < thisQueue.length) {
    response = await MessageService.sendTextMessage(
      thisQueue[i].clientId,
      thisQueue[i].number,
      thisQueue[i].message
    );

    if (!response.success) {
      updateMessageStatus(thisQueue[i].id, "failed");
    } else {
      removeMessage(thisQueue[i].id);
    }

    i++;
  }
}
/*
 * Main
 */
const MessageDispatcher = {
  restart: async function () {
    let pendingMessages = await fetchMessagesByStatus("pending");

    if (pendingMessages !== null && pendingMessages.length > 0) {
      queue = pendingMessages;
    }

    if (internal !== null) {
      clearTimeout(internal);
    }
    internal = setInterval(processQueue, 60000);
  },
  start: async function () {
    if (internal === null) {
      let pendingMessages = await fetchMessagesByStatus("pending");

      if (pendingMessages !== null && pendingMessages.length > 0) {
        queue = pendingMessages;
      }
      internal = setInterval(processQueue, 60000);
    }
  },
  stop: function () {
    queue = [];
    clearTimeout(internal);
  },
  size: function () {
    return queue.length;
  },
};

module.exports = MessageDispatcher;
