const router = require("express").Router();

const consumerController = require("../controller/consumerController");

router.post("/consume", consumerController.consumeData);

router.post("/consume/bp", consumerController.consumeBP);

router.post("/consume/temperature", consumerController.consumeTemp);

router.post("/emergency", consumerController.raiseAlert);

router.post("/criticalScores", consumerController.calcCriticalScores);

module.exports = router;
