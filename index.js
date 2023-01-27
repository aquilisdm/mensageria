const express = require("express");
const bodyParser = require("body-parser");
const session = require("express-session");
const dotEnv = require("dotenv");
const process = require("node:process");
const EventEmitter = require("events");
global.clientMap = {};
global.queue = [];
global.scheduledQueue = [];
global.eventEmitter = new EventEmitter();
global.eventEmitter.setMaxListeners(80);
const MessagesController = require("./modules/Messages/MessagesController");
const ClientController = require("./modules/Client/ClientController");
const UserController = require("./modules/User/UserController");
const ConfigController = require("./modules/Config/ConfigController");
const CompanyController = require("./modules/Company/CompanyController");
const cors = require("cors");
const MessageDispatcher = require("./service/MessageDispatcher");
const MessageScheduler = require("./service/MessageScheduler");
//Hermod
//Start server
//pm2 start index.js --name wpmsg

//Restart server
//pm2 restart [app id || app name]

//Stop server (Not recommend)
//pm2 stop [app id || app name]

//Solução do problema ao escanear o qr code
//https://github.com/Julzk/whatsapp-web.js/commit/668be3bd8442235530ee11f1cb397e929e2f670b

//nvm use v14.10.0
//https://docs.wwebjs.dev/Client.html#getChats
//https://wwebjs.dev/guide/#first-steps

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
      "Welcome to WhatsApp Manager API. See the documentation for more details",
  });
});

app.use("/wp-messages", MessagesController);
app.use("/wp-clients", ClientController);
app.use("/wp-users", UserController);
app.use("/wp-config", ConfigController);
app.use("/wp-company", CompanyController);

process.on("exit", (code) => {
  console.log(`About to exit with code: ${code}`);
  console.log(`Removing active listeners...`);
  console.log(`Emptying queue...`);
  global.eventEmitter.removeAllListeners("addMessage");
  global.eventEmitter.removeAllListeners("removeMessage");
  global.queue = [];
  global.scheduledQueue = [];
  MessageScheduler.stop();
});

app.listen(2000, function () {
  console.log("Starting server on", 2000);
  MessageScheduler.start();
});
