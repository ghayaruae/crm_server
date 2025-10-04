const pool = require("../../Config/db_pool");
const { PaginationQuery } = require("../Helper/QueryHelper");

exports.GetBusinesses = async (req, res) => {
    try {
        const { limit, page, business_salesman_id } = req.headers;

        let query_count = `SELECT COUNT(*) AS total_records
         FROM business`

        let query = `SELECT * FROM business`;

        let conditionValue = [];
        let conditionCols = [];

        if (business_salesman_id) {
            conditionCols.push(`business.business_salesman_id = ?`);
            conditionValue.push(business_salesman_id);
        }

        if (conditionCols.length > 0) {
            query += " WHERE " + conditionCols.join(" AND ");
            query_count += " WHERE " + conditionCols.join(" AND ");
        }

        query += ` ORDER BY business.business_id DESC `;
        query += ` LIMIT ?, ?`;


        const response = await PaginationQuery(query_count, query, conditionValue, limit, page);
        return res.status(200).json(response);

    } catch (error) {
        console.log("Get Businesses error : ", error);
        return res.json({ success: false, message: "Internal server error : ", error });
    }
}

exports.GetBusinessInfo = async (req, res) => {
    try {
        const { business_salesman_id } = req.headers;
        const { business_id } = req.query;

        if (!business_salesman_id || !business_id) {
            return res.status(400).json({
                success: false,
                message: "business_salesman_id and business_id are required"
            });
        }

        const [rows] = await pool.query(
            `SELECT * FROM business
             LEFT JOIN business__levels ON business.business_level_id = business__levels.business_level_id 
             WHERE business_id = ? AND business_salesman_id = ?`,
            [business_id, business_salesman_id]
        );

        if (rows.length === 0) {
            return res.json({ success: false, message: "No business found" });
        }

        return res.json({ success: true, data: rows[0] });

    } catch (error) {
        console.error("GetBusinessInfo error : ", error);
        return res.status(500).json({ success: false, message: "Internal server error", error });
    }
};


// ------------- business orders api // -------------
exports.GetBusinessOrders = async (req, res) => {
    try {
        const { business_salesman_id } = req.headers;
        const { limit, page, business_name, type, keyword, status, from_date, to_date } = req.query;

        if (!business_salesman_id) {
            return res.json({ success: false, message: "business_salesman_id is required" });
        }

        const [businessRows] = await pool.query(
            `SELECT business_id FROM business WHERE business_salesman_id = ?`,
            [business_salesman_id]
        );

        if (businessRows.length === 0) {
            return res.json({ success: false, message: "No businesses found for this salesman" });
        }

        const businessIds = businessRows.map(b => b.business_id);

        let query_count = `
            SELECT COUNT(*) as total_records
            FROM business__orders
            LEFT JOIN business ON business__orders.business_id = business.business_id
            WHERE business__orders.business_id IN (?)
        `;

        let query = `
            SELECT business__orders.*, business.business_name
            FROM business__orders
            LEFT JOIN business ON business__orders.business_id = business.business_id
            WHERE business__orders.business_id IN (?)
        `;

        let conditionValue = [businessIds];
        let conditionCols = [];

        if (business_name) {
            conditionCols.push(`business.business_name = ?`);
            conditionValue.push(business_name);
        }

        if (type) {
            conditionCols.push(`business__orders.business_order_status = ?`);
            conditionValue.push(type);
        }

        if (keyword) {
            conditionCols.push(`business__orders.secret_order_id LIKE ?`);
            conditionValue.push(`%${keyword}%`);
        }

        if (status) {
            conditionCols.push(`business__orders.business_order_status = ?`);
            conditionValue.push(status);
        }

        if (from_date && to_date) {
            conditionCols.push(`DATE(business__orders.business_order_date) BETWEEN ? AND ?`);
            conditionValue.push(from_date, to_date);
        }

        if (conditionCols.length > 0) {
            const conditionStr = " AND " + conditionCols.join(" AND ");
            query += conditionStr;
            query_count += conditionStr;
        }

        query += ` ORDER BY business__orders.business_order_id DESC LIMIT ?, ?`;


        const response = await PaginationQuery(query_count, query, conditionValue, limit, page);
        return res.status(200).json(response);

    } catch (error) {
        console.error("GetBusinessOrders error : ", error);
        return res.status(500).json({ success: false, message: "Internal server error", error });
    }
};


exports.GetOrderInfo = async (req, res) => {
    try {
        const { business_order_id } = req.query;

        if (!business_order_id) {
            return res.status(400).json({ success: false, message: "order_id is required" });
        }

        let query = `
        SELECT 
        business__orders.*,
        business.*,
        business__orders.business_order_address_id,
        business__users.user_name AS order_by_name 
        FROM business__orders
        LEFT JOIN business ON business__orders.business_order_business_id = business.business_id
        LEFT JOIN business__users ON business__orders.order_by = business__users.business_user_id
        WHERE business_order_id = ?`;

        let items_query = `
        SELECT 
        business__orders_items.*,
        business__orders.secret_order_id
        FROM business__orders_items 
        LEFT JOIN business__orders ON business__orders.business_order_id = business__orders_items.business_order_id
        WHERE business__orders_items.business_order_id = ?`;


        let [result] = await pool.query(query, [business_order_id])
        let [order_address] = await pool.query('SELECT * FROM business__addresses WHERE business_address_id = ?', [result[0]?.business_order_address_id ?? 0])
        let [items_result] = await pool.query(items_query, [business_order_id])

        return res.status(200).json({ success: true, data: result, items: items_result, order_address: order_address })

    } catch (error) {
        console.error("GetOrderInfo error: ", error);
        return res.status(500).json({ success: false, message: "Internal server error", error });
    }
};
