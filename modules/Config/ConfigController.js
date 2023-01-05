const express = require("express");
const router = express.Router();

router.get("/checkServerHealth",function(req,res,next) {
    return res.json({status:"OK"});
});

router.get("/getErrorLogs",function(req,res,next) {
    return res.json({});
});

module.exports = router;