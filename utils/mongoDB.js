const mongoose = require("mongoose");

async function connectDB() {
  try {
    const connection = await mongoose.connect(
      `mongodb://${process.env.MONGO_SERVER_IP}:${process.env.MONGO_SERVER_PORT}/CompereMQTT`,
      //"mongodb://127.0.0.1:27017/CompereMQTT",
      {
        directConnection: true,
        replicaSet: "rs0",
        connectTimeoutMS: 10000,
        maxPoolSize: 10,
      }
    );
    console.log("Connected to MongoDB database");
    return connection;
  } catch (error) {
    console.log("Error in connecting database");
  }
}

module.exports = { connectDB };
