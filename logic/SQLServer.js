//https://learn.microsoft.com/en-us/sql/connect/node-js/step-3-proof-of-concept-connecting-to-sql-using-node-js?view=sql-server-ver16
var Connection = require("tedious").Connection;

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
var Request = require("tedious").Request;
var TYPES = require("tedious").TYPES;

function executeStatement() {
  request = new Request(
    "SELECT c.CustomerID, c.CompanyName,COUNT(soh.SalesOrderID) AS OrderCount FROM SalesLT.Customer AS c LEFT OUTER JOIN SalesLT.SalesOrderHeader AS soh ON c.CustomerID = soh.CustomerID GROUP BY c.CustomerID, c.CompanyName ORDER BY OrderCount DESC;",
    function (err) {
      if (err) {
        //console.log(err);
      }
    }
  );
  var result = "";
  request.on("row", function (columns) {
    columns.forEach(function (column) {
      if (column.value === null) {
        //console.log("NULL");
      } else {
        result += column.value + " ";
      }
    });
    //console.log(result);
    result = "";
  });

  request.on("done", function (rowCount, more) {
    //console.log(rowCount + " rows returned");
  });

  // Close the connection after the final event emitted by the request, after the callback passes
  request.on("requestCompleted", function (rowCount, more) {
    connection.close();
  });
  connection.execSql(request);
}

function executeStatement1() {
  var request = new Request(
    "INSERT SalesLT.Product (Name, ProductNumber, StandardCost, ListPrice, SellStartDate) OUTPUT INSERTED.ProductID VALUES (@Name, @Number, @Cost, @Price, CURRENT_TIMESTAMP);",
    function (err) {
      if (err) {
        //console.log(err);
      }
    }
  );
  request.addParameter("Name", TYPES.NVarChar, "SQL Server Express 2014");
  request.addParameter("Number", TYPES.NVarChar, "SQLEXPRESS2014");
  request.addParameter("Cost", TYPES.Int, 11);
  request.addParameter("Price", TYPES.Int, 11);
  request.on("row", function (columns) {
    columns.forEach(function (column) {
      if (column.value === null) {
        //console.log("NULL");
      } else {
        //console.log("Product id of inserted item is " + column.value);
      }
    });
  });

  // Close the connection after the final event emitted by the request, after the callback passes
  request.on("requestCompleted", function (rowCount, more) {
    connection.close();
  });
  connection.execSql(request);
}

const SQLServer = {
  getConnection: function () {
    var connection = new Connection(config);
    //connection.connect();
    return connection;
  },
  formatResponse: function (columns) {
    let response = [];
    let object = {};
    
    if (Array.isArray(columns) && columns.length > 0 && columns[0] !== null) {
      //console.log("\nTO FORMAT LENGTH: "+columns.length);
      columns.forEach((element) => {
        if (
          element.metadata !== undefined &&
          typeof element.metadata == "object" &&
          element.metadata.colName !== undefined &&
          element.value !== undefined
        ) {
          //console.log(element.metadata.colName);
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
