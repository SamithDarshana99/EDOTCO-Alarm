const { Sequelize, DataTypes } = require("sequelize");
const dotenv = require("dotenv");
dotenv.config();

// create a Sequelize instance
const sequelize = new Sequelize(
  process.env.MYSQL_EDOTCO_DB,
  process.env.MYSQL_EDOTCO_USER,
  process.env.MYSQL_EDOTCO_PASSWORD,
  {
    host: process.env.MYSQL_EDOTCO_HOST,
    port: process.env.MYSQL_EDOTCO_PORT,
    dialect: "mysql",
    logging: false,
  }
);

(module.exports = sequelize), DataTypes;
