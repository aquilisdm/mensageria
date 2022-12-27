const express = require("express");
const router = express.Router();

router.get("/checkServerHealth",function(req,res,next) {
    return res.json({status:"OK"});
});


module.exports = router;