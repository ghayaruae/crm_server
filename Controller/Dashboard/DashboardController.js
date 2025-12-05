const pool = require("../../Config/db_pool");

exports.GetDashboardData = async (req, res) => {
    try {
        const business_salesman_id = req.headers['business-salesman-id'];

        if (!business_salesman_id) {
            return res.json({ success: false, message: "Missing business-salesman-id header" });
        }

        // 🟢 Get business IDs of this salesman (ONLY non-deleted)
        const [businessRows] = await pool.query(
            `SELECT business_id 
             FROM business 
             WHERE business_salesman_id = ? AND business_is_deleted = '0'`,
            [business_salesman_id]
        );

        const businessIds = businessRows.map(b => b.business_id);

        // 🟢 Get salesman info first (salesman must exist even without target)
        const [salesmanRows] = await pool.query(
            `SELECT * FROM business__salesmans WHERE business_salesman_id = ?`,
            [business_salesman_id]
        );

        let salesman_info = null;

        if (salesmanRows.length > 0) {
            // Salesman exists → now get target (may not exist)
            const [targetRows] = await pool.query(
                `SELECT * FROM business__salesmans_targets WHERE business_salesman_id = ?`,
                [business_salesman_id]
            );

            // Merge salesman + target
            salesman_info = {
                ...salesmanRows[0],
                ...(targetRows[0] || {
                    target_month: null,
                    target_amount: null,
                    achieved_amount: null
                })
            };
        }

        // If no businesses assigned
        if (businessIds.length === 0) {
            return res.json({
                success: true,
                data: {
                    total_assign_business: 0,
                    total_inactive_business: 0,
                    total_pending_orders: 0
                },
                salesman_info: salesman_info // <-- ALWAYS RETURN SALESMAN INFO
            });
        }

        // 🟢 Total inactive businesses
        const [totalInactive] = await pool.query(
            `SELECT COUNT(*) AS total_inactive_business 
             FROM business 
             WHERE business_salesman_id = ? 
             AND is_active = 0 
             AND business_is_deleted = '0'`,
            [business_salesman_id]
        );

        // 🟢 Total assigned business count
        const [totalBusiness] = await pool.query(
            `SELECT COUNT(*) AS total_assign_business 
             FROM business 
             WHERE business_salesman_id = ? 
             AND business_is_deleted = '0'`,
            [business_salesman_id]
        );

        // 🟢 Total pending orders
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
            salesman_info: salesman_info
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
            return res.json({ success: false, message: "Missing business-salesman-id header" });
        }

        // 1️⃣ Fetch latest target row for salesman
        const [targetRow] = await pool.query(
            `SELECT 
                business_salesman_target AS target_amount, 
                business_salesman_target_from AS target_from, 
                business_salesman_target_to AS target_to
             FROM business__salesmans_targets 
             WHERE business_salesman_id = ? 
             ORDER BY business_salesman_target_id DESC LIMIT 1`,
            [business_salesman_id]
        );

        // If no target assigned → return zero achievement
        if (!targetRow || targetRow.length === 0) {
            return res.json({
                success: true,
                data: {
                    total_target_amount: 0,
                    total_achievement_amount: 0,
                    total_pending_amount: 0
                }
            });
        }

        const target = targetRow[0];
        const targetAmount = parseFloat(target.target_amount);

        // 2️⃣ Fetch all businesses under this salesman
        const [businesses] = await pool.query(
            `SELECT business_id 
             FROM business 
             WHERE business_salesman_id = ? AND business_is_deleted = '0'`,
            [business_salesman_id]
        );

        const businessIds = businesses.map(b => b.business_id);

        // If no businesses → achievement = 0
        if (businessIds.length === 0) {
            return res.json({
                success: true,
                data: {
                    total_target_amount: targetAmount,
                    total_achievement_amount: 0,
                    total_pending_amount: targetAmount
                }
            });
        }

        // 3️⃣ Fetch total orders in date range
        const [orders] = await pool.query(
            `SELECT 
                SUM(business_order_grand_total) AS achievement
             FROM business__orders
             WHERE business_order_business_id IN (?)
             AND DATE(business_order_date) BETWEEN ? AND ?`,
            [
                businessIds,
                target.target_from,
                target.target_to
            ]
        );

        const achievementAmount = parseFloat(orders[0].achievement || 0);

        // 4️⃣ Calculate pending amount
        const pendingAmount = Math.max(targetAmount - achievementAmount, 0);

        return res.json({
            success: true,
            data: {
                total_target_amount: targetAmount,
                total_achievement_amount: achievementAmount,
                total_pending_amount: pendingAmount
            }
        });

    } catch (error) {
        console.error(error);
        return res.json({ success: false, message: "Server error", error });
    }
};


