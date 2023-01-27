const CompanyRepository = require("./CompanyRepository");
const validator = require("validator");

const CompanyService = {
  getCompanyById: function (id) {
    return CompanyRepository.getCompanyById(id);
  },
  getCompanies: function () {
    return CompanyRepository.getCompanies();
  },
  createCompany: function (name) {
    if (validator.isLength(name, { min: 1, max: 60 })) {
      return CompanyRepository.createCompany(name);
    } else {
      return { success: false, message: "You reached the character limit" };
    }
  },
};

module.exports = CompanyService;
