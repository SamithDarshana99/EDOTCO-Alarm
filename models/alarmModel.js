const mongoose = require("mongoose");

const alarmSchema = new mongoose.Schema(
  {
    alarm_id: {
      type: Number,
      required: true,
    },
    source: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      required: true,
    },
    alarm_name: {
      type: String,
      required: true,
    },
    edotcoSID: {
      type: String,
      required: true,
    },
    tenantCode: {
      type: String,
      required: true,
    },
    priority: {
      type: String,
      required: true,
    },
    open_time: {
      type: Date,
      index: true,
      // type: String,
      // default: "NA",
    },
    alarm_duration: {
      type: String,
      default: "NA",
    },
    time_to_ack: {
      type: String,
      default: "NA",
    },
    ack: {
      type: Number,
      default: 0,
    },
    close_time: {
      type: String,
      default: "NA",
    },
    time_to_close: {
      type: String,
      default: "NA",
    },
    flag: {
      type: String,
      default: "73D8FF",
    },
    esc_level: {
      type: Number,
      default: 0,
    },
  },
  { strict: true, timestamps: { createdAt: true, updatedAt: false } }
);

const Alarm_SiteFailure = mongoose.model(
  "Alarm_SiteFailure",
  alarmSchema,
  "Alarm_SiteFailure"
);

module.exports = Alarm_SiteFailure;
