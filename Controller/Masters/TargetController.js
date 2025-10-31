const pool = require("../../Config/db_pool");
const { global } = require("../../Config/global");
const { PaginationQuery } = require("../Helper/QueryHelper");

exports.CreateTarget = async (req, res) => {
    try {

        const request = req.body;
        const business_salesman_id = req.headers['business-salesman-id'];

        const fields = {
            business_salesman_id: request.business_salesman_id,
            business_salesman_target_from: request.business_salesman_target_from,
            business_salesman_target_to: request.business_salesman_target_to,
            business_salesman_target: request.business_salesman_target,
            target_assigned_by: business_salesman_id,
            target_assigned_datetime: global.current_date
        }

        if (request.business_salesman_target_id) {
            await pool.query("UPDATE business__salesmans_targets SET ? WHERE business_salesman_target_id = ?", [fields, request.business_salesman_target_id])
            return res.status(200).json({ success: true, message: "Target updated Successfully" })
        } else {
            await pool.query("INSERT INTO business__salesmans_targets SET ?", [fields])
            return res.status(200).json({ success: true, message: "Target created Successfully" })
        }
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: "Internal Server Error", error });
    }
}

exports.GetTargets = async (req, res) => {
    try {
        const { limit, page } = req.query;

        let query_count = "SELECT COUNT(*) AS total_records FROM business__salesmans_targets"
        let query = "SELECT * FROM business__salesmans_targets"

        let conditionValue = [];
        let conditionCols = [];

        if (conditionCols.length > 0) {
            query += " WHERE " + conditionCols.join(" AND ");
            query_count += " WHERE " + conditionCols.join(" AND ");
        }

        query += ` ORDER BY business__salesmans_targets.business_salesman_target_id DESC `;
        query += ` LIMIT ?, ?`;

        const response = await PaginationQuery(query_count, query, conditionValue, limit, page);
        return res.status(200).json(response);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: "Internal Server Error", error });
    }
}

exports.GetTargetInfo = async (req, res) => {
    try {
        const { business_salesman_target_id } = req.query;

        if (!business_salesman_target_id) return res.json({ success: false, message: "business_salesman_target_id is required..!" });

        let query = "SELECT * FROM business__salesmans_targets WHERE business_salesman_target_id = ?";

        const rows = await pool.query(query, [business_salesman_target_id])
        if (!rows.length) return res.json({ success: false, message: "Target not found" });
        return res.json({ success: true, data: rows[0] })
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: "Internal Server Error", error });
    }
}

exports.DeleteTarget = async (req, res) => {
    try {
        const { business_salesman_target_id } = req.body;
        if (!business_salesman_target_id) return res.json({ success: false, message: "business_salesman_target_id is required..!" });

        let query = "DELETE FROM business__salesmans_targets WHERE business_salesman_target_id = ?"
        await pool.query(query, [business_salesman_target_id])

        return res.json({ success: true, message: "Target deleted successfully..!" });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: "Internal Server Error", error });
    }
}