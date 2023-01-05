const express = require("express");
const router = express.Router();
const Authentication = require("../../logic/Authentication");
const MessageService = require("./MessageService.js");
const WinstonLogger = require("../../winston_logger");
const { RateLimiterMemory } = require("rate-limiter-flexible");
const opts = {
  points: 1200, // 1200 points
  duration: 1, // Per second
};
WinstonLogger.init();

function writeServerSendEvent(res, sseId, data) {
  res.write("id: " + sseId + "\n");
  res.write("data: " + data + "\n\n");
}

router.get("/", function (req, res, next) {
  return res.json({ message: "Message Endpoint" });
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
      console.log(err);
      WinstonLogger.logger.log("error", {
        level: "error",
        message: err,
        date: new Date().toUTCString(),
      });
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
            console.log(err);
            WinstonLogger.logger.log("error", {
              level: "error",
              message: err,
              date: new Date().toUTCString(),
              endpoint: "/messages/deviceInfo",
            });
            return res.json({ success: false, message: err });
          });
      })
      .catch((rateLimiterRes) => {
        // Not enough points to consume
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

  let decoded = Authentication.verifyToken(req.params.token);

  if (decoded !== null) {
    var sseId = new Date().toLocaleTimeString();

    MessageService.authenticate((response) => {
      writeServerSendEvent(res, sseId, JSON.stringify(response));
    }, decoded.userId);
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
        console.log(err);
        WinstonLogger.logger.log("error", {
          level: "error",
          message: err,
          date: new Date().toUTCString(),
          endpoint: "/messages/getUserChatMessagesByChatId",
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
          console.log(err);
          WinstonLogger.logger.log("error", {
            level: "error",
            message: err,
            date: new Date().toUTCString(),
            endpoint: "/messages/getCurrentUserChats",
          });
          return res.json([]);
        });
    })
    .catch((rateLimiterRes) => {
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
            WinstonLogger.logger.log("error", {
              level: "error",
              message: err,
              number:
                req.body.number !== undefined &&
                req.body.number + "".length < 500
                  ? req.body.number
                  : "0",
              clientId:
                req.body.clientId !== undefined &&
                req.body.clientId + "".length < 500
                  ? req.body.clientId
                  : "0",
              messageContent: req.body.message,
              date: new Date().toUTCString(),
              endpoint: "/messages/sendTextMessage",
            });

            return res.json({
              success: false,
              message: "Message could not be sent due to internal error",
            });
          });
      })
      .catch((rateLimiterRes) => {
        // Not enough points to consume
        return res.status(204).json({
          success: false,
          message: "Too many requests",
        });
      });
  }
);

module.exports = router;