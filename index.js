const express = require("express");
const bodyParser = require("body-parser");
const session = require("express-session");
const dotEnv = require("dotenv");
const EventEmitter = require("events");
global.eventEmitter = new EventEmitter();
const MessagesController = require("./modules/Messages/MessagesController");
const ClientController = require("./modules/Client/ClientController");
const UserController = require("./modules/User/UserController");
const ConfigController = require("./modules/Config/ConfigController");
const CompanyController = require("./modules/Company/CompanyController");
const cors = require("cors");
const MessageDispatcher = require("./service/MessageDispatcher");



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
  return res.json({ message: "Welcome to WhatsApp Manager API" });
});

app.use("/wp-messages", MessagesController);
app.use("/wp-clients", ClientController);
app.use("/wp-users", UserController);
app.use("/wp-config", ConfigController);
app.use("/wp-company", CompanyController);

app.listen(2000, function () {
  console.log("Starting server on", 2000);
  MessageDispatcher.start();
});
