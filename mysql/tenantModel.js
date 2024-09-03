const { DataTypes } = require("sequelize");
const sequelize = require("../utils/mysqlDB");
//const Site = require("./siteModel");
const Operator = require("./operatorModel");

const Tenant = sequelize.define("Tenant", {
  id: {
    type: DataTypes.UUID,
    allowNull: false,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4,
  },
  tenantCode: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  operatorId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  sId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
});

//Tenant.belongsTo(Site, { foreignKey: "sId", targetKey: "sId" });
Tenant.belongsTo(Operator, { foreignKey: "operatorId" });
module.exports = Tenant;
