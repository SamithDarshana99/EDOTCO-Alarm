const mongoose = require("mongoose");

const MQTT_ENY_NOW_SCHEMA = new mongoose.Schema(
  {},
  { strict: false, timestamps: { createdAt: true, updatedAt: false } }
);
const MQTT_ENY_NOW = mongoose.model(
  "MQTT_ENY_NOW",
  MQTT_ENY_NOW_SCHEMA,
  "MQTT_ENY_NOW"
);

const MQTT_RT_DATA_SCHEMA = new mongoose.Schema(
  {
    customid: {
      type: String,
      required: true,
    },
    ua: {
      type: Number,
      required: false,
    },
    ub: {
      type: Number,
      required: false,
    },
    uc: {
      type: Number,
      required: false,
    },
    ia: {
      type: Number,
      required: false,
    },
    ib: {
      type: Number,
      required: false,
    },
    ic: {
      type: Number,
      required: false,
    },
    f: {
      type: Number,
      required: false,
    },
    zglys: {
      type: Number,
      required: false,
    },
    zyggl: {
      type: Number,
      required: false,
    },
    time: {
      type: String,
      required: false,
    },
    isend: {
      type: String,
      required: false,
    },
  },
  { strict: true, timestamps: { createdAt: true, updatedAt: false } }
);
const MQTT_RT_DATA = mongoose.model(
  "MQTT_RT_DATA",
  MQTT_RT_DATA_SCHEMA,
  "MQTT_RT_DATA"
);

module.exports = { MQTT_ENY_NOW, MQTT_RT_DATA };
