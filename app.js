const express = require("express");
const app = express();
const cors = require("cors");

const patientRoutes = require("./routes/patientRoutes");
const consumerRoutes = require("./routes/consumerRoutes");

//Middlewares
app.use(express.json());
app.use(cors());

// 1. Register and login Routes
app.use("/patient", patientRoutes);

//2. Application Routes
app.use("/consumer", consumerRoutes);

module.exports = app;
