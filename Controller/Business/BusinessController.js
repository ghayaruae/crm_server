const pool = require("../../Config/db_pool");
const { global } = require("../../Config/global");
const { PaginationQuery } = require("../Helper/QueryHelper");

// ------------- business orders api // ------------- //
exports.GetBusinesses = async (req, res) => {
    try {
        const business_salesman_id = req.headers['business-salesman-id'];
        const { limit, page, keyword, status } = req.query;

        // 🛑 If salesman ID missing
        if (!business_salesman_id) {
            return res.json({ success: false, message: "Missing business-salesman-id header" });
        }

        // Base queries (non-deleted only)
        let query_count = `
            SELECT COUNT(*) AS total_records 
            FROM business 
            WHERE business_is_deleted = '0'
        `;

        let query = `
            SELECT * 
            FROM business 
            WHERE business_is_deleted = '0'
        `;

        let conditionValue = [];

        // 🟢 Keyword filter
        if (keyword) {
            query += ` AND business.business_name LIKE ? `;
            query_count += ` AND business.business_name LIKE ? `;
            conditionValue.push(`%${keyword}%`);
        }

        // 🟢 Status filter
        if (status) {
            query += ` AND business.is_active = ? `;
            query_count += ` AND business.is_active = ? `;
            conditionValue.push(status);
        }

        // 🟢 IMPORTANT FIX: Always filter by salesman
        query += ` AND business.business_salesman_id = ? `;
        query_count += ` AND business.business_salesman_id = ? `;
        conditionValue.push(business_salesman_id);

        // Sorting + Limit
        query += ` ORDER BY business.business_id DESC LIMIT ?, ?`;

        // Pagination
        const response = await PaginationQuery(
            query_count,
            query,
            conditionValue,
            limit,
            page
        );

        return res.status(200).json(response);

    } catch (error) {
        console.log("Get Businesses error : ", error);
        return res.json({ success: false, message: "Internal server error", error });
    }
};

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
             WHERE business_id = ? `,
            [business_id]
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

        const business_salesman_id = req.headers['business-salesman-id'];


        let query = "SELECT * FROM business WHERE business_salesman_id = ? AND business_is_deleted = '0'";

        const [rows] = await pool.query(query, [business_salesman_id])
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

        if (!business_salesman_id) {
            return res.status(400).json({
                success: false,
                message: "business_salesman_id is required"
            });
        }

        // ==============================
        // STEP 1 → Fetch Allowed business_ids
        // ==============================
        const [businessRows] = await pool.query(
            `SELECT business_id FROM business WHERE business_salesman_id = ?`,
            [business_salesman_id]
        );

        if (businessRows.length === 0) {
            return res.json({
                success: true,
                total_records: 0,
                total_pages: 0,
                page: 1,
                next: false,
                prev: false,
                data: []
            });
        }

        const businessIds = businessRows.map(b => b.business_id);
        const placeholders = businessIds.map(() => '?').join(',');

        // ==============================
        // Filters
        // ==============================
        const conditionCols = [];
        const conditionValue = [...businessIds];

        if (req.query.business_name) {
            conditionCols.push(`business.business_name LIKE ?`);
            conditionValue.push(`%${req.query.business_name}%`);
        }

        const statusFilter = req.query.type || req.query.status;
        if (statusFilter) {
            conditionCols.push(`business__orders.business_order_status = ?`);
            conditionValue.push(statusFilter);
        }

        if (req.query.keyword) {
            conditionCols.push(`business__orders.secret_order_id LIKE ?`);
            conditionValue.push(`%${req.query.keyword}%`);
        }

        if (req.query.from_date && req.query.to_date) {
            conditionCols.push(`DATE(business__orders.business_order_date) BETWEEN ? AND ?`);
            conditionValue.push(req.query.from_date, req.query.to_date);
        }

        const where = conditionCols.length > 0
            ? " AND " + conditionCols.join(" AND ")
            : "";

        // ==============================
        // Sort Order (ASC / DESC)
        // ==============================
        const sort_order = (req.query.sort_order || "DESC").toUpperCase();

        // ==============================
        // Pagination
        // ==============================
        const limit = req.query.limit ? Number(req.query.limit) : 20;
        const page = req.query.page ? Number(req.query.page) : 1;
        const start = (page - 1) * limit;

        // ==============================
        // Step 2 → Fetch Only Order IDs
        // ==============================
        const orderIdQuery = `
            SELECT DISTINCT business__orders.business_order_id
            FROM business__orders
            LEFT JOIN business ON business__orders.business_order_business_id = business.business_id
            WHERE business__orders.business_order_business_id IN (${placeholders})
            ${where}
            ORDER BY business__orders.business_order_id ${sort_order}
            LIMIT ?, ?
        `;

        const [orderIdRows] = await pool.query(orderIdQuery, [...conditionValue, start, limit]);

        if (orderIdRows.length === 0) {
            return res.json({
                success: true,
                total_records: 0,
                total_pages: 0,
                page,
                next: false,
                prev: false,
                data: []
            });
        }

        const orderIds = orderIdRows.map(r => r.business_order_id);

        // ==============================
        // Step 3 → Total Records
        // ==============================
        const totalQuery = `
            SELECT COUNT(DISTINCT business__orders.business_order_id) AS total_records
            FROM business__orders
            LEFT JOIN business ON business__orders.business_order_business_id = business.business_id
            WHERE business__orders.business_order_business_id IN (${placeholders})
            ${where}
        `;

        const [[countRow]] = await pool.query(totalQuery, conditionValue);
        const total_records = countRow.total_records;
        const total_pages = Math.ceil(total_records / limit);

        // ==============================
        // Step 4 → Fetch Full Order + Items
        // ==============================
        const fullDataQuery = `
            SELECT business__orders.*, business.*, business__orders_items.*
            FROM business__orders
            LEFT JOIN business ON business__orders.business_order_business_id = business.business_id
            LEFT JOIN business__orders_items ON business__orders.business_order_id = business__orders_items.business_order_id
            WHERE business__orders.business_order_id IN (${orderIds.join(",")})
            ORDER BY business__orders.business_order_id ${sort_order}
        `;

        const [rows] = await pool.query(fullDataQuery);

        // ==============================
        // Step 5 → Combine Items + Correct Total
        // ==============================
        const ordersMap = {};

        rows.forEach(row => {
            const id = row.business_order_id;

            if (!ordersMap[id]) {
                ordersMap[id] = {
                    ...row,
                    items: [],
                    corrected_grand_total: Number(row.business_order_grand_total) || 0
                };
            }

            ordersMap[id].items.push(row);

            if (Number(row.item_status) === 4) {
                const itemTotal =
                    (Number(row.business_order_item_price) || 0) *
                    (Number(row.business_order_qty) || 0);
                ordersMap[id].corrected_grand_total -= itemTotal;
            }
        });

        // ==============================
        // Step 6 → Stable Sorting
        // ==============================
        let finalData = Object.values(ordersMap).sort((a, b) => {
            if (sort_order === "ASC") {
                return a.business_order_id - b.business_order_id;
            }
            return b.business_order_id - a.business_order_id;
        });

        // Add display field
        finalData = finalData.map(order => ({
            ...order,
            display_corrected_grand_total: `AED ${order.corrected_grand_total.toFixed(2)}`
        }));

        // ==============================
        // Final Response
        // ==============================
        return res.status(200).json({
            success: true,
            total_records,
            total_pages,
            page,
            next: page < total_pages,
            prev: page > 1,
            data: finalData
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message
        });
    }
};

exports.GetOrderInfo = async (req, res) => {
    try {
        const { business_id, secret_order_id } = req.query;

        if (!secret_order_id) {
            return res.status(400).json({ success: false, message: 'Business Order ID is required' });
        }

        if (!business_id) {
            return res.status(400).json({ success: false, message: 'Business ID is required' });
        }

        // ==============================
        // ORDER DETAILS
        // ==============================
        const orderQuery = `
        SELECT 
            *,
            CASE business__orders.business_order_status
                WHEN 0 THEN 'Pending'
                WHEN 1 THEN 'Assigned'
                WHEN 2 THEN 'Accepted'
                WHEN 3 THEN 'Packed'
                WHEN 4 THEN 'Shipped'
                WHEN 5 THEN 'Delivered'
                WHEN 6 THEN 'Cancelled'
                WHEN 7 THEN 'Returned'
                WHEN 8 THEN 'Returned Collected'
                WHEN 9 THEN 'Returned Received'
                ELSE 'Unknown'
            END AS business_order_status_label,

            CONCAT('AED ', business_order_sub_total, '.00') AS display_sub_total,
            CONCAT('AED ', business_order_grand_total, '.00') AS display_grand_total,

            ROUND(business_order_grand_total / 1.05, 2) AS grand_total_excl_vat,
            ROUND(business_order_grand_total - (business_order_grand_total / 1.05), 2) AS grand_total_vat_amount,

            CONCAT('AED ', ROUND(business_order_grand_total / 1.05, 2)) AS display_excl_vat,
            CONCAT('AED ', ROUND(business_order_grand_total - (business_order_grand_total / 1.05), 2)) AS display_vat_amount

        FROM business__orders
        LEFT JOIN business 
            ON business__orders.business_order_business_id = business.business_id
        WHERE secret_order_id = ? 
        AND business_order_business_id = ?
        LIMIT 1
        `;

        let [[result]] = await pool.query(orderQuery, [secret_order_id, business_id]);

        if (!result) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        // ==============================
        // ORDER ITEMS + RETURNS + STORE
        // ==============================
        const itemsQuery = `
            SELECT 
                boi.item_status,

                boi.business_order_business_id AS business_id,
                boi.business_order_item_id AS item_id,
                boi.business_order_item_name AS item_name,
                boi.business_order_item_number AS item_number,
                boi.business_order_item_brand AS item_brand,
                boi.business_order_item_price AS item_price,
                boi.business_order_item_discount AS item_discount,
                boi.business_order_qty AS item_qty,
                boi.business_order_sub_total AS item_sub_total,

                ROUND(boi.business_order_item_price / 1.05, 2) AS item_price_excl_vat,
                ROUND(boi.business_order_item_price - (boi.business_order_item_price / 1.05), 2) AS item_vat_amount,

                boi.business_order_item_picture_url AS item_img_url,
                boi.business_order_item_url AS item_url,

                bri.*, 
                br.*,
                stores.store_name

            FROM business__orders_items AS boi
            LEFT JOIN business__returns_items AS bri 
                ON boi.business_order_item_id = bri.business_return_order_item_id
            LEFT JOIN business__returns AS br
                ON bri.business_return_id = br.business_return_id
            LEFT JOIN inventory__stores AS stores
                ON boi.business_order_item_store_id = stores.store_id

            WHERE boi.business_order_id = ?
        `;

        let [items] = await pool.query(itemsQuery, [result.business_order_id]);

        // Remove duplicates
        const unique = {};
        items.forEach(i => unique[i.item_id] = i);
        items = Object.values(unique);

        // ==============================
        // MINUS RETURNED ITEMS (item_status = 4)
        // ==============================
        const returnedItems = items.filter(it => Number(it.item_status) === 4);

        const totalReturnedSubTotal = returnedItems.reduce((s, it) => s + Number(it.item_sub_total || 0), 0);
        const totalReturnedExclVat = returnedItems.reduce((s, it) => s + Number(it.item_price_excl_vat || 0), 0);
        const totalReturnedVatAmount = returnedItems.reduce((s, it) => s + Number(it.item_vat_amount || 0), 0);

        // Corrected totals
        const correctedGrandTotal = Number(result.business_order_grand_total) - totalReturnedSubTotal;
        const correctedExclVat = Number(result.grand_total_excl_vat) - totalReturnedExclVat;
        const correctedVatAmount = Number(result.grand_total_vat_amount) - totalReturnedVatAmount;

        // Attach in result
        result.corrected_grand_total = correctedGrandTotal;
        result.display_corrected_grand_total = `AED ${correctedGrandTotal.toFixed(2)}`;

        result.corrected_total_excl_vat = correctedExclVat;
        result.display_corrected_excl_vat = `AED ${correctedExclVat.toFixed(2)}`;

        result.corrected_vat_amount = correctedVatAmount;
        result.display_corrected_vat_amount = `AED ${correctedVatAmount.toFixed(2)}`;

        // ==============================
        // BUSINESS ADDRESS
        // ==============================
        const addressQuery = `
            SELECT * FROM business__addresses 
            WHERE default_address = 1 AND business_id = ?
            LIMIT 1
        `;
        const [[address]] = await pool.query(addressQuery, [business_id]);

        return res.status(200).json({
            success: true,
            data: result,
            items,
            address
        });

    } catch (error) {
        console.error("GetOrderInfo Error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error", error });
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
            `SELECT * FROM business WHERE business_id = ?`,
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
            `SELECT business_id FROM business WHERE business_id = ?`,
            [business_id]
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
            `SELECT * FROM business WHERE business_id = ?`,
            [business_id]
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
            `SELECT * FROM business WHERE business_id = ?`,
            [business_id]
        );

        if (businessRows.length === 0) {
            return res.json({ success: false, message: "No business found" });
        }

        const [rows] = await pool.query(
            `SELECT * FROM business__orders 
             WHERE business_order_business_id = ? 
             ORDER BY business_order_id DESC`,
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
            `SELECT * FROM business WHERE business_id = ?`,
            [business_id]
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
            `SELECT * FROM business WHERE business_id = ?`,
            [business_id]
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