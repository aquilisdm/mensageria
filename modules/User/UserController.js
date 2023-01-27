const express = require("express");
const router = express.Router();
const Authentication = require("../../logic/Authentication");
const bcrypt = require("bcrypt-nodejs");
const UserService = require("../User/UserService");
const validator = require("validator");
const { RateLimiterMemory } = require("rate-limiter-flexible");
const opts = {
  points: 500, // 500 points
  duration: 1, // Per second
};
const Logger = require("../../logic/Logger");

//root
//wpmanager@net2022
router.post("/login", async function (req, res, next) {
  try {
    if (req.body.username !== undefined && req.body.password !== undefined) {
      let result = await UserService.findUsersByName(
        validator.escape(req.body.username)
      );
      console.log(result.length);
      if (
        result !== undefined &&
        result.length > 0 &&
        bcrypt.compareSync(req.body.password, result[0].password)
      ) {
        return res.json({
          success: true,
          token: Authentication.generateToken(
            result[0].name,
            result[0].company,
            result[0].id
          ),
          message: "Authenticated successfully!",
          company: result[0].company,
          name: result[0].name,
        });
      } else {
        return res.json({
          success: false,
          message: "user or password is incorrect",
        });
      }
    } else {
      return res.json({
        success: false,
        message: "user or password is incorrect",
      });
    }
  } catch (err) {
    console.log(err);
    return res.json({
      success: false,
      message: "Internal error",
    });
  }
});

router.post("/register", function (req, res, next) {
  var ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
  if (ip == undefined || ip == null) {
    ip = req.headers["x-access-token"];
  }
  const rateLimiter = new RateLimiterMemory(opts);

  rateLimiter
    .consume(ip, 1) // consume 1 point
    .then((rateLimiterRes) => {
      // 1 point consumed
      if (
        req.body.username !== undefined &&
        req.body.password !== undefined &&
        req.body.company !== undefined
      ) {
        UserService.createUser(
          req.body.username,
          req.body.password,
          req.body.company
        )
          .then((p) => {
            return res.json({
              success: p.state === UserService.TYPE.response.OK,
              p: p,
            });
          })
          .catch((err) => {
            console.log(err);
            Logger.error(err, "/wp-users/register", { ip: ip });
          });
      } else {
        return res.json({
          success: false,
          message: "One or more body parts is missing...",
          p: {},
        });
      }
    })
    .catch((rateLimiterRes) => {
      Logger.error(rateLimiterRes, "/wp-users/register", { ip: ip });
      // Not enough points to consume
      return res.status(204).json({
        success: false,
        message: "Too many requests",
      });
    });
});

router.post("/validateUserToken", function (req, res, next) {
  try {
    if (Authentication.verifyToken(req.body.token) !== null) {
      return res.json({ success: true });
    } else {
      return res.json({ success: false });
    }
  } catch (err) {
    let ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
    console.log(err);
    Logger.error(err, "/wp-users/register", { ip: ip });
  }
});

module.exports = router;
