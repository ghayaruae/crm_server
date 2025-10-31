const express = require("express")
const router = express.Router();

const AuthMiddleware = require("../Middleware/AuthMiddleware");
const TargetController = require("../Controller/Masters/TargetController")

/// Target routing
router.post("/CreateTarget", AuthMiddleware.AdminAuth, TargetController.CreateTarget)
router.get("/GetTargets", AuthMiddleware.AdminAuth, TargetController.GetTargets)
router.get("/GetTargetInfo", AuthMiddleware.AdminAuth, TargetController.GetTargetInfo)
router.post("/DeleteTarget", AuthMiddleware.AdminAuth, TargetController.DeleteTarget)
router.get("/GetSalesmanList", AuthMiddleware.AdminAuth, TargetController.GetSalesmanList)

module.exports = router;