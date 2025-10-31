const pool = require("../../Config/db_pool");
const { global } = require("../../Config/global");
const { PaginationQuery } = require("../Helper/QueryHelper");

exports.CreateFollowup = async (req, res) => {
    try {
        const request = req.body;
        const fields = {
            business_salesman_id: request.business_salesman_id,
            business_id: request.business_id,
            business_salesman_followup_type: request.business_salesman_followup_type,
            business_salesman_followup_date: request.business_salesman_followup_date,
            business_salesman_business_response: request.business_salesman_business_response,
            business_salesman_followup_remark: request.business_salesman_followup_remark
        }

        if (request.business_salesman_followup_id) {
            await pool.query("UPDATE business__salesmans_followups SET ? WHERE business_salesman_followup_id = ?", [fields, request.business_salesman_followup_id])
            return res.status(200).json({ success: true, message: "Followup updated Successfully" })
        } else {
            await pool.query("INSERT INTO business__salesmans_followups SET ?", [fields])
            return res.status(200).json({ success: true, message: "Followup created Successfully" })
        }
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: "Internal Server Error", error });
    }
}

exports.GetFollowups = async (req, res) => {
    try {
        const { limit, page, keyword } = req.query;

        let query_count = `
          SELECT COUNT(*) AS total_records
          FROM business__salesmans_followups
        `;

        let query = `
          SELECT 
            f.*, 
            s.business_salesmen_name,
            b.business_name 
          FROM business__salesmans_followups f
          LEFT JOIN business__salesmans AS s 
            ON f.business_salesman_id = s.business_salesman_id
          LEFT JOIN business AS b 
            ON f.business_id = b.business_id
        `;

        let conditionValue = [];
        let conditionCols = [];

        if (keyword) {
            conditionCols.push(`s.business_salesmen_name LIKE ?`);
            conditionValue.push(`%${keyword}%`);
        }

        if (conditionCols.length > 0) {
            const whereClause = " WHERE " + conditionCols.join(" AND ");
            query += whereClause;
            query_count += whereClause;
        }

        query += ` ORDER BY f.business_salesman_followup_id DESC LIMIT ?, ?`;

        const response = await PaginationQuery(query_count, query, conditionValue, limit, page);
        return res.status(200).json(response);

    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: "Internal Server Error", error });
    }
};

exports.GetFollowupInfo = async (req, res) => {
    try {
        const { business_salesman_followup_id } = req.query;

        if (!business_salesman_followup_id) return res.json({ success: false, message: "business_salesman_followup_id is required..!" });

        let query = "SELECT * FROM business__salesmans_followups WHERE business_salesman_followup_id = ?";

        const rows = await pool.query(query, [business_salesman_followup_id])
        if (!rows.length) return res.json({ success: false, message: "Followup not found" });
        return res.json({ success: true, data: rows[0] })
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: "Internal Server Error", error });
    }
}

exports.DeleteFollowup = async (req, res) => {
    try {
        const { business_salesman_followup_id } = req.body;
        if (!business_salesman_followup_id) return res.json({ success: false, message: "business_salesman_followup_id is required..!" });

        let query = "DELETE FROM business__salesmans_followups WHERE business_salesman_followup_id = ?"
        const [result] = await pool.query(query, [business_salesman_followup_id])
        
        if (result.affectedRows === 0) {
            return res.json({ success: false, message: "Followup not found" });
        }
        return res.json({ success: true, message: "Followup deleted successfully..!" });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: "Internal Server Error", error });
    }
}