const express = require("express");
const router = express.Router();

const AuthMiddleware = require("../Middleware/AuthMiddleware");
const UserController = require("../Controller/Users/UserController");

router.post("/Login", UserController.Login);

//// Users Routing
router.post("/CreateUser", AuthMiddleware.AdminAuth, UserController.CreateUser);
router.get("/GetUsers", AuthMiddleware.AdminAuth, UserController.GetUsers);
router.get("/GetUserInfo", AuthMiddleware.AdminAuth, UserController.GetUserInfo);
router.post("/DeleteUser", AuthMiddleware.AdminAuth, UserController.DeleteUser);



const UserPrivilageController = require("../Controller/Users/UserPrivilageController");
router.post("/UpdateSalesmanPermissions", AuthMiddleware.AdminAuth, UserPrivilageController.UpdateSalesmanPermissions);
router.post("/CreatePrivillage", UserPrivilageController.CreatePrivillage);
router.get("/GetSalesmanPrivilageList", AuthMiddleware.AdminAuth, UserPrivilageController.GetSalesmanPrivilageList);
router.get("/GetPrivillage", UserPrivilageController.GetPrivillage);




module.exports = router;