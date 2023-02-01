const express = require("express");
const router = express.Router();
const Authentication = require("../../logic/Authentication");
const MessageService = require("./MessageService.js");
const Logger = require("../../logic/Logger");
const fs = require("node:fs");
const validator = require("validator");
const ClientManager = require("../Client/ClientManager");
const { RateLimiterMemory } = require("rate-limiter-flexible");
const opts = {
  points: 1200, // 1200 points
  duration: 1, // Per second
};

//String.fromCodePoint(parseInt("1F602",16));
//#$1F60A

function writeServerSendEvent(res, sseId, data) {
  res.write("id: " + sseId + "\n");
  res.write("data: " + data + "\n\n");
}

router.get("/", function (req, res, next) {
  return res.json({ message: "Message Endpoint" });
});

router.post("/searchMessageByNumber", function (req, res, next) {
  MessageService.fetchMessageByNumber({
    number: req.body.number,
    channel: req.body.channel, 
    startDate: req.body.startDate,
    endDate: req.body.endDate,
  })
    .then((result) => {
      if (Array.isArray(result)) return res.json(result);
      else return res.json([]);
    })
    .catch((err) => {
      console.log(err);
      return res.json([]);
    });
});

router.get("/listenToMessageQueue/:token", function (req, res, next) {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  var ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
  if (ip == undefined || ip == null) {
    ip = req.headers[req.params.token];
  }

  let decoded = Authentication.verifyToken(req.params.token);

  req.on("end", function () {
    console.log("End of request");
    eventEmitter.removeAllListeners("queueMove");
  });

  if (decoded !== null) {
    var sseId = new Date().toLocaleTimeString();
    global.eventEmitter.on("queueMove", function (msgs) {
      writeServerSendEvent(res, sseId, JSON.stringify(msgs));
    });
  } else res.status(401).json({ success: false, message: "Token is invalid" });
});

router.get("/startConnection/:clientId", function (req, res, next) {
  MessageService.startConnection(req.params.clientId)
    .then((response) => {
      return response;
    })
    .catch((err) => {
      return res.json({ success: false });
    });
});

router.post("/logout", function (req, res, next) {
  MessageService.logout(req.body.clientId)
    .then(() => {
      return res.json({ success: true });
    })
    .catch((err) => {
      let ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
      Logger.error(err, "/wp-messages/messages/logout", { ip: ip });
      return res.json({ success: false });
    });
});

router.get(
  "/deviceInfo/:clientId",
  Authentication.verifyTokenMiddleware,
  function (req, res, next) {
    var ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
    if (ip == undefined || ip == null) {
      ip = req.headers["x-access-token"];
    }

    const rateLimiter = new RateLimiterMemory(opts);
    rateLimiter
      .consume(ip, 1)
      .then((rateLimiterRes) => {
        MessageService.getDeviceInfo(req.params.clientId)
          .then((info) => {
            return res.json(info);
          })
          .catch((err) => {
            Logger.error(err, "/wp-messages/messages/deviceInfo", {
              ip: ip,
              user: req.userData.userId,
            });
            return res.json({ success: false, message: err });
          });
      })
      .catch((rateLimiterRes) => {
        // Not enough points to consume
        Logger.info(
          "Address: " + ip + " - " + rateLimiterRes,
          "/wp-messages/messages/deviceInfo",
          {
            ip: ip,
            user: req.userData.userId,
          }
        );
        return res.status(204).json({
          success: false,
          message: "Too many requests",
        });
      });
  }
);

router.get("/requestQR/:token", function (req, res, next) {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  var ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
  if (ip == undefined || ip == null) {
    ip = req.headers[req.params.token];
  }

  let decoded = Authentication.verifyToken(req.params.token);

  if (decoded !== null) {
    var sseId = new Date().toLocaleTimeString();

    MessageService.authenticate(
      (response) => {
        writeServerSendEvent(res, sseId, JSON.stringify(response));
      },
      decoded.userId,
      ip
    );
  } else res.status(401).json({ success: false, message: "Token is invalid" });
});

router.get(
  "/getUserChatMessagesByChatId/:clientId/:chatId",
  function (req, res, next) {
    MessageService.getChatMessagesByChatId(
      req.params.clientId,
      req.params.chatId
    )
      .then((messages) => {
        return res.json(messages);
      })
      .catch((err) => {
        let ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
        console.log(err);
        Logger.info(err, "/wp-messages/messages/getUserChatMessagesByChatId", {
          ip: ip,
          user: req.userData.userId,
        });
        return res.json([]);
      });
  }
);

router.get("/getUserChats/:clientId", function (req, res, next) {
  var ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
  if (ip == undefined || ip == null) {
    ip = req.headers["x-access-token"];
  }

  const rateLimiter = new RateLimiterMemory(opts);

  rateLimiter
    .consume(ip, 1)
    .then((rateLimiterRes) => {
      MessageService.getCurrentUserChats(req.params.clientId)
        .then((chats) => {
          return res.json(chats);
        })
        .catch((err) => {
          let ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
          console.log(err);
          Logger.error(
            err,
            "/wp-messages/wp-messages/messages/getCurrentUserChats",
            {
              ip: ip,
            }
          );
          return res.json([]);
        });
    })
    .catch((rateLimiterRes) => {
      console.log(rateLimiterRes);
      Logger.info(
        "Address: " + ip + " - " + rateLimiterRes,
        "/wp-messages/wp-messages/messages/getCurrentUserChats",
        { ip: ip }
      );
      // Not enough points to consume
      return res.status(204).json({
        success: false,
        message: "Too many requests",
      });
    });
});

router.post(
  "/sendTextMessage",
  Authentication.verifyTokenMiddleware,
  function (req, res, next) {
    var ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
    if (ip == undefined || ip == null) {
      ip = req.headers["x-access-token"];
    }

    const rateLimiter = new RateLimiterMemory(opts);

    rateLimiter
      .consume(ip, 1) // consume 1 point
      .then((rateLimiterRes) => {
        // 1 point consumed
        MessageService.sendTextMessage(
          req.body.clientId,
          req.body.number,
          req.body.message
        )
          .then((response) => {
            return res.json({
              success: response.success,
              message: response.message,
            });
          })
          .catch((err) => {
            console.log(err);
            Logger.error(
              err,
              "/wp-messages/wp-messages/messages/sendTextMessage",
              {
                ip: ip,
                user: req.userData.userId,
              }
            );

            return res.json({
              success: false,
              message:
                "Message could not be sent due to internal error, please check the logs for more details",
            });
          });
      })
      .catch((rateLimiterRes) => {
        Logger.info(
          "Address: " + ip + " - " + rateLimiterRes,
          "/wp-messages/messages/sendTextMessage",
          { ip: ip, user: req.userData.userId }
        );
        // Not enough points to consume
        return res.status(204).json({
          success: false,
          message: "Too many requests",
        });
      });
  }
);

router.post(
  "/addTextMessageToQueue",
  Authentication.verifyTokenMiddleware,
  function (req, res, next) {
    var ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
    if (ip == undefined || ip == null) {
      ip = req.headers["x-access-token"];
    }

    const rateLimiter = new RateLimiterMemory(opts);

    rateLimiter
      .consume(ip, 1) // consume 1 point
      .then((rateLimiterRes) => {
        if (
          validator.isLength(req.body.clientId, { min: 1, max: 32 }) &&
          fs.existsSync(
            "/mnt/prod/wpmessager/.wwebjs_auth/session-" + req.body.clientId
          )
        ) {
          global.eventEmitter.emit("addMessage", {
            clientId: req.body.clientId,
            number: req.body.number,
            message: req.body.message,
            ip: ip,
          });

          return res.json({
            success: true,
            message: "Your message was added to the queue",
          });
        } else {
          if (req.body.clientId.length == 32) {
            ClientManager.deleteClient(req.body.clientId);
          }
          return res.json({
            success: false,
            message:
              "The specified device is invalid or it may be disconnected, please make sure the device is properly connected to WhatsAppManager...",
          });
        }
      })
      .catch((rateLimiterRes) => {
        console.log(rateLimiterRes);
        Logger.info(
          "Address: " + ip + " - " + rateLimiterRes,
          "/wp-messages/messages/addTextMessageToQueue",
          { ip: ip, user: req.userData.userId }
        );
        // Not enough points to consume
        return res.status(204).json({
          success: false,
          message: "Too many requests",
        });
      });
  }
);

module.exports = router;
