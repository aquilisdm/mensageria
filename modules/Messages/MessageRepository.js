const SQLServer = require("../../logic/SQLServer");
const Logger = require("../../logic/Logger");
const Utils = require("../../logic/Utils");
var TYPES = require("tedious").TYPES;
var Request = require("tedious").Request;

const MessageRepository = {
  fetchMessageByNumber: function (params) {
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
          WHERE M.CELULAR like '%${params.number}%'
          ${params.channel!== undefined ? " and CANAL = '"+params.channel+"'" : ""}
          ${params.startDate!==undefined && params.endDate!== undefined ? " and M.DATA_ENVIO >= '"+params.startDate+"' and M.DATA_ENVIO <= '"+params.endDate+"'" : ""}
          ORDER BY TM.PRIORIDADE_ENVIO, M.DATA_CADASTRO;`,
          function (err) {
            if (err) {
              Logger.error(err, "MessageRepository.fetchPendingMessages()", {});
              console.log(err);
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
          `select COUNT(Mensageria.MENSAGENS_AGENDADAS.CODIGO_MENSAGEM) as count from Mensageria.MENSAGENS_AGENDADAS where Mensageria.MENSAGENS_AGENDADAS.CANAL='WHATSAPP' and 
          Mensageria.MENSAGENS_AGENDADAS.DATA_ENVIO >= '${currentDate} ${date.getHours()}:00:00.000'
          and Mensageria.MENSAGENS_AGENDADAS.DATA_ENVIO <= '${currentDate} ${
            date.getHours() + 1 > 23 ? "00" : date.getHours() + 1
          }:00:00.000' and Mensageria.MENSAGENS_AGENDADAS.CANAL = 'WHATSAPP';`,
          function (err) {
            if (err) {
              Logger.error(
                err,
                "MessageRepository.fetchSentMessagesCount()",
                {}
              );
              console.log(err);
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
          `
            DECLARE @intervalo_envios int = (select TOP 1 Mensageria.PARAMETROS.VALOR_PARAMETRO
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
            M.CODIGO_EMPRESA,
            M.DATA_ENVIO,
            M.CODIGO_TIPO_MENSAGEM,
            M.DATA_VALIDADE,
            TM.PRIORIDADE_ENVIO
          FROM Mensageria.MENSAGENS_AGENDADAS M
          JOIN Mensageria.TIPO_MENSAGENS TM ON TM.CODIGO_TIPO_MENSAGEM = M.CODIGO_TIPO_MENSAGEM
          WHERE CANAL ='AGUARDANDO ENVIO'
          AND CAST(M.DATA_VALIDADE AS DATE) >= GETDATE()
          AND M.DATA_AGENDADA <= GETDATE()
          ORDER BY TM.PRIORIDADE_ENVIO, M.DATA_CADASTRO;`,
          function (err) {
            if (err) {
              Logger.error(err, "MessageRepository.fetchPendingMessages()", {});
              console.log(err);
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
  updateMessageStatus: function (messageId, status) {
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
           Mensageria.MENSAGENS_AGENDADAS.DATA_ALTERACAO = (select SYSDATETIME()),
           Mensageria.MENSAGENS_AGENDADAS.DATA_ENVIO = (select SYSDATETIME()) 
           where Mensageria.MENSAGENS_AGENDADAS.CODIGO_MENSAGEM = @codigo_mensagem;`,
          function (err) {
            if (err) {
              Logger.error(err, "MessageRepository.updateMessageStatus()", {});
              console.log(err);
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
