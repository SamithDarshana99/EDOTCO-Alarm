const express = require("express");
const path = require("path");
require("dotenv").config();
const cron = require("node-cron");
const app = express();
const { connectDB } = require("./utils/mongoDB");
const { getAlarm } = require("./alarms/noDataReceivedAlarm");
const sequelize = require("./utils/mysqlDB");
const { error } = require("console");
const cors = require("cors");

app.use(express.json()); // Parse JSON requests
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, "public")));
app.use(cors());

app.use(
  cors({
    origin: "https://edotcoconnect.sierra.lk", // allow this origin
    credentials: true, // allow credentials
  })
);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Something went wrong!");
});

const port = process.env.SERVER_PORT || 3004;

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
