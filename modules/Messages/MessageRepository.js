const SQLServer = require("../../logic/SQLServer");
const Logger = require("../../logic/Logger");
const Utils = require("../../logic/Utils");
var TYPES = require("tedious").TYPES;
var Request = require("tedious").Request;

const MessageRepository = {
  fetchMessageModelByMessageTypeCode: function(code) {
    return new Promise((resolve, reject) => {
      const connection = SQLServer.getConnection();
      var result = [];
      connection.on("connect", function (err) {
        if (err) {
          Logger.error(err, "MessageRepository.fetchShouldSendSMS()", {});
          reject(err);
        }
        // If no error, then good to proceed.
        let request = new Request(
          `select * from Mensageria.MODELOS where CODIGO_TIPO_MENSAGEM = @code;`,
          function (err) {
            if (err) {
              Logger.error(err, "MessageRepository.fetchMessageModelByMessageTypeCode()", {});
              console.log(err);
              connection.close();
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
          connection.close();
          resolve(result);
        });
        request.addParameter("code", TYPES.Int, code);
        connection.execSql(request);
      });

      connection.connect();
    });
  },
  fetchFilteredMessageQueue: function () {
    return new Promise((resolve, reject) => {
      const connection = SQLServer.getConnection();
      var result = [];

      connection.on("connect", function (err) {
        if (err) {
          Logger.error(err, "MessageRepository.fetchMessageModelByMessageTypeCode()", {});
          reject(err);
        }
        // If no error, then good to proceed.
        let request = new Request(
          `SELECT top 10800
          M.CODIGO_MENSAGEM,
          M.CODIGO_PEDIDO,
          M.CODIGO_ITEM,
          M.CODIGO_PARCEIRO,
          M.CODIGO_CONTATO,
          M.CELULAR,
          M.DATA_AGENDADA,
          M.DATA_ENVIO,
          M.DATA_VALIDADE,
          M.NOME_CAMPANHA,
          
          M.WHATSAPP,
          M.SMS,
          M.CANAL,
          M.DATA_CADASTRO,
          M.CODIGO_EMPRESA,
          
          M.CODIGO_TIPO_MENSAGEM,
          TM.PRIORIDADE_ENVIO,
          PM.PERMITE,
          CP.WHATSAPP as ACEITA_WHATSAPP,
          CP.PROMOCOES as ACEITA_PROMOCOES,
          CP.SMS AS ACEITA_SMS
        FROM Mensageria.MENSAGENS_AGENDADAS M
        JOIN Mensageria.TIPO_MENSAGENS TM ON TM.CODIGO_TIPO_MENSAGEM = M.CODIGO_TIPO_MENSAGEM
        LEFT JOIN Mensageria.PERMITE_MARKETING PM ON PM.CODIGO_PARCEIRO = M.CODIGO_PARCEIRO
        JOIN Mensageria.CONTATOS_PERMISSOES CP ON CP.CODIGO_CONTATO = M.CODIGO_CONTATO
        WHERE
        M.DATA_VALIDADE >= CAST(GETDATE() AS DATE)
        AND M.DATA_AGENDADA <= GETDATE()
        AND (M.CODIGO_TIPO_MENSAGEM <> 1 OR PM.PERMITE = 'SIM')
        AND CAST(GETDATE() AS TIME) > TM.HORA_INICIO
        AND CAST(GETDATE() AS TIME) < TM.HORA_FINAL
        AND TM.COMERCIAL <> (IIF (DATEPART(weekday, GETDATE()) = 7 OR DATEPART(weekday, GETDATE()) = 1, 'SIM','XXX')) 
        ORDER BY TM.PRIORIDADE_ENVIO, M.DATA_AGENDADA;`,
          function (err) {
            if (err) {
              Logger.error(err, "MessageRepository.fetchMessageModelByMessageTypeCode()", {});
              console.log(err);
              connection.close();
              reject(err);
            }
          }
        );

        request.on("row", function (columns) {
          columns = SQLServer.formatResponse(columns);
          if (Array.isArray(columns)) {
            columns.forEach(function (column) {
              if (column.CODIGO_MENSAGEM !== null) {
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
  fetchShouldSendSMS: function () {
    return new Promise((resolve, reject) => {
      const connection = SQLServer.getConnection();
      var result = [];
      connection.on("connect", function (err) {
        if (err) {
          Logger.error(err, "MessageRepository.fetchShouldSendSMS()", {});
          reject(err);
        }
        // If no error, then good to proceed.
        let request = new Request(
          `select top 1 Mensageria.PARAMETROS.VALOR_PARAMETRO from Mensageria.PARAMETROS where Mensageria.PARAMETROS.NOME_PARAMETRO = 'ENVIO SMS';`,
          function (err) {
            if (err) {
              Logger.error(err, "MessageRepository.fetchShouldSendSMS()", {});
              console.log(err);
              connection.close();
              reject(err);
            }
          }
        );

        request.on("row", function (columns) {
          columns = SQLServer.formatResponse(columns);
          if (Array.isArray(columns)) {
            columns.forEach(function (column) {
              if (column.VALOR_PARAMETRO !== null) {
                result.push(column.VALOR_PARAMETRO);
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
  fetchClientBlockedMessages: function () {
    return new Promise((resolve, reject) => {
      const connection = SQLServer.getConnection();
      var result = [];

      connection.on("connect", function (err) {
        if (err) {
          Logger.error(err, "MessageRepository.fetchPendingMessages()", {});
          reject(err);
        }
        // If no error, then good to proceed.
        let request = new Request(
          `SELECT TOP 100
          M.CODIGO_MENSAGEM,
          M.CODIGO_PARCEIRO,
          M.WHATSAPP,
          M.SMS,
          M.CANAL,
          M.CELULAR,
          M.DATA_AGENDADA,
          M.DATA_CADASTRO,
          M.NOME_CAMPANHA,
          1 AS CODIGO_EMPRESA,
          M.DATA_ENVIO,
          M.CODIGO_TIPO_MENSAGEM,
          M.DATA_VALIDADE,
          TM.PRIORIDADE_ENVIO,
          PM.PERMITE,
          CP.WHATSAPP as ACEITA_WHATSAPP,
          CP.PROMOCOES as ACEITA_PROMOCOES, 
          CP.SMS AS ACEITA_SMS
        FROM Mensageria.MENSAGENS_AGENDADAS M
        JOIN Mensageria.TIPO_MENSAGENS TM ON TM.CODIGO_TIPO_MENSAGEM = M.CODIGO_TIPO_MENSAGEM
        LEFT JOIN Mensageria.PERMITE_MARKETING PM ON PM.CODIGO_PARCEIRO = M.CODIGO_PARCEIRO
        JOIN Mensageria.CONTATOS_PERMISSOES CP ON CP.CODIGO_CONTATO = M.CODIGO_CONTATO
        WHERE CANAL = 'AGUARDANDO ENVIO'
        AND M.DATA_VALIDADE >= CAST(GETDATE() AS DATE)
        AND CP.WHATSAPP = 'N??O'
        AND CP.SMS = 'N??O'
        AND M.DATA_AGENDADA <= GETDATE()
        AND (M.CODIGO_TIPO_MENSAGEM <> 1 OR PM.PERMITE = 'SIM')
        AND CAST(GETDATE() AS TIME) > TM.HORA_INICIO
        AND CAST(GETDATE() AS TIME) < TM.HORA_FINAL
        AND TM.COMERCIAL <> (IIF (DATEPART(weekday, GETDATE()) = 7 OR DATEPART(weekday, GETDATE()) = 1, 'SIM','XXX')) 
        ORDER BY TM.PRIORIDADE_ENVIO, M.DATA_AGENDADA;`,
          function (err) {
            if (err) {
              Logger.error(err, "MessageRepository.fetchPendingMessages()", {});
              console.log(err);
              connection.close();
              reject(err);
            }
          }
        );

        request.on("row", function (columns) {
          columns = SQLServer.formatResponse(columns);
          if (Array.isArray(columns)) {
            columns.forEach(function (column) {
              if (column.CODIGO_MENSAGEM !== null) {
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
  fetchPendingSmsMessages: function () {
    return new Promise((resolve, reject) => {
      const connection = SQLServer.getConnection();
      var result = [];

      connection.on("connect", function (err) {
        if (err) {
          Logger.error(err, "MessageRepository.fetchPendingSmsMessages()", {});
          reject(err);
        }
        // If no error, then good to proceed.
        let request = new Request(
          `SELECT TOP 900
          M.CODIGO_MENSAGEM,
          M.CODIGO_PARCEIRO,
          M.CODIGO_ITEM,
          M.WHATSAPP,
          M.SMS,
          M.CANAL,
          M.CELULAR,
          M.DATA_AGENDADA,
          M.DATA_CADASTRO,
          M.NOME_CAMPANHA,
          1 AS CODIGO_EMPRESA,
          M.DATA_ENVIO,
          M.CODIGO_TIPO_MENSAGEM,
          M.DATA_VALIDADE,
          M.VARIAVEIS_SMS,
          TM.PRIORIDADE_ENVIO,
          TM.TEMPLATE_SMS_HUAWEI,
          TM.NOME_TIPO_MENSAGEM,
          PM.PERMITE,
          CP.WHATSAPP as ACEITA_WHATSAPP,
          CP.PROMOCOES as ACEITA_PROMOCOES, 
          CP.SMS AS ACEITA_SMS
        FROM Mensageria.MENSAGENS_AGENDADAS M
        JOIN Mensageria.TIPO_MENSAGENS TM ON TM.CODIGO_TIPO_MENSAGEM = M.CODIGO_TIPO_MENSAGEM
        LEFT JOIN Mensageria.PERMITE_MARKETING PM ON PM.CODIGO_PARCEIRO = M.CODIGO_PARCEIRO
        JOIN Mensageria.CONTATOS_PERMISSOES CP ON CP.CODIGO_CONTATO = M.CODIGO_CONTATO
        WHERE (CANAL = 'AGUARDANDO ENVIO' or (M.CANAL = 'WHATSAPP' and M.CODIGO_TIPO_MENSAGEM = 2))
        AND TM.TEMPLATE_SMS_HUAWEI is not null
        AND M.DATA_VALIDADE >= CAST(GETDATE() AS DATE)
        AND CP.SMS = 'SIM'
        AND M.DATA_AGENDADA <= GETDATE()
        AND (M.CODIGO_TIPO_MENSAGEM <> 1 OR PM.PERMITE = 'SIM')
        AND CAST(GETDATE() AS TIME) > TM.HORA_INICIO
        AND CAST(GETDATE() AS TIME) < TM.HORA_FINAL
        AND TM.COMERCIAL <> (IIF (DATEPART(weekday, GETDATE()) = 7 OR DATEPART(weekday, GETDATE()) = 1, 'SIM','XXX')) 
        ORDER BY TM.PRIORIDADE_ENVIO, M.DATA_AGENDADA;`,
          function (err) {
            if (err) {
              Logger.error(err, "MessageRepository.fetchPendingMessages()", {});
              console.log(err);
              connection.close();
              reject(err);
            }
          }
        );

        request.on("row", function (columns) {
          columns = SQLServer.formatResponse(columns);
          if (Array.isArray(columns)) {
            columns.forEach(function (column) {
              if (column.CODIGO_MENSAGEM !== null) {
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
  fetchPendingWhatsAppMessages: function () { 
    return new Promise((resolve, reject) => {
      const connection = SQLServer.getConnection();
      var result = [];

      connection.on("connect", function (err) {
        if (err) {
          Logger.error(err, "MessageRepository.fetchPendingMessages()", {});
          reject(err);
        }
        // If no error, then good to proceed.
        let request = new Request(
          `SELECT TOP 100
          M.CODIGO_MENSAGEM,
          M.CODIGO_PARCEIRO,
          M.WHATSAPP,
          M.SMS,
          M.CANAL,
          M.CELULAR,
          M.DATA_AGENDADA,
          M.DATA_CADASTRO,
          M.NOME_CAMPANHA,
          1 AS CODIGO_EMPRESA,
          M.DATA_ENVIO,
          M.CODIGO_TIPO_MENSAGEM,
          M.DATA_VALIDADE,
          M.VARIAVEIS_WHATSAPP,
          TM.PRIORIDADE_ENVIO,
          PM.PERMITE,
          CP.WHATSAPP as ACEITA_WHATSAPP,
          CP.PROMOCOES as ACEITA_PROMOCOES, 
          CP.SMS AS ACEITA_SMS
        FROM Mensageria.MENSAGENS_AGENDADAS M
        JOIN Mensageria.TIPO_MENSAGENS TM ON TM.CODIGO_TIPO_MENSAGEM = M.CODIGO_TIPO_MENSAGEM
        LEFT JOIN Mensageria.PERMITE_MARKETING PM ON PM.CODIGO_PARCEIRO = M.CODIGO_PARCEIRO
        JOIN Mensageria.CONTATOS_PERMISSOES CP ON CP.CODIGO_CONTATO = M.CODIGO_CONTATO
        WHERE CANAL = 'AGUARDANDO ENVIO'
        AND CP.WHATSAPP = 'SIM'
        AND M.DATA_VALIDADE >= CAST(GETDATE() AS DATE)
        AND M.DATA_AGENDADA <= GETDATE()
        AND (M.CODIGO_TIPO_MENSAGEM <> 1 OR PM.PERMITE = 'SIM')
        AND CAST(GETDATE() AS TIME) > TM.HORA_INICIO
        AND CAST(GETDATE() AS TIME) < TM.HORA_FINAL
        AND TM.COMERCIAL <> (IIF (DATEPART(weekday, GETDATE()) = 7 OR DATEPART(weekday, GETDATE()) = 1, 'SIM','XXX')) 
        ORDER BY TM.PRIORIDADE_ENVIO, M.DATA_AGENDADA;`,
          function (err) {
            if (err) {
              Logger.error(
                err,
                "MessageRepository.fetchPendingWhatsAppMessages()",
                {}
              );
              console.log(err);
              connection.close();
              reject(err);
            }
          }
        );

        request.on("row", function (columns) {
          columns = SQLServer.formatResponse(columns);
          if (Array.isArray(columns)) {
            columns.forEach(function (column) {
              if (column.CODIGO_MENSAGEM !== null) {
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
  fetchMessageByNumber: function (params) {
    return new Promise((resolve, reject) => {
      const connection = SQLServer.getConnection();
      var result = [];

      if (Utils.isEmpty(params.channel)) {
        params.channel = "";
      } else {
        params.channel = `${" "} CANAL = '${params.channel}'`;
      }

      if (Utils.isEmpty(params.channel2)) {
        params.channel2 = "";
      } else {
        params.channel2 = `${" "} ${
          Utils.isEmpty(params.channel) ? "" : "or"
        } CANAL = '${params.channel2}'`;
      }

      if (Utils.isEmpty(params.channel3)) {
        params.channel3 = "";
      } else {
        params.channel3 = `${" "} ${
          Utils.isEmpty(params.channel2) ? "" : "or"
        } CANAL = '${params.channel3}'`;
      }

      connection.on("connect", function (err) {
        if (err) {
          Logger.error(err, "MessageRepository.fetchMessageByNumber()", {});
          reject(err);
        }
        // If no error, then good to proceed.
        let request = new Request(
          `
            SELECT TOP 150
            M.CODIGO_MENSAGEM,
            M.CODIGO_PARCEIRO,
            M.WHATSAPP,
            M.SMS,
            M.CANAL,
            M.CELULAR,
            M.DATA_CADASTRO,
            M.NOME_CAMPANHA,
            M.CODIGO_EMPRESA,
            M.DATA_ENVIO,
            M.CODIGO_TIPO_MENSAGEM,
            M.DATA_VALIDADE,
            TM.PRIORIDADE_ENVIO
          FROM Mensageria.MENSAGENS_AGENDADAS M
          JOIN Mensageria.TIPO_MENSAGENS TM ON TM.CODIGO_TIPO_MENSAGEM = M.CODIGO_TIPO_MENSAGEM
          WHERE M.CELULAR like '${params.number}%' and (
          ${params.channel}
          ${params.channel2}
          ${params.channel3}
          )
          ${
            params.startDate !== undefined && params.endDate !== undefined
              ? " and M.DATA_ENVIO >= '" +
                params.startDate +
                "' and M.DATA_ENVIO <= '" +
                params.endDate +
                "'"
              : ""
          }
          ${" "}
          ORDER BY M.DATA_ENVIO;`,
          function (err) {
            if (err) {
              Logger.error(err, "MessageRepository.fetchMessageByNumber()", {});
              console.log(err);
              connection.close();
              reject(err);
            }
          }
        );

        request.on("row", function (columns) {
          columns = SQLServer.formatResponse(columns);
          if (Array.isArray(columns)) {
            columns.forEach(function (column) {
              if (column.CODIGO_MENSAGEM !== null) {
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
  fetchSentMessagesCount: function () {
    return new Promise((resolve, reject) => {
      const connection = SQLServer.getConnection();
      var result = [];
      var currentDate = Utils.convertTZ(
        new Date(),
        "America/Sao_Paulo"
      ).toLocaleDateString();
      var date = Utils.convertTZ(new Date(), "America/Sao_Paulo");
      currentDate = currentDate.split("/");
      currentDate =
        currentDate[2] + "-" + currentDate[1] + "-" + currentDate[0];

      connection.on("connect", function (err) {
        if (err) {
          Logger.error(err, "MessageRepository.fetchSentMessagesCount()", {});
          reject(err);
        }
        // If no error, then good to proceed.
        let request = new Request(
          `select COUNT(Mensageria.MENSAGENS_AGENDADAS.CODIGO_MENSAGEM) as count from Mensageria.MENSAGENS_AGENDADAS
          where (Mensageria.MENSAGENS_AGENDADAS.CANAL='WHATSAPP') 
          and Mensageria.MENSAGENS_AGENDADAS.DATA_ENVIO >= DATEADD(HH, -1, GETDATE())`,
          function (err) {
            if (err) {
              Logger.error(
                err,
                "MessageRepository.fetchSentMessagesCount()",
                {}
              );
              console.log(err);
              connection.close();
              reject(err);
            }
          }
        );

        request.on("row", function (columns) {
          columns = SQLServer.formatResponse(columns);
          if (Array.isArray(columns)) {
            columns.forEach(function (column) {
              if (column.count !== null) {
                result.push(column.count);
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
  fetchMonitors: function () {
    return new Promise((resolve, reject) => {
      const connection = SQLServer.getConnection();
      var result = [];
      connection.on("connect", function (err) {
        if (err) {
          Logger.error(err, "MessageRepository.fetchMonitors()", {});
          reject(err);
        }
        // If no error, then good to proceed.
        let request = new Request(
          `select top 200 Mensageria.PARAMETROS.VALOR_PARAMETRO from Mensageria.PARAMETROS where Mensageria.PARAMETROS.NOME_PARAMETRO = 'MONITOR';`,
          function (err) {
            if (err) {
              Logger.error(err, "MessageRepository.fetchMonitors()", {});
              console.log(err);
              connection.close();
              reject(err);
            }
          }
        );

        request.on("row", function (columns) {
          columns = SQLServer.formatResponse(columns);
          if (Array.isArray(columns)) {
            columns.forEach(function (column) {
              if (column.VALOR_PARAMETRO !== null) {
                result.push(column.VALOR_PARAMETRO);
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
  fetchEndTime: function () {
    return new Promise((resolve, reject) => {
      const connection = SQLServer.getConnection();
      var result = [];
      connection.on("connect", function (err) {
        if (err) {
          Logger.error(err, "MessageRepository.fetchEndTime()", {});
          reject(err);
        }
        // If no error, then good to proceed.
        let request = new Request(
          `select top 1 Mensageria.PARAMETROS.VALOR_PARAMETRO from Mensageria.PARAMETROS where Mensageria.PARAMETROS.NOME_PARAMETRO = 'FIM DOS ENVIOS';`,
          function (err) {
            if (err) {
              Logger.error(err, "MessageRepository.fetchEndTime()", {});
              console.log(err);
              connection.close();
              reject(err);
            }
          }
        );

        request.on("row", function (columns) {
          columns = SQLServer.formatResponse(columns);
          if (Array.isArray(columns)) {
            columns.forEach(function (column) {
              if (column.VALOR_PARAMETRO !== null) {
                result.push(column.VALOR_PARAMETRO);
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
  fetchStartTime: function () {
    return new Promise((resolve, reject) => {
      const connection = SQLServer.getConnection();
      var result = [];
      connection.on("connect", function (err) {
        if (err) {
          Logger.error(err, "MessageRepository.fetchStartTime()", {});
          reject(err);
        }
        // If no error, then good to proceed.
        let request = new Request(
          `select top 1 Mensageria.PARAMETROS.VALOR_PARAMETRO from Mensageria.PARAMETROS where Mensageria.PARAMETROS.NOME_PARAMETRO = 'INICIO ENVIOS';`,
          function (err) {
            if (err) {
              Logger.error(err, "MessageRepository.fetchStartTime()", {});
              console.log(err);
              connection.close();
              reject(err);
            }
          }
        );

        request.on("row", function (columns) {
          columns = SQLServer.formatResponse(columns);
          if (Array.isArray(columns)) {
            columns.forEach(function (column) {
              if (column.VALOR_PARAMETRO !== null) {
                result.push(column.VALOR_PARAMETRO);
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
  fetchShouldSendWhatsApp: function () {
    return new Promise((resolve, reject) => {
      const connection = SQLServer.getConnection();
      var result = [];
      connection.on("connect", function (err) {
        if (err) {
          Logger.error(err, "MessageRepository.fetchShouldSendWhatsApp()", {});
          reject(err);
        }
        // If no error, then good to proceed.
        let request = new Request(
          `select top 1 Mensageria.PARAMETROS.VALOR_PARAMETRO from Mensageria.PARAMETROS where Mensageria.PARAMETROS.NOME_PARAMETRO = 'ENVIO WHATSAPP';`,
          function (err) {
            if (err) {
              Logger.error(
                err,
                "MessageRepository.fetchShouldSendWhatsApp()",
                {}
              );
              console.log(err);
              connection.close();
              reject(err);
            }
          }
        );

        request.on("row", function (columns) {
          columns = SQLServer.formatResponse(columns);
          if (Array.isArray(columns)) {
            columns.forEach(function (column) {
              if (column.VALOR_PARAMETRO !== null) {
                result.push(column.VALOR_PARAMETRO);
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
  fetchInterval: function () {
    return new Promise((resolve, reject) => {
      const connection = SQLServer.getConnection();
      var result = [];
      connection.on("connect", function (err) {
        if (err) {
          Logger.error(err, "MessageRepository.fetchInterval()", {});
          reject(err);
        }
        // If no error, then good to proceed.
        let request = new Request(
          `select top 1 Mensageria.PARAMETROS.VALOR_PARAMETRO from Mensageria.PARAMETROS where Mensageria.PARAMETROS.NOME_PARAMETRO = 'INTERVALO ENVIOS';`,
          function (err) {
            if (err) {
              Logger.error(err, "MessageRepository.fetchInterval()", {});
              console.log(err);
              connection.close();
              reject(err);
            }
          }
        );

        request.on("row", function (columns) {
          columns = SQLServer.formatResponse(columns);
          if (Array.isArray(columns)) {
            columns.forEach(function (column) {
              if (column.VALOR_PARAMETRO !== null) {
                result.push(column.VALOR_PARAMETRO);
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
  fetchQueryInterval: function () {
    return new Promise((resolve, reject) => {
      const connection = SQLServer.getConnection();
      var result = [];
      connection.on("connect", function (err) {
        if (err) {
          Logger.error(err, "MessageRepository.fetchQueryInterval()", {});
          reject(err);
        }
        // If no error, then good to proceed.
        let request = new Request(
          `select top 1 Mensageria.PARAMETROS.VALOR_PARAMETRO from Mensageria.PARAMETROS where Mensageria.PARAMETROS.NOME_PARAMETRO = 'INTERVALO CONSULTAS';`,
          function (err) {
            if (err) {
              Logger.error(err, "MessageRepository.fetchQueryInterval()", {});
              console.log(err);
              connection.close();
              reject(err);
            }
          }
        );

        request.on("row", function (columns) {
          columns = SQLServer.formatResponse(columns);
          if (Array.isArray(columns)) {
            columns.forEach(function (column) {
              if (column.VALOR_PARAMETRO !== null) {
                result.push(column.VALOR_PARAMETRO);
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
  fetchPendingMessages: function () {
    return new Promise((resolve, reject) => {
      const connection = SQLServer.getConnection();
      var result = [];

      connection.on("connect", function (err) {
        if (err) {
          Logger.error(err, "MessageRepository.fetchPendingMessages()", {});
          reject(err);
        }
        // If no error, then good to proceed.
        let request = new Request(
          `DECLARE @intervalo_envios int = (select TOP 1 Mensageria.PARAMETROS.VALOR_PARAMETRO
            from Mensageria.PARAMETROS where Mensageria.PARAMETROS.NOME_PARAMETRO = 'INTERVALO ENVIOS')
            DECLARE @intervalo_consulta int = (select TOP 1 Mensageria.PARAMETROS.VALOR_PARAMETRO
            from Mensageria.PARAMETROS where Mensageria.PARAMETROS.NOME_PARAMETRO = 'INTERVALO CONSULTAS')
            DECLARE @numero_dispositivos int = (select COUNT(Mensageria.DISPOSITIVOS.CHAVE) from Mensageria.DISPOSITIVOS where Mensageria.DISPOSITIVOS.ATIVO = 'SIM')
SELECT TOP ((@intervalo_consulta / @intervalo_envios) * @numero_dispositivos) 
  M.CODIGO_MENSAGEM,
  M.CODIGO_PARCEIRO,
  M.WHATSAPP,
  M.SMS,
  M.CANAL,
  M.CELULAR,
  M.DATA_CADASTRO,
  M.NOME_CAMPANHA,
  1 AS CODIGO_EMPRESA,
  M.DATA_ENVIO,
  M.CODIGO_TIPO_MENSAGEM,
  M.DATA_VALIDADE,
  TM.PRIORIDADE_ENVIO,
  PM.PERMITE,
  CP.WHATSAPP as ACEITA_WHATSAPP,
  CP.SMS AS ACEITA_SMS
FROM Mensageria.MENSAGENS_AGENDADAS M
JOIN Mensageria.TIPO_MENSAGENS TM ON TM.CODIGO_TIPO_MENSAGEM = M.CODIGO_TIPO_MENSAGEM
LEFT JOIN Mensageria.PERMITE_MARKETING PM ON PM.CODIGO_PARCEIRO = M.CODIGO_PARCEIRO
JOIN Mensageria.CONTATOS_PERMISSOES CP ON CP.CODIGO_CONTATO = M.CODIGO_CONTATO
WHERE CANAL = 'AGUARDANDO ENVIO'
AND M.DATA_VALIDADE >= CAST(GETDATE() AS DATE)
AND M.DATA_AGENDADA <= GETDATE()
AND (M.CODIGO_TIPO_MENSAGEM <> 1 OR PM.PERMITE = 'SIM')
ORDER BY TM.PRIORIDADE_ENVIO, M.DATA_CADASTRO;`,
          function (err) {
            if (err) {
              Logger.error(err, "MessageRepository.fetchPendingMessages()", {});
              console.log(err);
              connection.close();
              reject(err);
            }
          }
        );

        request.on("row", function (columns) {
          columns = SQLServer.formatResponse(columns);
          if (Array.isArray(columns)) {
            columns.forEach(function (column) {
              if (column.CODIGO_MENSAGEM !== null) {
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
  updateMessageStatus: function (messageId, status, number) {
    return new Promise((resolve, reject) => {
      const connection = SQLServer.getConnection();
      var result = [];
      connection.on("connect", function (err) {
        if (err) {
          Logger.error(err, "MessageRepository.updateMessageStatus()", {});
          resolve(false);
        }
        // If no error, then good to proceed.
        let request = new Request(
          `update Mensageria.MENSAGENS_AGENDADAS set 
           Mensageria.MENSAGENS_AGENDADAS.CANAL = '${status}',
           Mensageria.MENSAGENS_AGENDADAS.ENVIADO_POR = '${number}',
           Mensageria.MENSAGENS_AGENDADAS.DATA_ALTERACAO = (select SYSDATETIME()),
           Mensageria.MENSAGENS_AGENDADAS.DATA_ENVIO = (select SYSDATETIME()) 
           where Mensageria.MENSAGENS_AGENDADAS.CODIGO_MENSAGEM = @codigo_mensagem;`,
          function (err) {
            if (err) {
              Logger.error(err, "MessageRepository.updateMessageStatus()", {});
              console.log(err);
              connection.close();
              resolve(false);
            }
          }
        );

        request.addParameter("codigo_mensagem", TYPES.Int, messageId);

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

module.exports = MessageRepository;
