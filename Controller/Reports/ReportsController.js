const pool = require("../../Config/db_pool");
const { global } = require("../../Config/global");
const { PaginationQuery } = require("../Helper/QueryHelper");

exports.GetBusinessOrdersReport = async (req, res) => {
    try {
        const { from_date, to_date, page, limit, keyword } = req.query;

        const business_salesman_id = req.headers['business-salesman-id'];

        if (!business_salesman_id) {
            return res.status(400).json({
                success: false,
                message: "business_salesman_id is required"
            });
        }

        // Step 1: Get business IDs
        const [businessRows] = await pool.query(
            `SELECT business_id FROM business WHERE business_salesman_id = ?`,
            [business_salesman_id]
        );

        if (businessRows.length === 0) {
            return res.json({
                success: false,
                message: "No businesses found for this salesman"
            });
        }

        const businessIds = businessRows.map(b => b.business_id);
        const placeholders = businessIds.map(() => '?').join(',');

        // Base queries
        let query_count = `
          SELECT COUNT(*) as total_records
          FROM business__orders
          LEFT JOIN business ON business__orders.business_order_business_id = business.business_id
          WHERE business__orders.business_order_business_id IN (${placeholders})
        `;

        let query = `
          SELECT business__orders.*, business.business_name
          FROM business__orders
          LEFT JOIN business ON business__orders.business_order_business_id = business.business_id
          WHERE business__orders.business_order_business_id IN (${placeholders})
        `;

        // Conditions
        let conditionValue = [...businessIds];
        let conditions = [];

        if (keyword) {
            conditions.push(`business__orders.business_order_business_id LIKE ?`);
            conditionValue.push(`%${keyword}%`);
        }

        if (from_date && to_date) {
            conditions.push(`DATE(business__orders.business_order_date) BETWEEN ? AND ?`);
            conditionValue.push(from_date, to_date);
        }

        // Add conditions
        if (conditions.length > 0) {
            const conditionStr = " AND " + conditions.join(" AND ");
            query += conditionStr;
            query_count += conditionStr;
        }

        query += ` ORDER BY business__orders.business_order_id DESC LIMIT ?, ?`;

        const limitNum = parseInt(limit) || 10;
        const pageNum = parseInt(page) || 1;

        const response = await PaginationQuery(query_count, query, conditionValue, limitNum, pageNum);
        return res.status(200).json(response);
    } catch (error) {
        console.error("GetBusinessOrders SQL Error:", error.sqlMessage || error.message, error.sql);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
}

exports.GetBusinessAllOrdersReport = async (req, res) => {
    try {
        const { from_date, to_date, page, limit, keyword } = req.query;

        const business_salesman_id = req.headers['business-salesman-id'];

        if (!business_salesman_id) {
            return res.status(400).json({
                success: false,
                message: "business_salesman_id is required"
            });
        }

        // Step 1: Get business IDs
        const [businessRows] = await pool.query(
            `SELECT business_id FROM business WHERE business_salesman_id = ?`,
            [business_salesman_id]
        );

        if (businessRows.length === 0) {
            return res.json({
                success: false,
                message: "No businesses found for this salesman"
            });
        }

        const businessIds = businessRows.map(b => b.business_id);
        const placeholders = businessIds.map(() => '?').join(',');

        // Base queries
        let query_count = `
          SELECT COUNT(*) as total_records
          FROM business__orders
          LEFT JOIN business ON business__orders.business_order_business_id = business.business_id
          WHERE business__orders.business_order_business_id IN (${placeholders})
        `;

        let query = `
          SELECT business__orders.*, business.business_name
          FROM business__orders
          LEFT JOIN business ON business__orders.business_order_business_id = business.business_id
          WHERE business__orders.business_order_business_id IN (${placeholders})
        `;

        // Conditions
        let conditionValue = [...businessIds];
        let conditions = [];

        if (keyword) {
            conditions.push(`business__orders.business_order_business_id LIKE ?`);
            conditionValue.push(`%${keyword}%`);
        }

        if (from_date && to_date) {
            conditions.push(`DATE(business__orders.business_order_date) BETWEEN ? AND ?`);
            conditionValue.push(from_date, to_date);
        }

        // Add conditions
        if (conditions.length > 0) {
            const conditionStr = " AND " + conditions.join(" AND ");
            query += conditionStr;
            query_count += conditionStr;
        }

        query += ` ORDER BY business__orders.business_order_id DESC LIMIT ?, ?`;

        const limitNum = parseInt(limit) || 10;
        const pageNum = parseInt(page) || 1;

        const response = await PaginationQuery(query_count, query, conditionValue, limitNum, pageNum);
        return res.status(200).json(response);
    } catch (error) {
        console.error("GetBusinessOrders SQL Error:", error.sqlMessage || error.message, error.sql);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
}