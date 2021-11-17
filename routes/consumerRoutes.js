const router = require("express").Router();

const consumerController = require("../controller/consumerController");

router.post("/consume", consumerController.consumeData);

module.exports = router;
