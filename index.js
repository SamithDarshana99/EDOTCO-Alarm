const express = require("express");
const path = require("path");
require("dotenv").config();
const cron = require("node-cron");
const app = express();
const { connectDB } = require("./utils/mongoDB");
const { getAlarm } = require("./alarms/noDataReceivedAlarm");
const sequelize = require("./utils/mysqlDB");

app.use(express.json()); // Parse JSON requests
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, "public")));

const port = 3001 || process.env.PORT;

// Connect to MongoDB
connectDB()
  .then(() => {
    sequelize
      .authenticate()
      .then((error) => {
        if (error) {
          console.error("Error connecting to mySqlDB: ", error);
        }
        console.log("MySQL Database connected");
      })
      .then(() => {
        app.listen(port, () => {
          console.log(`Server is running on http://localhost:${port}`);
        });
      });
  })

  .catch((error) => {
    // Handle MongoDB connection error
    console.error("Failed to connect to MongoDB:", error);
  });

app.get("/", (req, res) => {
  res.send("Hello, MongoDB!");
});

//cron job for daily energy monitoring
let checkDataReceived = cron.schedule(
  "*/15 * * * *",
  () => {
    getAlarm();
    console.log(
      "Checking site failure alarm at every 15 minutes at Asia/Colombo timezone"
    );
  },
  {
    scheduled: true,
    timezone: "Asia/Colombo",
  }
);
checkDataReceived.start();
