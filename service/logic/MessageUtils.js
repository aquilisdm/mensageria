const ClientManager = require("../../modules/Client/ClientManager");
const CompanyService = require("../../modules/Company/CompanyService");
const MessageRepository = require("../../modules/Messages/MessageRepository");
const Utils = require("../../logic/Utils");
const Constants = require("../../logic/Constants");

const MessageUtils = {
  getMessageCollectionName: function (channel) {
    if (channel === "WHATSAPP")
      return process.env.NODE_ENV === Constants.PRODUCTION_ENV
        ? "messages"
        : "messages_dev";
    else if (channel === "SMS")
      return process.env.NODE_ENV === Constants.PRODUCTION_ENV
        ? "messages_sms"
        : "messages_dev_sms";
    else return null;
  },
  shouldSendSMS: async function () {
    try {
      let shouldSendSMS = await MessageRepository.fetchShouldSendSMS();
      return (
        Array.isArray(shouldSendSMS) &&
        shouldSendSMS.length > 0 &&
        typeof shouldSendSMS[0] === "string" &&
        shouldSendSMS[0].trim().toLowerCase() == "sim"
      );
    } catch (err) {
      console.log(err);
      return false;
    }
  },
  shouldSendWhatsApp: async function () {
    try {
      let shouldSendWhatsApp =
        await MessageRepository.fetchShouldSendWhatsApp();

      return (
        Array.isArray(shouldSendWhatsApp) &&
        shouldSendWhatsApp.length > 0 &&
        typeof shouldSendWhatsApp[0] === "string" &&
        shouldSendWhatsApp[0].trim().toLowerCase() == "sim"
      );
    } catch (err) {
      console.log(err);
      return false;
    }
  },
  fetchAllCompanyDevices: async function () {
    try {
      let companies = await CompanyService.getCompanies();
      let result = {};

      if (Array.isArray(companies)) {
        for (let i = 0; i < companies.length; i++) {
          let devicesFromCompanyX = await ClientManager.getClientsByCompanyId(
            companies[i].id
          );

          if (
            Array.isArray(devicesFromCompanyX) &&
            devicesFromCompanyX.length > 0
          ) {
            //Array with all devices that belong to X company
            result[companies[i].id] = devicesFromCompanyX;
          }
        }
      }

      return result;
    } catch (err) {
      console.log(err);
      return {};
    }
  },
  selectSeqDevice: function (deviceList) {
    if (Array.isArray(deviceList) && deviceList.length > 0) {
      if (global.lastDeviceIndex + 1 > deviceList.length - 1) {
        global.lastDeviceIndex = 0;
      } else global.lastDeviceIndex = global.lastDeviceIndex + 1;

      return deviceList[global.lastDeviceIndex];
    }

    return undefined;
  },
  selectSeqMarketingDevice: function (deviceList) {
    if (Array.isArray(deviceList) && deviceList.length > 0) {
      if (global.lastMarketingDeviceIndex + 1 > deviceList.length - 1) {
        global.lastMarketingDeviceIndex = 0;
      } else
        global.lastMarketingDeviceIndex = global.lastMarketingDeviceIndex + 1;

      return deviceList[global.lastMarketingDeviceIndex];
    }

    return undefined;
  },
};

module.exports = MessageUtils;
