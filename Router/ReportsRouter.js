const express = require("express");
const router = express.Router();

const AuthMiddleware = require("../Middleware/AuthMiddleware");

// ----------------------- business info  ----------------------- //
const ReportsController = require("../Controller/Reports/ReportsController");

router.get("/GetBusinessOrdersReport", AuthMiddleware.AdminAuth, ReportsController.GetBusinessOrdersReport);
router.get("/GetBusinessAllOrdersReport", AuthMiddleware.AdminAuth, ReportsController.GetBusinessAllOrdersReport);


router.get("/GetAllTargetReports", AuthMiddleware.AdminAuth, ReportsController.GetAllTargetReports);
router.get("/GetAllFollowupsReports", AuthMiddleware.AdminAuth, ReportsController.GetAllFollowupsReports);


// salesman reports
router.get("/AllSalesmanReport", AuthMiddleware.AdminAuth, ReportsController.AllSalesmanReport);
router.get("/AllSalesmanOrderReport", AuthMiddleware.AdminAuth, ReportsController.AllSalesmanOrderReport);
router.get("/AllSalesmanAssignBusinessReport", AuthMiddleware.AdminAuth, ReportsController.AllSalesmanAssignBusinessReport);

module.exports = router;
