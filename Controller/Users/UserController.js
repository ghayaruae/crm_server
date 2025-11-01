const pool = require("../../Config/db_pool");
require("dotenv").config();
const jwt = require('jsonwebtoken');
const { global } = require("../../Config/global");
const { PaginationQuery } = require("../Helper/QueryHelper");
const { FormFileData } = require("../Helper/Utils")
const path = require("path");
const fs = require("fs");

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

const CreateUsers = async (req, data) => {
    try {
        const business_salesman_id = req.headers['business-salesman-id'];

        const fields = {
            business_salesmen_name: data?.business_salesmen_name,
            business_salesmen_contact_number: data?.business_salesmen_contact_number,
            business_salesman_login_id: data?.business_salesman_login_id,
            business_salesman_login_password: data?.business_salesman_login_password,
            business_salesman_email: data?.business_salesman_email,
            created_by: business_salesman_id,
            created_date: global.current_date,
        };

        if (req.file) {
            fields.business_salesman_image = req.file?.filename || null;
        }

        if (data.business_salesman_id) {
            if (req.file) {
                const [old] = await pool.query("SELECT business_salesman_image FROM business__salesmans WHERE business_salesman_id = ?", [data.business_salesman_id]);
                if (old[0]?.business_salesman_image) {
                    const oldPath = path.join(__dirname, '../../public/business__salesmans', old[0].business_salesman_image);
                    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
                }
            }

            await pool.query("UPDATE business__salesmans SET ? WHERE business_salesman_id = ?", [fields, data.business_salesman_id]);
            return { success: true, message: "User updated successfully" };
        } else {
            await pool.query("INSERT INTO business__salesmans SET ?", [fields]);
            return { success: true, message: "User created successfully" };
        }
    } catch (error) {
        console.error("CreateUsers Error:", error);
        return { success: false, message: error.message || "Internal Server Error" };
    }
};

exports.CreateUser = async (req, res) => {
    try {
        const todayDate = new Date().toISOString().slice(0, 10);
        const randomNumber = Math.floor(Math.random() * 1000);

        const { upload } = await FormFileData(
            "business__salesmans",
            "business_salesman_image",
            `business_salesman_image_${todayDate}_${randomNumber}`
        );

        upload(req, res, async (err) => {
            if (err) {
                console.error("Upload Error:", err);
                return res.status(500).json({ success: false, message: "Upload failed" });
            }

            const response = await CreateUsers(req, req.body);
            return res.status(200).json(response);
        });

    } catch (error) {
        console.error("CreateUser Error:", error);
        return res.status(500).json({ success: false, message: "Something went wrong" });
    }
};

exports.GetUsers = async (req, res) => {
    try {
        const { limit, page, keyword } = req.query;

        let query_count = `
          SELECT COUNT(*) AS total_records
          FROM business__salesmans`;

        let query = `
          SELECT *,
          CONCAT('${global.base_server_file_url}public/salesman/', business_salesman_image) AS business_salesman_image_url
          FROM business__salesmans`; 

        let conditionValue = [];
        let conditionCols = [];

        if (keyword) {
            conditionCols.push(`business__salesmans.business_salesmen_name LIKE ?`);
            conditionValue.push(`%${keyword}%`);
        }

        if (conditionCols.length > 0) {
            const whereClause = " WHERE " + conditionCols.join(" AND ");
            query += whereClause;
            query_count += whereClause;
        }

        query += ` ORDER BY business__salesmans.business_salesman_id DESC LIMIT ?, ?`;

        const response = await PaginationQuery(query_count, query, conditionValue, limit, page);
        return res.status(200).json(response);

    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: "Internal Server Error", error });
    }
};

exports.GetUserInfo = async (req, res) => {
    try {
        const { business_salesman_id } = req.query;

        if (!business_salesman_id) return res.json({ success: false, message: "business_salesman_id is required..!" });

        let query = "SELECT * FROM business__salesmans WHERE business_salesman_id = ?";

        const rows = await pool.query(query, [business_salesman_id])
        if (!rows.length) return res.json({ success: false, message: "User not found" });
        return res.json({ success: true, data: rows[0] })
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: "Internal Server Error", error });
    }
}

exports.DeleteUser = async (req, res) => {
    try {
        const { business_salesman_id } = req.body;
        if (!business_salesman_id)
            return res.json({ success: false, message: "business_salesman_id is required..!" });

        const [old] = await pool.query("SELECT business_salesman_image FROM business__salesmans WHERE business_salesman_id = ?", [business_salesman_id]);
        if (old[0]?.business_salesman_image) {
            const oldPath = path.join(__dirname, '../../public/business__salesmans', old[0].business_salesman_image);
            if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        }

        const [result] = await pool.query("DELETE FROM business__salesmans WHERE business_salesman_id = ?", [business_salesman_id]);

        if (result.affectedRows === 0)
            return res.json({ success: false, message: "User not found" });

        return res.json({ success: true, message: "User deleted successfully..!" });
    } catch (error) {
        console.error("DeleteUser Error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error", error });
    }
};