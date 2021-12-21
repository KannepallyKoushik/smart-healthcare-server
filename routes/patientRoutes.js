const router = require("express").Router();

const patientController = require("../controller/patientController");

router.get("/getAllPatients", patientController.getAllPatients);

router.post("/register", patientController.register);

router.post("/login", patientController.getPatientByID);

router.post("/verify", patientController.verify);

router.post("/getPatientData", patientController.getPatientData);

router.post("/manualRecordings", patientController.manualThyroid_Diabetes_Data);

router.post("/pushToCloud", patientController.pushToCloud);

module.exports = router;
