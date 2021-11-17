const router = require("express").Router();

const patientController = require("../controller/patientController");

router.post("/register", patientController.register);

router.post("/login", patientController.getPatientByID);

module.exports = router;
