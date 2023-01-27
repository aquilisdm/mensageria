const uuid = require("uuid");
const MongoDB = require("../../logic/MongoDB");
const SQLServer = require("../../logic/SQLServer");
var TYPES = require("tedious").TYPES;
var Request = require("tedious").Request;

const CompanyRepository = {
  getCompanyById: function (id) {
    return new Promise((resolve, reject) => {
      const connection = SQLServer.getConnection();
      var result = [];
      connection.on("connect", function (err) {
        if (err) {
          reject(err);
        }
        // If no error, then good to proceed.
        let request = new Request(
          `select top 100 Mensageria.EMPRESAS_MENSAGERIA.CODIGO_EMPRESA as id,Mensageria.EMPRESAS_MENSAGERIA.NOME_EMPRESA as name from Mensageria.EMPRESAS_MENSAGERIA where CODIGO_EMPRESA = @id;`,
          function (err) {
            if (err) {
              console.log(err);
              reject(err);
            }
          }
        );

        request.on("row", function (columns) {
          columns = SQLServer.formatResponse(columns);
          if (Array.isArray(columns)) {
            columns.forEach(function (column) {
              if (column !== null) {
                result.push(column);
              }
            });
          }
        });

        request.on("requestCompleted", function (rowCount, more) {
          request.removeAllListeners("row");
          connection.close();
          resolve(result);
        });

        request.addParameter("id", TYPES.Int, id);

        connection.execSql(request);
      });

      connection.connect();
    });
  },
  getCompanies: function () {
    return new Promise((resolve, reject) => {
      const connection = SQLServer.getConnection();
      var result = [];
      connection.on("connect", function (err) {
        if (err) {
          reject(err);
        }
        // If no error, then good to proceed.
        let request = new Request(
          `select top 100 Mensageria.EMPRESAS_MENSAGERIA.CODIGO_EMPRESA as id,Mensageria.EMPRESAS_MENSAGERIA.NOME_EMPRESA as name from Mensageria.EMPRESAS_MENSAGERIA;`,
          function (err) {
            if (err) {
              console.log(err);
              reject(err);
            }
          }
        );

        request.on("row", function (columns) {
          columns = SQLServer.formatResponse(columns);
          if (Array.isArray(columns)) {
            columns.forEach(function (column) {
              if (column !== null) {
                result.push(column);
              }
            });
          }
        });

        request.on("requestCompleted", function (rowCount, more) {
          request.removeAllListeners("row");
          connection.close();
          resolve(result);
        });

        connection.execSql(request);
      });

      connection.connect();
    });
  },
  createCompany: function (name) {
    return new Promise((resolve, reject) => {
      const connection = SQLServer.getConnection();
      var result = [];
      connection.on("connect", function (err) {
        if (err) {
          reject(err);
        }
        // If no error, then good to proceed.
        let request = new Request(
          `insert into Mensageria.EMPRESAS_MENSAGERIA (NOME_EMPRESA) values ('@NOME_EMPRESA');`,
          function (err) {
            if (err) {
              console.log(err);
              reject(err);
            }
          }
        );

        request.addParameter("NOME_EMPRESA", TYPES.NVarChar, name);

        request.on("requestCompleted", function (rowCount, more) {
          connection.close();
          resolve(true);
        });
        
        connection.execSql(request);
      });

      connection.connect();
    });
  },
};

module.exports = CompanyRepository;
