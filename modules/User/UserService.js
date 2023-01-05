const UserRepository = require("./UserRepository");
const bcrypt = require("bcrypt-nodejs");
const validator = require("validator");

function formatResponse(type, logger) {
  var res = { state: type, message: null, logger: logger };
  switch (type) {
    case UserService.TYPE.response.ALREADY_EXISTS:
      res.message = "This username is already taken";
      return res;

    case UserService.TYPE.response.ERROR:
      res.message =
        "The user could not be created due to an internal error, please check 'logger' for more details...";
      return res;

    case UserService.TYPE.response.PENDING:
      res.message =
        "The user account is being processed, please wait until it's completed...";
      return res;

    case UserService.TYPE.response.TOO_MANY_CHARS:
      res.message = "You reached the max number of characters...";
      return res;

    default:
      return res;
  }
}

const UserService = {
  TYPE: {
    response: {
      ALREADY_EXISTS: 0,
      OK: 1,
      ERROR: 2,
      PENDING: 3,
      TOO_MANY_CHARS: 4,
    },
  },
  findUsers: function () {
    return UserRepository.findUsers();
  },
  findUsersByName: function (name) {
    return UserRepository.findUsersByName(name);
  },
  findUsersById: function (id) {
    return UserRepository.findUsersById(name);
  },
  createUser: function (name, password, company) {
    return new Promise(async (resolve, reject) => {
      if (
        validator.isLength(name, { min: 1, max: 100 }) &&
        validator.isLength(password, { min: 1, max: 100 }) &&
        validator.isLength(company, { min: 1, max: 500 })
      ) {
        name = validator.escape(name);
        password = validator.escape(password);
        company = validator.escape(company);

        let users = await UserRepository.findUsersByName(name);

        if (users !== null && users.length > 0) {
          resolve(
            formatResponse(UserService.TYPE.response.ALREADY_EXISTS, null)
          );
        } else {
          try {
            let hashedPassword = bcrypt.hashSync(
              password,
              bcrypt.genSaltSync(10)
            );
            await UserRepository.createUser(name, hashedPassword, company);
            resolve(formatResponse(UserService.TYPE.response.OK, null));
          } catch (err) {
            console.log(err);
            resolve(formatResponse(UserService.TYPE.response.ERROR, err));
          }
        }
      } else {
        resolve(formatResponse(UserService.TYPE.response.TOO_MANY_CHARS, err));
      }
    });
  },
};

module.exports = UserService;
