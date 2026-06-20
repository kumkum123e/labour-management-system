const logger = require("../utils/logger");
const hodService = require("./hodService");
const labourService = require("./labourService");

let twilioClient = null;

const getTwilio = () => {
  if (twilioClient) return twilioClient;
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) return null;
  try {
    // eslint-disable-next-line global-require
    twilioClient = require("twilio")(sid, token);
    return twilioClient;
  } catch {
    return null;
  }
};

const callHodForUrgentRequest = async (hodId, { labourName, requestDate, reason }) => {
  const hod = await hodService.getHodById(hodId);
  const phone = hod.mobileNumber || process.env.HOD_FALLBACK_PHONE;

  if (!phone) {
    logger.warn(`Urgent outing request: no phone for HOD ${hod.hodName}`);
    return { called: false, reason: "HOD mobile number not configured" };
  }

  const client = getTwilio();
  const message = `Urgent outing request from ${labourName} for ${requestDate}. Reason: ${reason}. Please approve in the Labour Management System.`;

  if (!client || !process.env.TWILIO_FROM_NUMBER) {
    logger.info(`[PHONE SIMULATION] Call to ${phone}: ${message}`);
    return { called: false, simulated: true, phone, message };
  }

  try {
    const call = await client.calls.create({
      to: phone.startsWith("+") ? phone : `+91${phone.replace(/\D/g, "")}`,
      from: process.env.TWILIO_FROM_NUMBER,
      twiml: `<Response><Say voice="alice">${message.replace(/&/g, "and")}</Say></Response>`,
    });
    logger.info(`Twilio call initiated: ${call.sid} to ${phone}`);
    return { called: true, callSid: call.sid, phone };
  } catch (err) {
    logger.error(`Twilio call failed: ${err.message}`);
    return { called: false, error: err.message, phone };
  }
};

const callLabourForUrgent = async (labourId, { hodName, requestStatus, reason }) => {
  const labour = await labourService.getLabourById(labourId);
  const phone = labour.phone || process.env.LABOUR_FALLBACK_PHONE;

  if (!phone) {
    logger.warn(`Urgent call to labour: no phone for labour ${labour.labourName}`);
    return { called: false, reason: "Labour phone number not configured" };
  }

  const client = getTwilio();
  const message = `URGENT: Your outing request has been ${requestStatus} by ${hodName}. ${reason || ""}. Please check the Labour Management System for details.`;

  if (!client || !process.env.TWILIO_FROM_NUMBER) {
    logger.info(`[PHONE SIMULATION] Call to ${phone}: ${message}`);
    return { called: false, simulated: true, phone, message };
  }

  try {
    const call = await client.calls.create({
      to: phone.startsWith("+") ? phone : `+91${phone.replace(/\D/g, "")}`,
      from: process.env.TWILIO_FROM_NUMBER,
      twiml: `<Response><Say voice="alice">${message.replace(/&/g, "and")}</Say></Response>`,
    });
    logger.info(`Twilio urgent call initiated: ${call.sid} to ${phone}`);
    return { called: true, callSid: call.sid, phone };
  } catch (err) {
    logger.error(`Twilio urgent call failed: ${err.message}`);
    return { called: false, error: err.message, phone };
  }
};

module.exports = { callHodForUrgentRequest, callLabourForUrgent };
