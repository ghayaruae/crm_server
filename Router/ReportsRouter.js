const express = require("express");
const router = express.Router();

const AuthMiddleware = require("../Middleware/AuthMiddleware");

// ----------------------- business info  ----------------------- //
const ReportsController = require("../Controller/Reports/ReportsController");

router.get("/GetBusinessOrdersReport", AuthMiddleware.AdminAuth, ReportsController.GetBusinessOrdersReport);
router.get("/GetBusinessAllOrdersReport", AuthMiddleware.AdminAuth, ReportsController.GetBusinessAllOrdersReport);


module.exports = router;
