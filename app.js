const express = require("express");
const app = express();
const cors = require("cors");

const patientRoutes = require("./routes/patientRoutes");
const consumerRoutes = require("./routes/consumerRoutes");
const deviceRoutes = require("./routes/deviceRoutes");

//Middlewares
app.use(express.json());
app.use(cors());

// 1. Register and login Routes
app.use("/patient", patientRoutes);

//2. Application Routes
app.use("/consumer", consumerRoutes);

//3. Device Routes
app.use("/devices", deviceRoutes);

module.exports = app;
