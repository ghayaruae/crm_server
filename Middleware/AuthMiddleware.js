const jwt = require('jsonwebtoken');
const pool = require('../Config/db_pool');
require('dotenv').config();

const ValidateHeader = async (header) => {
    if (!header.token || header.token === "") {
        return { success: false, message: "Token should not be null" };
    }

    // Read header correctly
    const business_salesman_id = header['business-salesman-id'] || header['business_salesman_id'];

    if (business_salesman_id) {
        const [salesman] = await pool.query(
            `SELECT * FROM business__salesmans WHERE business_salesman_id = ?`,
            [business_salesman_id]
        );

        if (salesman.length === 0) {
            return { success: false, message: "Salesman Not Found...!" };
        } else {
            return { success: true, business_salesman_id, token: header.token };
        }
    } else {
        return { success: false, message: 'Invalid Header (business-salesman-id missing)' };
    }
};


exports.AdminAuth = async (req, res, next) => {
    console.log(req.headers, "its my headers");

    const validate = await ValidateHeader(req.headers);
    if (!validate.success) return res.json({ success: false, message: validate.message });

    jwt.verify(validate.token, process.env.ADMIN_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.json({ success: false, message: "This token has expired" });
        } else {
            req.decoded = decoded;
            req.business_salesman_id = validate.business_salesman_id; // attach to request
            next();
        }
    });
};
