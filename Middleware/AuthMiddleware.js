const jwt = require('jsonwebtoken');
const pool = require('../Config/db_pool');
require('dotenv').config();

const ValidateHeader = async (header) => {
    if (header.token == null || header.token == "") return { success: false, message: "Token should not be null" };

    if (header.business_salesman_login_id) {
        const [salesman] = await pool.query(`SELECT * FROM business__salesmans WHERE business_salesman_login_id = ?`, [header.business_salesman_login_id]);
        if (salesman.length === 0) {
            return { success: false, message: "Salesman Not Found...!" };
        } else {
            return { success: true, business_salesman_login_id: header.business_salesman_login_id, token: header.token };
        }
    } else {
        return { success: false, message: 'Invalid Header' };
    }
}


exports.AdminAuth = async (req, res, next) => {
    const validate = await ValidateHeader(req.headers);
    if (!validate.success) return res.json({ success: false, message: validate.message });

    jwt.verify(validate.token, process.env.ADMIN_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.json({ success: false, message: "This token has been expired" });
        } else {
            req.decoded = decoded
            next();
        }
    });
}


