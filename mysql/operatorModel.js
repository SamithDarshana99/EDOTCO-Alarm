const { DataTypes } = require("sequelize");
const sequelize = require("../utils/mysqlDB");
const Tenant = require("./tenantModel");

const Operator = sequelize.define("Operator", {
  id: {
    type: DataTypes.UUID,
    allowNull: false,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4,
  },
  operatorName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
});

module.exports = Operator;
