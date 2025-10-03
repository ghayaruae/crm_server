const express = require("express");
const router = express.Router();

const AuthMiddleware = require("../Middleware/AuthMiddleware");
const UserController = require("../Controller/Users/UserController");

router.post("/Login", UserController.Login);


module.exports = router;

