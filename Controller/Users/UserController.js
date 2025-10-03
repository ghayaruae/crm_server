const pool = require("../../Config/db_pool");
require("dotenv").config();
const jwt = require('jsonwebtoken');

exports.Login = async (req, res) => {
    try {
        const { business_salesman_login_id, business_salesman_login_password } = req.body;

        const [salesman] = await pool.query(
            `SELECT * 
            FROM business__salesmans
            WHERE business_salesman_login_id = ? 
            AND business_salesman_login_password = ?`,
            [business_salesman_login_id, business_salesman_login_password]
        );

        if (!salesman.length) {
            return res.json({ success: false, message: "Salesman not found" });
        }

        const user = salesman[0];

        const token = jwt.sign(
            { id: user.business_salesman_login_id },
            process.env.ADMIN_TOKEN_SECRET,
            { expiresIn: process.env.TOKEN_EXPIRES_IN }
        );

        user.token = token;

        // 4. Send response
        return res.json({
            success: true,
            message: "Login successful",
            data: user,
        });

    } catch (error) {
        console.error("Login error:", error);
        return res.status(500).json({ success: false, message: "Oops an error occurred!" });
    }
};