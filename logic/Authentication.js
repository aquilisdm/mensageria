const Constants = require("./Constants");
const jwt = require('jsonwebtoken');

module.exports = {
  verifyToken: function (token) {
    let decoded = jwt.verify(token, Constants.PRIVATE_USER_KEY);
    return decoded;
  },
  verifyTokenMiddleware: function (req, res, next) {
    let token = req.headers["x-access-token"];
    let decoded = jwt.verify(token, Constants.PRIVATE_USER_KEY);
    if (decoded === undefined || decoded === null) {
      return res
        .status(401)
        .json({ success: false, message: "Token is invalid" });
    }

    req.userData = {
      user: decoded.user,
      company: decoded.company,
      userId: decoded.userId,
    };
    return next();
  },
  generateToken: function (user, company, userId) {
    return jwt.sign(
      { user: user, company: company, userId: userId },
      Constants.PRIVATE_USER_KEY
    );
  },
};
