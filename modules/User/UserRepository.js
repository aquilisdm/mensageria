const MongoDB = require("../../logic/MongoDB");
const Logger = require("../../logic/Logger");
const { v4: uuidv4 } = require("uuid");
const SQLServer = require("../../logic/SQLServer");
var TYPES = require("tedious").TYPES;
var Request = require("tedious").Request;

const UserRepository = {
  findUsers: function () {
    return new Promise((resolve, reject) => {
      const connection = SQLServer.getConnection();
      var result = [];
      connection.on("connect", function (err) {
        if (err) {
          Logger.error(err, "UserRepository.findUsers()", {});
          reject(err);
        }
        // If no error, then good to proceed.
        let request = new Request(
          `select top 500 Mensageria.USUARIOS_MENSAGERIA.CODIGO_USUARIO as id,
          Mensageria.USUARIOS_MENSAGERIA.NOME_USUARIO as name,
          Mensageria.USUARIOS_MENSAGERIA.SENHA as password,
          Mensageria.USUARIOS_MENSAGERIA.CODIGO_EMPRESA as company
          from Mensageria.USUARIOS_MENSAGERIA;`,
          function (err) {
            if (err) {
              console.log(err);
              Logger.error(err, "UserRepository.findUsers()", {});
              reject(err);
            }
          }
        );

        request.on("row", function (columns) {
          columns = SQLServer.formatResponse(columns);
          if (Array.isArray(columns)) {
            columns.forEach(function (column) {
              if (column.id !== null) {
                result.push(column);
              }
            });
          }
        });

        request.on("requestCompleted", function (rowCount, more) {
          connection.close();
          resolve(result);
        });

        request.addParameter("id", TYPES.Int, id);

        connection.execSql(request);
      });
      connection.connect();
    });
  },
  findUsersByName: function (name) {
    return new Promise((resolve, reject) => {
      const connection = SQLServer.getConnection();
      var result = [];
      connection.on("connect", function (err) {
        if (err) {
          Logger.error(err, "UserRepository.findUsersByName()", {});
          reject(err);
        }
        // If no error, then good to proceed.
        let request = new Request(
          `select top 100 Mensageria.USUARIOS_MENSAGERIA.CODIGO_USUARIO as id,
          Mensageria.USUARIOS_MENSAGERIA.NOME_USUARIO as name,
          Mensageria.USUARIOS_MENSAGERIA.SENHA as password,
          Mensageria.USUARIOS_MENSAGERIA.CODIGO_EMPRESA as company
          from Mensageria.USUARIOS_MENSAGERIA where Mensageria.USUARIOS_MENSAGERIA.NOME_USUARIO = '${name}';`,
          function (err) {
            if (err) {
              console.log(err);
              Logger.error(err, "UserRepository.findUsersByName()", {});
              reject(err);
            }
          }
        );

        request.on("row", function (columns) {
          columns = SQLServer.formatResponse(columns);
          if (Array.isArray(columns)) {
            columns.forEach(function (column) {
              if (column.id !== null) {
                result.push(column);
              }
            });
          }
        });

        request.on("requestCompleted", function (rowCount, more) {
          connection.close();
          resolve(result);
        });

        connection.execSql(request);
      });

      connection.connect();
    });
  },
  findUsersById: function (id) {
    return new Promise((resolve, reject) => {
      const connection = SQLServer.getConnection();
      var result = [];
      connection.on("connect", function (err) {
        if (err) {
          Logger.error(err, "UserRepository.findUsersById()", {});
          reject(err);
        }
        // If no error, then good to proceed.
        let request = new Request(
          `select top 1 Mensageria.USUARIOS_MENSAGERIA.CODIGO_USUARIO as id,
          Mensageria.USUARIOS_MENSAGERIA.NOME_USUARIO as name,
          Mensageria.USUARIOS_MENSAGERIA.SENHA as password,
          Mensageria.USUARIOS_MENSAGERIA.CODIGO_EMPRESA as company
          from Mensageria.USUARIOS_MENSAGERIA where Mensageria.USUARIOS_MENSAGERIA.CODIGO_USUARIO = @id;`,
          function (err) {
            if (err) {
              console.log(err);
              Logger.error(err, "UserRepository.findUsersById()", {});
              reject(err);
            }
          }
        );

        request.on("row", function (columns) {
          columns = SQLServer.formatResponse(columns);
          if (Array.isArray(columns)) {
            columns.forEach(function (column) {
              if (column.id !== null) {
                result.push(column);
              }
            });
          }
        });

        request.on("requestCompleted", function (rowCount, more) {
          connection.close();
          resolve(result);
        });

        request.addParameter("id", TYPES.Int, id);

        connection.execSql(request);
      });

      connection.connect();
    });
  },
  createUser: function (name, password, company) {
    return new Promise((resolve, reject) => {
      const connection = SQLServer.getConnection();
      var result = [];
      connection.on("connect", function (err) {
        if (err) {
          Logger.error(err, "UserRepository.createUser()", {
            name: name,
            password: password,
            company: company,
          });
          resolve({ success: false, message: err });
        }
        // If no error, then good to proceed.
        let request = new Request(
          `insert into Mensageria.USUARIOS_MENSAGERIA (NOME_USUARIO,CODIGO_EMPRESA,SENHA) values ('${name}',@CODIGO_EMPRESA,'${password}');`,
          function (err) {
            if (err) {
              console.log(err);
              Logger.error(err, "UserRepository.createUser()", {
                name: name,
                password: password,
                company: company,
              });
              resolve({ success: false, message: err });
            }
          }
        );

        request.addParameter("CODIGO_EMPRESA", TYPES.Int, company);
        //request.addParameter("SENHA", TYPES.NVarChar, password);

        request.on("requestCompleted", function (rowCount, more) {
          connection.close();
          resolve({ success: true });
        });

        connection.execSql(request);
      });

      connection.connect();
    });
  },
};

module.exports = UserRepository;
