const express = require("express")
const router = express.Router();

const AuthMiddleware = require("../Middleware/AuthMiddleware");
const TargetController = require("../Controller/Masters/TargetController")
const FollowupController = require("../Controller/Masters/FollowupController")

/// Target routing
router.post("/CreateTarget", AuthMiddleware.AdminAuth, TargetController.CreateTarget)
router.get("/GetTargets", AuthMiddleware.AdminAuth, TargetController.GetTargets)
router.get("/GetTargetInfo", AuthMiddleware.AdminAuth, TargetController.GetTargetInfo)
router.post("/DeleteTarget", AuthMiddleware.AdminAuth, TargetController.DeleteTarget)
router.get("/GetSalesmanList", AuthMiddleware.AdminAuth, TargetController.GetSalesmanList)



/// Followup routing
router.post("/CreateFollowup", AuthMiddleware.AdminAuth, FollowupController.CreateFollowup)
router.get("/GetFollowups", AuthMiddleware.AdminAuth, FollowupController.GetFollowups)
router.get("/GetFollowupInfo", AuthMiddleware.AdminAuth, FollowupController.GetFollowupInfo)
router.post("/DeleteFollowup", AuthMiddleware.AdminAuth, FollowupController.DeleteFollowup)

module.exports = router;