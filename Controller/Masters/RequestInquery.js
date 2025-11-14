const pool = require("../../Config/db_pool");
const { global } = require("../../Config/global");
const { PaginationQuery } = require("../Helper/QueryHelper");

exports.CreateRequestPartInquiry = async (req, res) => {
    try {

        const request = req.body;

        const request_fields = {
            inventory_store_id: 0,
            request_part_name: request.request_part_name,
            request_brand_name: request.request_brand_name,
            request_part_number: request.request_part_number,
            request_part_qty: request.request_part_qty,
            request_note: request.request_note,
            request_part_market_price: request.request_part_market_price,
            request_supersedes: request.request_supersedes,
            request_status: 0,
            request_date: global.current_date
        }

        let query, cond, message;

        if (request.inventory_part_request_id) {
            query = `UPDATE inventory__part_requests SET ? WHERE inventory_part_request_id = ?`;
            message = "Request part inquiry updated successfully";
            cond = [request_fields, request.inventory_part_request_id]
        } else {
            query = `INSERT INTO inventory__part_requests SET ?`;
            message = "Request part inquiry requested successfully";
            cond = [request_fields]
        }

        await pool.query(query, cond);
        return res.json({ success: true, message })

    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: "Internal Server Error", error });
    }
}

exports.GetRequestPartInquiry = async (req, res) => {
    try {
        const { limit, page, keyword } = req.query;

        let query_count = `SELECT COUNT(*) AS total_records FROM inventory__part_requests`;

        let query = `SELECT * FROM inventory__part_requests`;

        let conditionValue = [];
        let conditionCols = [];

        if (keyword) {
            conditionCols.push(`inventory__part_requests.request_part_name LIKE ?`);
            conditionValue.push(`%${keyword}%`);
        }

        if (conditionCols.length > 0) {
            const whereClause = " WHERE " + conditionCols.join(" AND ");
            query += whereClause;
            query_count += whereClause;
        }

        query += ` ORDER BY inventory__part_requests.inventory_part_request_id DESC LIMIT ?, ?`;

        const response = await PaginationQuery(query_count, query, conditionValue, limit, page);
        return res.status(200).json(response);

    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: "Internal Server Error", error });
    }
};

exports.GetRequestPartInquiryInfo = async (req, res) => {
    try {

        const { inventory_part_request_id } = req.query;
        if (!inventory_part_request_id) return res.json({ success: false, message: "inventory_part_request_id is required..!" });

        const [rows] = await pool.query(`SELECT * FROM inventory__part_requests WHERE inventory_part_request_id = ?`, [inventory_part_request_id])
        return res.json({ success: true, data: rows[0] })

    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: "Internal Server Error", error });
    }
}

exports.DeleteRequestPartInquery = async (req, res) => {
    try {
        const { inventory_part_request_id } = req.body;

        if (!inventory_part_request_id) return res.json({ success: false, message: "inventory_part_request_id is required..!" });

        let query = "DELETE FROM inventory__part_requests WHERE inventory_part_request_id = ?"
        await pool.query(query, [inventory_part_request_id])
        return res.json({ success: true, message: "Request Part Inquiery deleted successfully..!" });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: "Internal Server Error", error });
    }
}