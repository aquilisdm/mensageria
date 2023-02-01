const MongoDB = require("../../logic/MongoDB");
const { Client, LocalAuth } = require("whatsapp-web.js");
const { MongoClient } = require("mongodb");
const SQLServer = require("../../logic/SQLServer");
const fs = require("node:fs");
const Logger = require("../../logic/Logger");
const Utils = require("../../logic/Utils");
var TYPES = require("tedious").TYPES;
var Request = require("tedious").Request;
// Connection URL
const url = "mongodb://127.0.0.1:27017/wpmessager?directConnection=true";
const client = new MongoClient(url);
const dbName = "wpmessager";

const ClientManager = {
  getClientsByCompanyId: function (id) {
    return new Promise((resolve, reject) => {
      const connection = SQLServer.getConnection();
      var result = [];
      connection.on("connect", function (err) {
        if (err) {
          reject(err);
        }
        // If no error, then good to proceed.
        let request = new Request(
          `select top 200 Mensageria.DISPOSITIVOS.CHAVE as clientId,Mensageria.DISPOSITIVOS.DEVICE_INFO as deviceInfo,Mensageria.DISPOSITIVOS.CODIGO_CADASTRADOR as userId from Mensageria.DISPOSITIVOS where CODIGO_EMPRESA = @id and ATIVO = 'SIM';`,
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
              if (
                column !== null &&
                column.clientId !== null &&
                Array.from(result).filter((value) => {
                  return value.clientId === column.clientId;
                }).length <= 0
              ) {
                if (Utils.isJson(column.deviceInfo)) {
                  column.deviceInfo = JSON.parse(column.deviceInfo);
                }
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
  deleteClient: function (clientId) {
    return new Promise((resolve, reject) => {
      const connection = SQLServer.getConnection();
      var result = [];
      connection.on("connect", function (err) {
        if (err) {
          reject(err);
        }
        // If no error, then good to proceed.
        let request = new Request(
          `delete Mensageria.DISPOSITIVOS where CHAVE = @chave`,
          function (err) {
            if (err) {
              console.log(err);
              reject(err);
            }
          }
        );

        request.addParameter("chave", TYPES.NVarChar, clientId);

        request.on("requestCompleted", function (rowCount, more) {
          connection.close();

          if (
            fs.existsSync(
              "/mnt/prod/wpmessager/.wwebjs_auth/session-" + clientId
            )
          ) {
            fs.rmdirSync(
              "/mnt/prod/wpmessager/.wwebjs_auth/session-" + clientId,
              { recursive: true, maxRetries: 500 }
            );
          }

          resolve(true);
        });

        connection.execSql(request);
      });

      connection.connect();
    });
  },
  setClientId: function (clientId, deviceInfo, userId, ip) {
    console.log(clientId);
    console.log(userId);
    console.log(ip);
    console.log(JSON.stringify(deviceInfo));
    return new Promise((resolve, reject) => {
      const connection = SQLServer.getConnection();
      var result = [];
      connection.on("connect", function (err) {
        if (err) {
          reject(err);
        }
        // If no error, then good to proceed.
        let request = new Request(
          `insert into Mensageria.DISPOSITIVOS (CELULAR,STATUS,CODIGO_CADASTRADOR,CODIGO_ALTERADOR,DATA_CADASTRO,DATA_ALTERACAO,IP,NOME_USUARIO_COMPUTADOR,CHAVE,ATIVO,DEVICE_INFO,CODIGO_EMPRESA) values (
            @CELULAR,@STATUS,@CODIGO_CADASTRADOR,@CODIGO_ALTERADOR,(select SYSDATETIME()),(select SYSDATETIME()),@IP,@NOME_USUARIO_COMPUTADOR,@CHAVE,@ATIVO,@DEVICE_INFO,(SELECT Mensageria.USUARIOS_MENSAGERIA.CODIGO_EMPRESA FROM Mensageria.USUARIOS_MENSAGERIA WHERE Mensageria.USUARIOS_MENSAGERIA.CODIGO_USUARIO = ${userId})
          );`,
          function (err) {
            if (err) {
              console.log(err);
              reject(err);
            }
          }
        );

        request.addParameter(
          "CELULAR",
          TYPES.NVarChar,
          deviceInfo !== undefined &&
            deviceInfo !== null &&
            deviceInfo.wid !== undefined
            ? deviceInfo.wid.user
            : "0"
        );
        request.addParameter("STATUS", TYPES.NVarChar, "ACTIVE");
        request.addParameter("CODIGO_CADASTRADOR", TYPES.Int, userId);
        request.addParameter("CODIGO_ALTERADOR", TYPES.Int, userId);
        request.addParameter("IP", TYPES.NVarChar, ip);
        request.addParameter(
          "NOME_USUARIO_COMPUTADOR",
          TYPES.NVarChar,
          deviceInfo !== undefined &&
            deviceInfo !== null &&
            deviceInfo.pushname !== undefined
            ? deviceInfo.pushname
            : "NOT AVAILABLE"
        );
        request.addParameter("CHAVE", TYPES.NVarChar, clientId);
        request.addParameter("ATIVO", TYPES.NVarChar, "SIM");
        request.addParameter(
          "DEVICE_INFO",
          TYPES.NVarChar,
          deviceInfo !== undefined && deviceInfo !== null
            ? JSON.stringify(deviceInfo)
            : ""
        );

        request.on("requestCompleted", function (rowCount, more) {
          connection.close();
          resolve(true);
        });

        connection.execSql(request);
      });

      connection.connect();
    });
  },
  getClients: function (id) {
    return new Promise((resolve, reject) => {
      const connection = SQLServer.getConnection();
      var result = [];
      connection.on("connect", function (err) {
        if (err) {
          reject(err);
        }
        // If no error, then good to proceed.
        let request = new Request(
          `select top 200 Mensageria.DISPOSITIVOS.CHAVE as clientId,Mensageria.DISPOSITIVOS.DEVICE_INFO as deviceInfo,Mensageria.DISPOSITIVOS.CODIGO_CADASTRADOR as userId from Mensageria.DISPOSITIVOS where CODIGO_CADASTRADOR = @id and ATIVO = 1;`,
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
              if (
                column !== null &&
                column.clientId !== null &&
                Array.from(result).filter((value) => {
                  return value.clientId === column.clientId;
                }).length <= 0
              ) {
                if (Utils.isJson(column.deviceInfo)) {
                  column.deviceInfo = JSON.parse(column.deviceInfo);
                }
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
  createClientSession: function (clientId) {
    const client = new Client({
      puppeteer: {
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-accelerated-2d-canvas",
          "--no-first-run",
          "--no-zygote",
          "--single-process", // <-- Only in Linux
          "--disable-gpu",
        ],
        headless: true,
      },
      authStrategy: new LocalAuth({ clientId: clientId }),
    });
    client.setMaxListeners(2048);
    return client;
  },
};

module.exports = ClientManager;
