const Utils = {
  isDate: function(date) {
    try {
    return date.toString() !== "Invalid Date"
    } catch(err) {
      console.log(err);
      return false;
    }
  },
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
  formatUnicodeToEmojisInText: function (text) {
    try {
      if (text !== undefined && text !== null && typeof text === "string") {
        let exp = new RegExp(/[#][$]\w{1,5}/g);
        return text.replaceAll(exp, function (value) {
          let emoji = String.fromCodePoint(
            parseInt(value.replace("#$", "").trim(), 16)
          );
          return emoji !== undefined && emoji !== null ? emoji : "";
        });
      } else return text;
    } catch (err) {
      console.log(err);
      return text;
    }
  },
};

module.exports = Utils;
