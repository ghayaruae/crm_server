const express = require("express");
const router = express.Router();

const AuthMiddleware = require("../Middleware/AuthMiddleware");

const DashboardController = require("../Controller/Dashboard/DashboardController");
router.get("/GetDashboardData", AuthMiddleware.AdminAuth, DashboardController.GetDashboardData);
router.get("/GetBusinessesNoRecentOrders", AuthMiddleware.AdminAuth, DashboardController.GetBusinessesNoRecentOrders);
router.get("/GetMonthlySalesBySalesman", AuthMiddleware.AdminAuth, DashboardController.GetMonthlySalesBySalesman);
router.get("/GetSalesmanTargetChartData", AuthMiddleware.AdminAuth, DashboardController.GetSalesmanTargetChartData);


const TeamLeaderDashboardController = require("../Controller/Dashboard/TeamLeaderDashboardController");
router.get("/GetTeamLeaderDashboardStates", AuthMiddleware.AdminAuth, TeamLeaderDashboardController.GetTeamLeaderDashboardStates);
router.get("/GetTargetAchievementReport", AuthMiddleware.AdminAuth, TeamLeaderDashboardController.GetTargetAchievementReport);
router.get("/GetLastPartInquiries", AuthMiddleware.AdminAuth, TeamLeaderDashboardController.GetLastPartInquiries);


module.exports = router;

