const express = require("express");
const router = express.Router();
const ClientManager = require("./ClientManager");
const Authentication = require("../../logic/Authentication");

//Return client ids
router.get(
  "/get",
  Authentication.verifyTokenMiddleware,
  function (req, res, next) {
    try {
      ClientManager.getClients(req.userData.userId)
        .then((clients) => {
          return res.json(clients);
        })
        .catch((err) => {
          console.log(err);
        });
    } catch (err) {
      console.log(err);
    }
  }
);

module.exports = router;
