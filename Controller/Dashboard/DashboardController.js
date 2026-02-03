const pool = require("../../Config/db_pool");

exports.GetDashboardData = async (req, res) => {
    try {
        const business_salesman_id = req.headers['business-salesman-id'];

        if (!business_salesman_id) {
            return res.json({ success: false, message: "Missing business-salesman-id header" });
        }

        // 1️⃣ Fetch Businesses
        const [businessRows] = await pool.query(
            `SELECT business_id 
             FROM business 
             WHERE business_salesman_id = ? AND business_is_deleted = '0'`,
            [business_salesman_id]
        );

        const businessIds = businessRows.map(b => b.business_id);

        // 2️⃣ Get Salesman Info
        const [salesmanRows] = await pool.query(
            `SELECT * FROM business__salesmans WHERE business_salesman_id = ?`,
            [business_salesman_id]
        );

        let salesman_info = salesmanRows.length ? salesmanRows[0] : null;

        // 3️⃣ Get Latest Target Assigned to Salesman
        let target_info = null;

        const [targetRows] = await pool.query(
            `SELECT 
                business_salesman_target AS target_amount,
                business_salesman_target_from AS target_from,
                business_salesman_target_to AS target_to
             FROM business__salesmans_targets
             WHERE business_salesman_id = ?
             ORDER BY business_salesman_target_id DESC
             LIMIT 1`,
            [business_salesman_id]
        );

        if (targetRows.length > 0) {
            target_info = targetRows[0];
        }

        // 4️⃣ Calculate Achievement (If target exists)
        let achievement_amount = 0;

        if (businessIds.length > 0 && target_info) {
            const placeholders = businessIds.map(() => '?').join(',');

            const query = `
                SELECT SUM(business_order_grand_total) AS achievement
                FROM business__orders
                WHERE business_order_business_id IN (${placeholders})
                AND DATE(business_order_date) BETWEEN ? AND ?
            `;

            const [achievementRows] = await pool.query(
                query,
                [...businessIds, target_info.target_from, target_info.target_to]
            );

            achievement_amount = parseFloat(achievementRows[0].achievement || 0);
        }

        // 5️⃣ Pending amount
        const pending_amount = target_info
            ? Math.max(parseFloat(target_info.target_amount) - achievement_amount, 0)
            : 0;

        // 6️⃣ Build salesperson info response
        const response_salesman_info = {
            ...salesman_info,
            target_amount: target_info ? Number(target_info.target_amount) : 0,
            target_from: target_info ? target_info.target_from : null,
            target_to: target_info ? target_info.target_to : null,
            achieved_amount: achievement_amount,
            pending_amount: pending_amount
        };

        // 7️⃣ Inactive businesses
        const [totalInactive] = await pool.query(
            `SELECT COUNT(*) AS total_inactive_business 
             FROM business 
             WHERE business_salesman_id = ? 
             AND is_active = 0 
             AND business_is_deleted = '0'`,
            [business_salesman_id]
        );

        // 8️⃣ Total assigned businesses
        const [totalBusiness] = await pool.query(
            `SELECT COUNT(*) AS total_assign_business 
             FROM business 
             WHERE business_salesman_id = ? 
             AND business_is_deleted = '0'`,
            [business_salesman_id]
        );

        // 9️⃣ Pending orders
        const [totalPending] = await pool.query(
            `SELECT COUNT(*) AS total_pending_orders 
             FROM business__orders 
             WHERE business_order_business_id IN (?) 
             AND business_order_status = 0`,
            [businessIds]
        );

        return res.json({
            success: true,
            data: {
                total_assign_business: totalBusiness[0]?.total_assign_business || 0,
                total_inactive_business: totalInactive[0]?.total_inactive_business || 0,
                total_pending_orders: totalPending[0]?.total_pending_orders || 0
            },
            salesman_info: response_salesman_info
        });

    } catch (error) {
        console.log('GetDashboardData error', error);
        return res.json({ success: false, message: "Internal server error", error });
    }
};

exports.GetBusinessesNoRecentOrders = async (req, res) => {
    try {
        const business_salesman_id = req.headers["business-salesman-id"];

        if (!business_salesman_id) {
            return res.json({
                success: false,
                message: "Missing business-salesman-id header",
            });
        }

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;

        // Count total matched businesses
        const [countRows] = await pool.query(
            `
            SELECT COUNT(*) AS total
            FROM (
                SELECT b.business_id
                FROM business b
                LEFT JOIN business__orders o 
                    ON b.business_id = o.business_order_business_id
                WHERE b.business_salesman_id = ?
                GROUP BY b.business_id
                HAVING 
                    MAX(o.business_order_date) IS NULL
                    OR MAX(o.business_order_date) < DATE_SUB(CURDATE(), INTERVAL 2 DAY)
            ) AS filtered
            `,
            [business_salesman_id]
        );

        const total_records = countRows[0].total;
        const total_pages = Math.ceil(total_records / limit);

        // Fetch businesses + total orders
        const [businesses] = await pool.query(
            `
            SELECT 
                b.business_id,
                b.business_name,
                b.business_contact_number,
                b.business_email,

                MAX(o.business_order_date) AS last_order_date,

                -- NEW: total orders
                COUNT(o.business_order_id) AS total_orders,

                -- fallback: days since order/registration
                CASE 
                    WHEN MAX(o.business_order_date) IS NULL 
                        THEN DATEDIFF(CURDATE(), b.business_registered_date)
                    ELSE 
                        DATEDIFF(CURDATE(), MAX(o.business_order_date))
                END AS no_order_since_days

            FROM business b
            LEFT JOIN business__orders o 
                ON b.business_id = o.business_order_business_id

            WHERE b.business_salesman_id = ?

            GROUP BY 
                b.business_id, 
                b.business_name, 
                b.business_contact_number, 
                b.business_email

            HAVING 
                last_order_date IS NULL 
                OR last_order_date < DATE_SUB(CURDATE(), INTERVAL 2 DAY)

            ORDER BY 
                no_order_since_days DESC,
                last_order_date ASC

            LIMIT ? OFFSET ?
            `,
            [business_salesman_id, limit, offset]
        );

        return res.json({
            success: true,
            total_records,
            total_pages,
            page,
            next: page < total_pages,
            prev: page > 1,
            data: businesses,
        });

    } catch (error) {
        console.log("error", error);
        return res.json({
            success: false,
            message: "Internal server error",
            error,
        });
    }
};

exports.GetMonthlySalesBySalesman = async (req, res) => {
    try {
        const business_salesman_id = req.headers["business-salesman-id"];
        const { from_date, to_date } = req.query;

        if (!business_salesman_id) {
            return res.json({ success: false, message: "Missing business-salesman-id header" });
        }

        if (!from_date || !to_date) {
            return res.json({ success: false, message: "Missing from_date or to_date" });
        }

        const [salesData] = await pool.query(
            `
            SELECT 
                DATE(o.business_order_date) AS order_date,
                IFNULL(SUM(o.business_order_grand_total), 0) AS total_sales,
                COUNT(o.business_order_id) AS total_orders
            FROM business__orders o
            INNER JOIN business b ON b.business_id = o.business_order_business_id
            WHERE b.business_salesman_id = ?
            AND o.business_order_status = 5
            AND DATE(o.business_order_date) BETWEEN ? AND ?
            GROUP BY DATE(o.business_order_date)
            ORDER BY order_date ASC
            `,
            [business_salesman_id, from_date, to_date]
        );

        const labels = salesData.map(row => row.order_date);
        const sales = salesData.map(row => Number(row.total_sales));
        const orders = salesData.map(row => Number(row.total_orders));

        return res.json({
            success: true,
            message: "Sales chart data",
            labels,
            sales,
            orders
        });

    } catch (error) {
        console.error("Error fetching chart data:", error);
        return res.json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
};


exports.GetSalesmanTargetChartData = async (req, res) => {
    try {
        const business_salesman_id = req.headers['business-salesman-id'];

        if (!business_salesman_id) {
            return res.json({
                success: false,
                message: "Missing business-salesman-id header"
            });
        }

        /* ===================== 1️⃣ Fetch Latest Target ===================== */
        const [targetRow] = await pool.query(
            `SELECT 
                business_salesman_target AS target_amount,
                business_salesman_target_from AS target_from,
                business_salesman_target_to AS target_to
             FROM business__salesmans_targets
             WHERE business_salesman_id = ?
             ORDER BY business_salesman_target_id DESC
             LIMIT 1`,
            [business_salesman_id]
        );

        // No target found
        if (!targetRow || targetRow.length === 0) {
            return res.json({
                success: true,
                data: {
                    total_target_amount: 0,
                    total_achievement_amount: 0,
                    total_pending_amount: 0,
                    above_achievement_amount: 0,
                    target_expired: false
                }
            });
        }

        const target = targetRow[0];
        const targetAmount = parseFloat(target.target_amount || 0);

        /* ===================== 2️⃣ Check Target Expiry ===================== */
        const today = new Date();
        const targetToDate = new Date(target.target_to);

        // Normalize time
        today.setHours(0, 0, 0, 0);
        targetToDate.setHours(0, 0, 0, 0);

        // 🔴 TARGET EXPIRED
        if (today > targetToDate) {
            return res.json({
                success: true,
                data: {
                    total_target_amount: targetAmount,
                    total_achievement_amount: 0,
                    total_pending_amount: targetAmount,
                    above_achievement_amount: 0,
                    target_from: target.target_from,
                    target_to: target.target_to,
                    target_expired: true
                }
            });
        }

        /* ===================== 3️⃣ Fetch Businesses ===================== */
        const [businesses] = await pool.query(
            `SELECT business_id
             FROM business
             WHERE business_salesman_id = ?
             AND business_is_deleted = '0'`,
            [business_salesman_id]
        );

        const businessIds = businesses.map(b => b.business_id);

        if (businessIds.length === 0) {
            return res.json({
                success: true,
                data: {
                    total_target_amount: targetAmount,
                    total_achievement_amount: 0,
                    total_pending_amount: targetAmount,
                    above_achievement_amount: 0,
                    target_from: target.target_from,
                    target_to: target.target_to,
                    target_expired: false
                }
            });
        }

        /* ===================== 4️⃣ Calculate Achievement ===================== */
        const placeholders = businessIds.map(() => '?').join(',');

        const sql = `
            SELECT SUM(business_order_grand_total) AS achievement
            FROM business__orders
            WHERE business_order_business_id IN (${placeholders})
            AND business_order_status = 5
            AND DATE(business_order_date) BETWEEN ? AND ?
        `;

        const [orders] = await pool.query(
            sql,
            [...businessIds, target.target_from, target.target_to]
        );

        const achievementAmount = parseFloat(orders[0]?.achievement || 0);

        /* ===================== 5️⃣ Calculations ===================== */
        const aboveAchievementAmount =
            achievementAmount > targetAmount
                ? achievementAmount - targetAmount
                : 0;

        const pendingAmount = Math.max(targetAmount - achievementAmount, 0);

        /* ===================== 6️⃣ Final Response ===================== */
        return res.json({
            success: true,
            data: {
                total_target_amount: targetAmount,
                total_achievement_amount: achievementAmount,
                total_pending_amount: pendingAmount,
                above_achievement_amount: aboveAchievementAmount,
                target_from: target.target_from,
                target_to: target.target_to,
                target_expired: false
            }
        });

    } catch (error) {
        console.error('GetSalesmanTargetChartData Error:', error);
        return res.json({
            success: false,
            message: "Server error"
        });
    }
};



exports.GetSalesmanDailySales = async (req, res) => {
    try {
        const business_salesman_id = req.headers['business-salesman-id'];
        if (!business_salesman_id) {
            return res.json({ success: false, message: "business-salesman-id is required" });
        }

        const { date } = req.query;
        const reportDate = date || new Date().toISOString().slice(0, 10);

        const [business] = await pool.query(
            `SELECT business_id FROM business WHERE business_salesman_id = ?`,
            [business_salesman_id]
        );

        if (!business.length) {
            return res.json({ success: false, message: "No business found" });
        }

        const business_ids = business.map(b => b.business_id);

        const [rows] = await pool.query(
            `
            SELECT 
                DATE(bo.business_order_date) AS sale_date,
                COUNT(DISTINCT bo.business_order_id) AS total_orders,
                SUM(boi.business_order_sub_total) AS total_sales
            FROM business__orders bo
            LEFT JOIN business__orders_items boi 
                ON bo.business_order_id = boi.business_order_id
            WHERE boi.item_status = 5
            AND bo.business_order_business_id IN (?)
            AND DATE(bo.business_order_date) = ?
            GROUP BY DATE(bo.business_order_date)
            `,
            [business_ids, reportDate]
        );

        return res.json({
            success: true,
            date: reportDate,
            data: rows[0] || {
                sale_date: reportDate,
                total_orders: 0,
                total_sales: 0
            }
        });

    } catch (error) {
        console.error("GetSalesmanDailySales error:", error);
        return res.json({ success: false, message: "Internal server error" });
    }
};


