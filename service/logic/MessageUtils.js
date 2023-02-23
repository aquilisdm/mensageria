const ClientManager = require("../../modules/Client/ClientManager");
const CompanyService = require("../../modules/Company/CompanyService");
const MessageRepository = require("../../modules/Messages/MessageRepository");
const Utils = require("../../logic/Utils");

const MessageUtils = {
  shouldSendSMS: async function () {
    try {
      let shouldSendSMS = await MessageRepository.fetchShouldSendSMS();
      let startTime = await MessageRepository.fetchStartTime();
      let endTime = await MessageRepository.fetchEndTime();
      let currentDate = Utils.convertTZ(new Date(), "America/Sao_Paulo");

      if (
        Array.isArray(startTime) &&
        Array.isArray(endTime) &&
        startTime.length > 0 &&
        endTime.length > 0
      ) {
        startTime[0] =
          typeof startTime[0] === "number" || typeof startTime[0] === "string"
            ? parseInt(startTime[0])
            : -1;
        endTime[0] =
          typeof endTime[0] === "number" || typeof endTime[0] === "string"
            ? parseInt(endTime[0])
            : -1;

        return (
          Array.isArray(shouldSendSMS) &&
          currentDate.getHours() >= startTime[0] &&
          currentDate.getHours() < endTime[0] &&
          shouldSendSMS.length > 0 &&
          typeof shouldSendSMS[0] === "string" &&
          shouldSendSMS[0].trim().toLowerCase() == "sim"
        );
      }

      return false;
    } catch (err) {
      console.log(err);
      return false;
    }
  },
  shouldSendWhatsApp: async function () {
    try {
      let shouldSendWhatsApp =
        await MessageRepository.fetchShouldSendWhatsApp();
      let startTime = await MessageRepository.fetchStartTime();
      let endTime = await MessageRepository.fetchEndTime();
      let currentDate = Utils.convertTZ(new Date(), "America/Sao_Paulo");

      if (
        Array.isArray(startTime) &&
        Array.isArray(endTime) &&
        startTime.length > 0 &&
        endTime.length > 0
      ) {
        startTime[0] =
          typeof startTime[0] === "number" || typeof startTime[0] === "string"
            ? parseInt(startTime[0])
            : -1;
        endTime[0] =
          typeof endTime[0] === "number" || typeof endTime[0] === "string"
            ? parseInt(endTime[0])
            : -1;

        return (
          Array.isArray(shouldSendWhatsApp) &&
          currentDate.getHours() >= startTime[0] &&
          currentDate.getHours() < endTime[0] &&
          shouldSendWhatsApp.length > 0 &&
          typeof shouldSendWhatsApp[0] === "string" &&
          shouldSendWhatsApp[0].trim().toLowerCase() == "sim"
        );
      }

      return false;
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
};

module.exports = MessageUtils;
