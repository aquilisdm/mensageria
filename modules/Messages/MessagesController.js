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
        MessageService.sendWhatsAppMessage(
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
  "/searchMessageByNumber",
  Authentication.verifyTokenMiddleware,
  function (req, res, next) {
    MessageService.fetchFilteredMessageQueue()
      .then((result) => {
        if (Array.isArray(result)) return res.json(result);
        else return res.json([]);
      })
      .catch((err) => {
        console.log(err);
        return res.json([]);
      });
  }
);

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
      msgs = msgs.filter((value) => {
        return value.CODIGO_EMPRESA === decoded.company;
      });

      writeServerSendEvent(res, sseId, JSON.stringify(msgs));
    });
  } else res.status(401).json({ success: false, message: "Token is invalid" });
});

router.post("/logout", function (req, res, next) {
  MessageService.logout(req.body.clientId)
    .then(() => {
      return res.json({ success: true });
    })
    .catch((err) => {
      let ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
      Logger.error(err, "logout", { ip: ip });
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
            Logger.error(err, "deviceInfo", {
              ip: ip,
              user: req.userData.userId,
            });
            return res.json({ success: false, message: err });
          });
      })
      .catch((rateLimiterRes) => {
        // Not enough points to consume
        Logger.info("Address: " + ip + " - " + rateLimiterRes, "deviceInfo", {
          ip: ip,
          user: req.userData.userId,
        });
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
        Logger.info(err, "getUserChatMessagesByChatId", {
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
          Logger.error(err, "getCurrentUserChats", {
            ip: ip,
          });
          return res.json([]);
        });
    })
    .catch((rateLimiterRes) => {
      console.log(rateLimiterRes);
      Logger.info(
        "Address: " + ip + " - " + rateLimiterRes,
        "getCurrentUserChats",
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
      .then(async (rateLimiterRes) => {
        if (validator.isLength(req.body.number, { min: 11, max: 13 })) {
          let resp = await MessageService.getNumberId(req.body.number,req.body.clientId);

          return res.json({
            success: resp.success,
            message: resp.message,
          });
        } else {
          return res.json({
            success: false,
            message: "Number format is invalid",
          });
        }
      })
      .catch((rateLimiterRes) => {
        console.log(rateLimiterRes);
        Logger.info(rateLimiterRes, "addTextMessageToQueue", {
          ip: ip,
          user: req.userData.userId,
        });
        // Not enough points to consume
        return res.status(204).json({
          success: false,
          message: "Too many requests",
        });
      });
  }
);

module.exports = router;
