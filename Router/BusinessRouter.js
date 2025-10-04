const express = require("express");
const router = express.Router();

const AuthMiddleware = require("../Middleware/AuthMiddleware");


// ----------------------- business info // ----------------------- //
const BusinessController = require("../Controller/Business/BusinessController");

router.get("/GetBusinesses", AuthMiddleware.AdminAuth, BusinessController.GetBusinesses);
router.get("/GetBusinessInfo", AuthMiddleware.AdminAuth, BusinessController.GetBusinessInfo);

// ----------------------- business info // ----------------------- //
router.get("/GetBusinessOrders", AuthMiddleware.AdminAuth, BusinessController.GetBusinessOrders);
router.get("/GetOrderInfo", AuthMiddleware.AdminAuth, BusinessController.GetOrderInfo);

module.exports = router;

