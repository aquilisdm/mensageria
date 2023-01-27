const Utils = {
  isJson: function (str) {
    try {
      if (typeof str === "string") {
        JSON.parse(str);
      } else return false;
    } catch (e) {
      return false;
    }
    return true;
  },
  formatNumber: function (number) {
    number =
      typeof number == "string"
        ? number
        : typeof number == "number"
        ? number.toString()
        : null;
    if (number != null && number.length > 0) {
      //Removendo apenas os caracteres mais comuns em um numero de telefone
      number = number.trim();
      number = number.replace(" ", "");
      number = number.replace("-", "");
      number = number.replace("+", "");
      let regExp = new RegExp("^\\d+$");

      if (regExp.test(number)) {
        if (number.length >= 10 && number.length <= 12) {
          return "55" + number;
        } else if (number.length >= 13 && number.length <= 14) {
          return number;
        }
      }
    }

    return null;
  },
  convertTZ: function (date, tzString) {
    return new Date(
      (typeof date === "string" ? new Date(date) : date).toLocaleString(
        "en-US",
        { timeZone: tzString }
      )
    );
  },
};

module.exports = Utils;
