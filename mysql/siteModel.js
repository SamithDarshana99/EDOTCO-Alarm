const { DataTypes } = require("sequelize");
const sequelize = require("../utils/mysqlDB");
const Tenant = require("./tenantModel");

const Site = sequelize.define(
  "Site",
  {
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    edotcoSID: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    dnsSID: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    siteName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    siteId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    category: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    siteOfficer: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    latitude: {
      type: DataTypes.DOUBLE,
      allowNull: true,
    },
    longitude: {
      type: DataTypes.DOUBLE,
      allowNull: true,
    },
    DistrictId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    BillingCategoryId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM("Active", "Inactive"),
      defaultValue: "Active",
      allowNull: false,
      validate: {
        isIn: [["Active", "Inactive"]],
      },
    },
  },
  {
    // Other model options go here
    timestamps: false,
  }
);

Site.hasMany(Tenant, {
  foreignKey: "sId",
  onDelete: "CASCADE",
});
module.exports = Site;
