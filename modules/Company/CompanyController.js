const express = require("express");
const router = express.Router();
const CompanyService = require("./CompanyService");
const Logger = require("../../logic/Logger");
const Authentication = require("../../logic/Authentication");

router.get("/getCompanyById/:companyId", function (req, res, next) {
  CompanyService.getCompanyById(req.params.companyId)
    .then((companies) => {
      return res.json(companies);
    })
    .catch((err) => {
      var ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
      Logger.error(err, "/wp-company/getCompanyById/:companyId", { ip: ip });
      console.log(err);
    });
});

router.get("/get", function (req, res, next) {
  CompanyService.getCompanies()
    .then((companies) => {
      return res.json(companies);
    })
    .catch((err) => {
      console.log(err);
      Logger.error(err, "/wp-company/get", { ip: ip });
      return res.json([]);
    });
});

router.post(
  "/create",
  Authentication.verifyTokenMiddleware,
  function (req, res, next) {
    if (req.body.name !== undefined) {
      CompanyService.createCompany(req.body.name)
        .then((result) => {
          return res.json(result);
        })
        .catch((err) => {
          console.log(err);
          Logger.error(err, "/wp-company/create", { ip: ip });
          return res.json({ success: false, message: err });
        });
    } else {
      return res.json({
        success: false,
        message: "One or more body parts is missing",
      });
    }
  }
);

module.exports = router;
