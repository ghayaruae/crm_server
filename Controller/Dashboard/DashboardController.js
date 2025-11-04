const pool = require("../../Config/db_pool");

exports.GetDashboardData = async (req, res) => {
    try {
        const business_salesman_id = req.headers['business-salesman-id'];

        if (!business_salesman_id) {
            return res.json({ success: false, message: "Missing business-salesman-id header" });
        }

        // 🟢 Get all business IDs of this salesman
        const [businessRows] = await pool.query(
            `SELECT business_id FROM business WHERE business_salesman_id = ?`,
            [business_salesman_id]
        );

        const businessIds = businessRows.map(b => b.business_id);

        if (businessIds.length === 0) {
            return res.json({
                success: true,
                data: {
                    total_business: 0,
                    total_inactive_business: 0,
                    total_orders: 0,
                    total_pending_orders: 0
                }
            });
        }

        const [totalInactive] = await pool.query(
            `SELECT COUNT(*) AS total_inactive_business FROM business WHERE business_salesman_id = ? AND is_active = 0 AND business_is_deleted = 0`,
            [business_salesman_id]
        );

        const [totalBusiness] = await pool.query(
            `SELECT COUNT(*) AS total_assign_business FROM business WHERE business_salesman_id = ? AND business_is_deleted = 0`,
            [business_salesman_id]
        );

        // 🟢 Total pending orders
        const [totalPending] = await pool.query(
            `SELECT COUNT(*) AS total_pending_orders FROM business__orders WHERE business_order_business_id IN (?) AND business_order_status = 0`,
            [businessIds]
        );

        const [salesman_info] = await pool.query(`
            SELECT * FROM business__salesmans
            LEFT JOIN business__salesmans_targets ON business__salesmans.business_salesman_id = business__salesmans_targets.business_salesman_id
            WHERE business__salesmans.business_salesman_id = ?`
            , [business_salesman_id]);

        return res.json({
            success: true,
            data: {
                total_assign_business: totalBusiness[0].total_assign_business || 0,
                total_inactive_business: totalInactive[0].total_inactive_business || 0,
                total_pending_orders: totalPending[0].total_pending_orders || 0
            },
            salesman_info: salesman_info[0]
        });

    } catch (error) {
        console.log('error', error);
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

        const [businesses] = await pool.query(
            `
            SELECT 
                b.business_id,
                b.business_name,
                b.business_contact_number,
                b.business_email,
                MAX(o.business_order_date) AS last_order_date
            FROM business b
            LEFT JOIN business__orders o 
                ON b.business_id = o.business_order_business_id
            WHERE b.business_salesman_id = ?
            GROUP BY b.business_id, b.business_name, b.business_contact_number, b.business_email
            HAVING 
                last_order_date IS NULL 
                OR last_order_date < DATE_SUB(CURDATE(), INTERVAL 2 DAY)
            ORDER BY last_order_date ASC
            `,
            [business_salesman_id]
        );

        return res.json({
            success: true,
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
        const { year, month } = req.query;

        if (!business_salesman_id) {
            return res.json({ success: false, message: "Missing business-salesman-id header" });
        }

        if (!year || !month) {
            return res.json({ success: false, message: "Missing year or month parameter" });
        }

        // 🟢 Query monthly sales per business
        const [salesData] = await pool.query(
            `
            SELECT 
                b.business_id,
                b.business_name,
                IFNULL(SUM(o.business_order_grand_total), 0) AS total_sales,
                COUNT(o.business_order_id) AS total_orders
            FROM business b
            LEFT JOIN business__orders o
                ON b.business_id = o.business_order_business_id
                AND YEAR(o.business_order_date) = ?
                AND MONTH(o.business_order_date) = ?
            WHERE b.business_salesman_id = ?
            GROUP BY b.business_id, b.business_name
            ORDER BY total_sales DESC
            `,
            [year, month, business_salesman_id]
        );

        // 🧮 Process data for charts
        const labels = salesData.map(row => row.business_name);
        const sales = salesData.map(row => Number(row.total_sales));
        const orders = salesData.map(row => Number(row.total_orders));
        const total_sales_overall = sales.reduce((sum, val) => sum + val, 0);

        return res.json({
            success: true,
            message: `Monthly sales chart data for ${year}-${month}`,
            labels,
            sales,
            orders,
            total_sales_overall,
        });

    } catch (error) {
        console.error("Error fetching chart data:", error);
        return res.json({
            success: false,
            message: "Internal server error while fetching chart data.",
            error: error.message
        });
    }
};

exports.GetSalesmanTargetChartData = async (req, res) => {
    try {
        const business_salesman_id = req.headers['business-salesman-id'];

        // Fetch latest target row for salesman
        const [targetRow] = await pool.query(
            `SELECT business_salesman_target, business_salesman_target_from, business_salesman_target_to 
             FROM business__salesmans_targets 
             WHERE business_salesman_id = ? 
             ORDER BY business_salesman_target_id DESC LIMIT 1`,
            [business_salesman_id]
        );

        if (!targetRow || targetRow.length === 0) {
            return res.status(404).json({ message: "Target not assigned" });
        }

        const target = targetRow[0];

        // Fetch all businesses under this salesman
        const [businesses] = await pool.query(
            `SELECT business_id FROM business WHERE business_salesman_id = ?`,
            [business_salesman_id]
        );

        const business_ids = businesses?.map(item => item.business_id) || [];

        if (!business_ids.length) {
            // No businesses found → No achievement
            return res.json({
                total_target_amount: parseFloat(target.business_salesman_target),
                total_achievement_amount: 0,
                total_pending_amount: parseFloat(target.business_salesman_target)
            });
        }

        // Fetch orders for these businesses in target date range
        const [orders] = await pool.query(
            `SELECT SUM(business_order_grand_total) AS achievement
             FROM business__orders
             WHERE business_order_business_id IN (?)
             AND DATE(business_order_date) BETWEEN ? AND ?`,
            [
                business_ids,
                target.business_salesman_target_from,
                target.business_salesman_target_to
            ]
        );

        const achievementAmount = orders[0].achievement || 0;
        const targetAmount = parseFloat(target.business_salesman_target);
        const pendingAmount = Math.max(targetAmount - achievementAmount, 0);

        return res.json({
            success: true,
            data: {
                total_target_amount: parseFloat(targetAmount).toFixed(2),
                total_achievement_amount: parseFloat(achievementAmount).toFixed(2),
                total_pending_amount: parseFloat(pendingAmount).toFixed(2)
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Server error" });
    }
};

