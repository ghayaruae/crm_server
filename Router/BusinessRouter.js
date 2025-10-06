const express = require("express");
const router = express.Router();

const AuthMiddleware = require("../Middleware/AuthMiddleware");


// ----------------------- business info  ----------------------- //
const BusinessController = require("../Controller/Business/BusinessController");

router.get("/GetBusinesses", AuthMiddleware.AdminAuth, BusinessController.GetBusinesses);
router.get("/GetBusinessInfo", AuthMiddleware.AdminAuth, BusinessController.GetBusinessInfo);

// ----------------------- business info  ----------------------- //
router.get("/GetBusinessOrders", AuthMiddleware.AdminAuth, BusinessController.GetBusinessOrders);
router.get("/GetOrderInfo", AuthMiddleware.AdminAuth, BusinessController.GetOrderInfo);

// ----------------------- business info  ----------------------- //
router.get("/GetBusinessDashboard", AuthMiddleware.AdminAuth, BusinessController.GetBusinessDashboard);
router.get("/GetBusinessDocuments", AuthMiddleware.AdminAuth, BusinessController.GetBusinessDocuments);
router.get("/GetBusinessBrands", AuthMiddleware.AdminAuth, BusinessController.GetBusinessBrands);
router.get("/GetBusinessOrders", AuthMiddleware.AdminAuth, BusinessController.GetBusinessOrders);
router.get("/GetBusinessCrditLimit", AuthMiddleware.AdminAuth, BusinessController.GetBusinessCrditLimit);
router.get("/GetBusinessDueDays", AuthMiddleware.AdminAuth, BusinessController.GetBusinessDueDays);

module.exports = router;

