const express = require("express");
const bodyParser = require("body-parser");
const session = require("express-session");
const dotEnv = require("dotenv");
const process = require("node:process");
const EventEmitter = require("events");
const cors = require("cors");
const Utils = require("./logic/Utils");
var cron = require("node-cron");
global.clientMap = {};
global.intervalEvent = null;
global.queryIntervalEvent = null;
global.smsIntervalEvent = null;
global.eventEmitter = new EventEmitter();
global.eventEmitter.setMaxListeners(500);
global.lastDeviceIndex = 0;
global.lastMarketingDeviceIndex = 0;

const MessagesController = require("./modules/Messages/MessagesController");
const MessageCore = require("./service/MessageCore");
const ClientController = require("./modules/Client/ClientController");
const UserController = require("./modules/User/UserController");
const ConfigController = require("./modules/Config/ConfigController");
const CompanyController = require("./modules/Company/CompanyController");
const DataManager = require("./service/DataManager");

//Hermod

//node version 16.x.x

//SMS Console
//https://www.huaweicloud.com/intl/en-us/product/msgsms.html

//https://support.huaweicloud.com/intl/en-us/devg-msgsms/sms_04_0008.html
//https://support.huaweicloud.com/intl/en-us/usermanual-msgsms/sms_03_0011.html
//https://developer.huawei.com/consumer/en/service/josp/agc/index.html#/unrealName
  
//https://developer.huawei.com/consumer/en/doc/start/api-0000001062522591
//https://console-intl.huaweicloud.com/msgsms/?region=ap-southeast-1&locale=en-us#/msgsms/overview

//Start server
//pm2 start ecosystem.config.js

//Restart server
//pm2 restart [app id || app name]

//Stop server (Not recommend)
//pm2 stop [app id || app name]

//Solução do problema ao escanear o qr code
//https://github.com/Julzk/whatsapp-web.js/commit/668be3bd8442235530ee11f1cb397e929e2f670b

//nvm use v14.10.0
//https://docs.wwebjs.dev/Client.html#getChats
//https://wwebjs.dev/guide/#first-steps
//https://wpmessager-fec1d.firebaseapp.com/
//Dominio
//https://whatsapp.simw.com.br/

//Start
//sudo screen -d -m -S wpmsg node index.js
var app = express();

//Config dotEnv file (.env)
dotEnv.config();
//Default content-type
app.use(bodyParser.json());
app.use(cors());
//Server session
app.use(
  session({
    secret: "wpmsg@16032021",
    resave: true,
    saveUninitialized: true,
    cookie: {
      httpOnly: true,
      secure: true,
    },
  })
);

app.use(function (req, res, next) {
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-Requested-With,content-type"
  );
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, OPTIONS, PUT, PATCH, DELETE"
  );
  res.setHeader("Access-Control-Allow-Credentials", true);
  next();
});

app.get("/", function (req, res, next) {
  //Main page
  return res.json({
    message:
      "Welcome to WhatsApp Manager API. Check the documentation for more details",
  });
});

app.use("/wp-messages", MessagesController);
app.use("/wp-clients", ClientController);
app.use("/wp-users", UserController);
app.use("/wp-config", ConfigController);
app.use("/wp-company", CompanyController);

var task = cron.schedule( 
  "0 24 * * *",
  () => {
    console.log("Running a job at 2:00 AM at America/Sao_Paulo timezone");
    MessageCore.stop();
    DataManager.stop();
    Utils.callGC();
    MessageCore.start();
    DataManager.start();
  },
  {
    scheduled: true,
    timezone: "America/Sao_Paulo",
  }
);

process.on("exit", (code) => {
  console.clear();
  console.log(`About to exit with code: ${code}`);
  console.log(`Removing active listeners...`);
  console.log(`Emptying queue...`);
  global.eventEmitter.removeAllListeners("addMessage");
  global.eventEmitter.removeAllListeners("removeMessage");
  global.eventEmitter.removeAllListeners("queueMove");
  MessageCore.stop();
  DataManager.stop();
  task.stop();
});

app.listen(2000, function () {
  console.log("Starting server on", 2000);
  MessageCore.start();
  DataManager.start();
  task.start();
});
