const express = require("express");
const router = express.Router();

const AuthMiddleware = require("../Middleware/AuthMiddleware");
const BusinessController = require("../Controller/Business/BusinessController");



// ----------------------- All business  ----------------------- //
router.get("/GetBusinesses", AuthMiddleware.AdminAuth, BusinessController.GetBusinesses);
router.get("/GetBusinessesList", AuthMiddleware.AdminAuth, BusinessController.GetBusinessesList);
// ----------------------- All business  ----------------------- //



// ----------------------- business orders  ----------------------- //
router.get("/GetBusinessOrders", AuthMiddleware.AdminAuth, BusinessController.GetBusinessOrders);
router.get("/GetOrderInfo", AuthMiddleware.AdminAuth, BusinessController.GetOrderInfo);
router.get("/GetOrderTimeLine", AuthMiddleware.AdminAuth, BusinessController.GetOrderTimeLine);
// ----------------------- business orders  ----------------------- //



// ----------------------- business info  ----------------------- //
router.get("/GetBusinessDashboard", AuthMiddleware.AdminAuth, BusinessController.GetBusinessDashboard);
router.get("/GetBusinessInfo", AuthMiddleware.AdminAuth, BusinessController.GetBusinessInfo);
router.get("/GetBusinessDocuments", AuthMiddleware.AdminAuth, BusinessController.GetBusinessDocuments);
router.get("/GetBusinessBrands", AuthMiddleware.AdminAuth, BusinessController.GetBusinessBrands);
router.get("/GetBusinessOrdersList", AuthMiddleware.AdminAuth, BusinessController.GetBusinessOrdersList);
router.get("/GetBusinessCrditLimit", AuthMiddleware.AdminAuth, BusinessController.GetBusinessCrditLimit);
router.get("/GetBusinessDueDays", AuthMiddleware.AdminAuth, BusinessController.GetBusinessDueDays);
// ----------------------- business info  ----------------------- //

module.exports = router;

