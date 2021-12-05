const router = require("express").Router();

const patientController = require("../controller/patientController");
const { route } = require("./patientRoutes");

router.post("/register", patientController.registerDevice);

router.get("/", patientController.getAllDevices);

router.delete("/:deviceId", patientController.deleteDevice);

module.exports = router;
