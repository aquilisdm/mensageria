const express = require("express");
const router = express.Router();
const CompanyService = require("./CompanyService");

router.get("/getCompanyById/:companyId",function(req,res,next) {
  CompanyService.getCompanyById(req.params.companyId)
  .then((companies) => {
   return res.json(companies);
 }).catch((err)=> { 
   console.log(err);
 })
})

router.get("/get", function (req, res, next) {
  CompanyService.getCompanies()
   .then((companies) => {
    return res.json(companies);
  }).catch((err)=> { 
    console.log(err);
  })
});

router.post("/create", function (req, res, next) {
  if (req.body.name !== undefined) {
    CompanyService.createCompany(req.body.name)
     .then((result) => {
      return res.json(result);
    }).catch((err)=> {
      console.log(err);
      return res.json({success:false,message:err});
    })
  } else {
    return res.json({
      success: false,
      message: "One or more body parts is missing",
    });
  }
});

module.exports = router;
