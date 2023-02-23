//https://learn.microsoft.com/en-us/sql/connect/node-js/step-3-proof-of-concept-connecting-to-sql-using-node-js?view=sql-server-ver16
var Connection = require("tedious").Connection;
var Request = require("tedious").Request;
var TYPES = require("tedious").TYPES;

const config = {
  server: "mssql_producao_int.zapgrafica.com.br",
  authentication: {
    type: "default",
    options: {
      userName: "mensageria",
      password: "Mensageiro32@Zap",
    },
  },
  options: {
    // If you are on Microsoft Azure, you need encryption:
    encrypt: false,
    database: "graficamulti",
  },
};

const SQLServer = {
  getConnection: function () {
    var connection = new Connection(config);
    return connection;
  },
  formatResponse: function (columns) {
    let response = [];
    let object = {};
    
    if (Array.isArray(columns) && columns.length > 0 && columns[0] !== null) {
      columns.forEach((element) => {
        if (
          element.metadata !== undefined &&
          typeof element.metadata == "object" &&
          element.metadata.colName !== undefined &&
          element.value !== undefined
        ) {
          object[element.metadata.colName] = element.value;
        }
      });

      response.push(object);
      object = {};
      return response;
    } else return columns;
  },
};

module.exports = SQLServer;
