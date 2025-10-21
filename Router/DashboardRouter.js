const express = require("express");
const router = express.Router();

const AuthMiddleware = require("../Middleware/AuthMiddleware");
const DashboardControler = require("../Controller/Dashboard/DashboardControler");

router.get("/GetDashboardStates", AuthMiddleware.AdminAuth, DashboardControler.GetDashboardStates);


module.exports = router;

