const express = require("express");
const router = express.Router();

const AuthMiddleware = require("../Middleware/AuthMiddleware");
const DashboardController = require("../Controller/Dashboard/DashboardController");

router.get("/GetDashboardData", AuthMiddleware.AdminAuth, DashboardController.GetDashboardData);
router.get("/GetBusinessesNoRecentOrders", AuthMiddleware.AdminAuth, DashboardController.GetBusinessesNoRecentOrders);
router.get("/GetMonthlySalesBySalesman", AuthMiddleware.AdminAuth, DashboardController.GetMonthlySalesBySalesman);


module.exports = router;

