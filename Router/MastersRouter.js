const express = require("express")
const router = express.Router();

const AuthMiddleware = require("../Middleware/AuthMiddleware");
const TargetController = require("../Controller/Masters/TargetController")

/// Target routing
router.post("/Masters/CreateTarget", AuthMiddleware.AdminAuth, TargetController.CreateTarget)
router.get("/Masters/GetTargets", AuthMiddleware.AdminAuth, TargetController.GetTargets)
router.get("/Masters/GetTargetInfo", AuthMiddleware.AdminAuth, TargetController.GetTargetInfo)
router.post("/Masters/DeleteTarget", AuthMiddleware.AdminAuth, TargetController.DeleteTarget)

module.exports = router;