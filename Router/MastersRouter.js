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



router.get("/GetTargetsBySalesman", AuthMiddleware.AdminAuth, TargetController.GetTargetsBySalesman)
router.get("/GetFollowupsBySalesman", AuthMiddleware.AdminAuth, FollowupController.GetFollowupsBySalesman)

router.get("/GetFollowupByBusiness", AuthMiddleware.AdminAuth, FollowupController.GetFollowupByBusiness)


/// Followup routing
router.post("/CreateFollowup", AuthMiddleware.AdminAuth, FollowupController.CreateFollowup)
router.get("/GetFollowups", AuthMiddleware.AdminAuth, FollowupController.GetFollowups)
router.get("/GetFollowupInfo", AuthMiddleware.AdminAuth, FollowupController.GetFollowupInfo)
router.post("/DeleteFollowup", AuthMiddleware.AdminAuth, FollowupController.DeleteFollowup)


const RequestInquery = require("../Controller/Masters/RequestInquery")
router.post("/CreateRequestPartInquiry", AuthMiddleware.AdminAuth, RequestInquery.CreateRequestPartInquiry)
router.post("/DeleteRequestPartInquery", AuthMiddleware.AdminAuth, RequestInquery.DeleteRequestPartInquery)
router.get("/GetRequestPartInquiry", AuthMiddleware.AdminAuth, RequestInquery.GetRequestPartInquiry)
router.get("/GetRequestPartInquiryInfo", AuthMiddleware.AdminAuth, RequestInquery.GetRequestPartInquiryInfo)
router.get("/GetSalesmanPartInquiry", AuthMiddleware.AdminAuth, RequestInquery.GetSalesmanPartInquiry)

module.exports = router;