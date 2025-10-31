const pool = require("../../Config/db_pool");
const { global } = require("../../Config/global");
const { PaginationQuery } = require("../Helper/QueryHelper");



// ------------- business orders api // ------------- //
exports.GetBusinesses = async (req, res) => {
    try {
        const business_salesman_id = req.headers['business-salesman-id'];
        const { limit, page, } = req.query;

        console.log("business_salesman_id ===>", business_salesman_id)

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
        const business_salesman_id = req.headers['business-salesman-id'];
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

exports.GetBusinessesList = async (req, res) => {
    try {
        let query = "SELECT * FROM business";

        const [rows] = await pool.query(query)
        return res.json({ success: true, data: rows })
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: "Internal Server Error", error });
    }
}

// ------------- business orders api // ------------- //
exports.GetBusinessOrders = async (req, res) => {
    try {
        const business_salesman_id = req.headers['business-salesman-id'];
        const { limit, page, business_name, keyword, status, from_date, to_date } = req.query;

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

        if (business_name) {
            conditions.push(`business.business_name LIKE ?`);
            conditionValue.push(`%${business_name}%`);
        }

        if (keyword) {
            conditions.push(`business__orders.secret_order_id LIKE ?`);
            conditionValue.push(`%${keyword}%`);
        }

        if (status) {
            conditions.push(`business__orders.business_order_status = ?`);
            conditionValue.push(status);
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


// ------------- business Details wizard  // ------------- //
exports.GetBusinessDashboard = async (req, res) => {
    try {
        const { business_id } = req.query;
        const business_salesman_id = req.headers['business-salesman-id'];

        if (!business_id) {
            return res.status(400).json({ success: false, message: "business_id is required" });
        }

        // Check if business exists & belongs to salesman
        const [businessRows] = await pool.query(
            `SELECT * FROM business WHERE business_id = ? AND business_salesman_id = ?`,
            [business_id, business_salesman_id]
        );

        if (businessRows.length === 0) {
            return res.status(404).json({ success: false, message: "Business not found or not linked to this salesman" });
        }

        // Queries
        const total_orders_query = `
            SELECT COUNT(*) AS total_orders 
            FROM business__orders 
            WHERE business_order_business_id = ?`;

        const delivered_orders_query = `
            SELECT COUNT(*) AS total_delivered_orders 
            FROM business__orders 
            WHERE business_order_status = 5 
            AND business_order_business_id = ?`;

        const pending_orders_query = `
            SELECT COUNT(*) AS total_pending_orders 
            FROM business__orders 
            WHERE business_order_status = 0 
            AND business_order_business_id = ?`;

        const cancelled_orders_query = `
            SELECT COUNT(*) AS total_cancelled_orders 
            FROM business__orders 
            WHERE business_order_status = 6 
            AND business_order_business_id = ?`;

        const total_credit_query = `
            SELECT SUM(business_credit_limit) AS total_credit_limit 
            FROM business
            WHERE business_id = ?`;

        const used_credit_query = `
            SELECT SUM(business_credit_limit - business_credit_balance) AS total_used_credit_amount 
            FROM business
            WHERE business_id = ?`;

        const remaining_credit_query = `
            SELECT SUM(business_credit_balance) AS total_remaining_credit 
            FROM business
            WHERE business_id = ?`;

        const reward_points_query = `
            SELECT SUM(business_reward_points_balance) AS total_reward_points 
            FROM business
            WHERE business_id = ?`;

        // Run all queries in parallel
        const [
            [totalOrdersRows],
            [deliveredOrdersRows],
            [pendingOrdersRows],
            [cancelledOrdersRows],
            [totalCreditRows],
            [usedCreditRows],
            [remainingCreditRows],
            [rewardPointsRows]
        ] = await Promise.all([
            pool.query(total_orders_query, [business_id]),
            pool.query(delivered_orders_query, [business_id]),
            pool.query(pending_orders_query, [business_id]),
            pool.query(cancelled_orders_query, [business_id]),
            pool.query(total_credit_query, [business_id]),
            pool.query(used_credit_query, [business_id]),
            pool.query(remaining_credit_query, [business_id]),
            pool.query(reward_points_query, [business_id]),
        ]);

        return res.status(200).json({
            success: true,
            data: {
                total_orders: totalOrdersRows[0].total_orders || 0,
                total_delivered_orders: deliveredOrdersRows[0].total_delivered_orders || 0,
                total_pending_orders: pendingOrdersRows[0].total_pending_orders || 0,
                total_cancelled_orders: cancelledOrdersRows[0].total_cancelled_orders || 0,
                total_credit_limit: totalCreditRows[0].total_credit_limit || 0,
                total_used_credit_amount: usedCreditRows[0].total_used_credit_amount || 0,
                total_remaining_credit: remainingCreditRows[0].total_remaining_credit || 0,
                total_reward_points: rewardPointsRows[0].total_reward_points || 0
            }
        });

    } catch (error) {
        console.error("Error in GetBusinessDashboard:", error);
        return res.status(500).json({ success: false, message: "Internal server error", error });
    }
};

exports.GetBusinessDocuments = async (req, res) => {
    try {
        const business_salesman_id = req.headers['business-salesman-id'];
        const { business_id } = req.query;

        if (!business_salesman_id || !business_id) {
            return res.status(400).json({
                success: false,
                message: "business_salesman_id and business_id are required"
            });
        }

        // Validate that this business belongs to the salesman
        const [businessRows] = await pool.query(
            `SELECT business_id FROM business WHERE business_id = ? AND business_salesman_id = ?`,
            [business_id, business_salesman_id]
        );

        if (businessRows.length === 0) {
            return res.json({ success: false, message: "No business found for this salesman" });
        }

        // Fetch documents for the business with full URL
        const [documentRows] = await pool.query(
            `SELECT *,
             CONCAT('${global.b2b_base_server_file_url}public/business/documents/', document_path) AS business_document_url
             FROM business__documents 
             WHERE business_id = ?`,
            [business_id]
        );

        return res.json({ success: true, data: documentRows });

    } catch (error) {
        console.error("GetBusinessDocuments error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
};


exports.GetBusinessBrands = async (req, res) => {
    try {
        const business_salesman_id = req.headers['business-salesman-id'];
        const { business_id } = req.query;

        if (!business_salesman_id || !business_id) {
            return res.status(400).json({
                success: false,
                message: "business_salesman_id and business_id are required"
            });
        }
        const [businessRows] = await pool.query(
            `SELECT * FROM business WHERE business_id = ? AND business_salesman_id = ?`,
            [business_id, business_salesman_id]
        );

        if (businessRows.length === 0) {
            return res.json({ success: false, message: "No business found" });
        }

        const [rows] = await pool.query(
            `SELECT * FROM business__brands 
             WHERE business_id = ?`,
            [business_id]
        );

        return res.json({ success: true, data: rows });

    } catch (error) {
        console.log("Get Business Brands error : ", error);
        return res.json({ success: false, message: "Internal server error : ", error });
    }
}

exports.GetBusinessOrdersList = async (req, res) => {
    try {
        const business_salesman_id = req.headers['business-salesman-id'];
        const { business_id } = req.query;

        if (!business_salesman_id || !business_id) {
            return res.status(400).json({
                success: false,
                message: "business_salesman_id and business_id are required"
            });
        }

        const [businessRows] = await pool.query(
            `SELECT * FROM business WHERE business_id = ? AND business_salesman_id = ?`,
            [business_id, business_salesman_id]
        );

        if (businessRows.length === 0) {
            return res.json({ success: false, message: "No business found" });
        }

        const [rows] = await pool.query(
            `SELECT * FROM business__orders 
             WHERE business_order_business_id = ?`,
            [business_id]
        );

        return res.json({ success: true, data: rows });

    } catch (error) {
        console.log("Get Business Orders error : ", error);
        return res.json({ success: false, message: "Internal server error : ", error });
    }
}

exports.GetBusinessCrditLimit = async (req, res) => {
    try {
        const business_salesman_id = req.headers['business-salesman-id'];
        const { business_id } = req.query;

        if (!business_salesman_id || !business_id) {
            return res.status(400).json({
                success: false,
                message: "business_salesman_id and business_id are required"
            });
        }

        const [businessRows] = await pool.query(
            `SELECT * FROM business WHERE business_id = ? AND business_salesman_id = ?`,
            [business_id, business_salesman_id]
        );

        if (businessRows.length === 0) {
            return res.json({ success: false, message: "No business found" });
        }

        let query = `
            SELECT 
                rcl.*,
                COALESCE(b.business_credit_balance, 0) AS existing_credit_limit,
                reqUser.business_admin_user_name AS requested_by_name,
                apprUser.business_admin_user_name AS approved_by_name
            FROM business__requests_credit_limit rcl
            LEFT JOIN business b 
                ON rcl.business_id = b.business_id
            LEFT JOIN business__admin_users reqUser 
                ON rcl.request_by = reqUser.business_admin_user_id
            LEFT JOIN business__admin_users apprUser 
                ON rcl.approved_by = apprUser.business_admin_user_id
            WHERE rcl.business_id = ?
            ORDER BY rcl.business_request_credit_limit_id DESC
        `;

        // ✅ Run query
        const [rows] = await pool.query(query, [business_id]);

        return res.json({ success: true, data: rows });

    } catch (error) {
        console.log("Get Business Credit Limit error : ", error);
        return res.json({ success: false, message: "Internal server error : ", error });
    }
}

exports.GetBusinessDueDays = async (req, res) => {
    try {
        const business_salesman_id = req.headers['business-salesman-id'];
        const { business_id } = req.query;

        if (!business_salesman_id || !business_id) {
            return res.status(400).json({
                success: false,
                message: "business_salesman_id and business_id are required"
            });
        }

        const [businessRows] = await pool.query(
            `SELECT * FROM business WHERE business_id = ? AND business_salesman_id = ?`,
            [business_id, business_salesman_id]
        );

        if (businessRows.length === 0) {
            return res.json({ success: false, message: "No business found" });
        }

        let query = `
            SELECT 
                rcl.*,
                COALESCE(b.due_days, 0) AS existing_due_days,
                reqUser.business_admin_user_name AS requested_by_name,
                apprUser.business_admin_user_name AS approved_by_name
            FROM business__requests_due_days rcl
            LEFT JOIN business b 
                ON rcl.business_id = b.business_id
            LEFT JOIN business__admin_users reqUser 
                ON rcl.request_by = reqUser.business_admin_user_id
            LEFT JOIN business__admin_users apprUser 
                ON rcl.approved_by = apprUser.business_admin_user_id
            WHERE rcl.business_id = ?
            ORDER BY rcl.business_request_due_days_id DESC
        `;

        // ✅ Run query
        const [rows] = await pool.query(query, [business_id]);

        return res.json({ success: true, data: rows });

    } catch (error) {
        console.log("Get Business Due Days error : ", error);
        return res.json({ success: false, message: "Internal server error : ", error });
    }
}

// ------------- business Details wizard  ------------- //


// ------------- business Details wizard  ------------- //
exports.GetOrderTimeLine = async (req, res) => {
    try {
        const { business_order_id } = req.query;

        if (!business_order_id) {
            return res.status(400).json({ success: false, message: 'Missing business_order_id' });
        }

        const [rows] = await pool.query(
            `SELECT 
             business__orders_timeline.*,
            business__admin_users.business_admin_user_name AS action_by_name
            FROM business__orders_timeline
            LEFT JOIN business__admin_users ON business__orders_timeline.business_order_action_by = business__admin_users.business_admin_user_id
            WHERE business_order_id = ?
            ORDER BY business_order_timeline_datetime DESC`,
            [business_order_id]);

        return res.status(200).json({ success: true, data: rows });

    } catch (error) {
        console.log("error : ", error)
        return res.json({ success: false, message: "Internal server error ", error })
    }
}