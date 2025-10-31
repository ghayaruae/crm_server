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

        // 🟢 Total inactive businesses
        const [totalactive] = await pool.query(
            `SELECT COUNT(*) AS total_active_business FROM business WHERE business_salesman_id = ? AND is_active = 1`,
            [business_salesman_id]
        );

        const [totalInactive] = await pool.query(
            `SELECT COUNT(*) AS total_inactive_business FROM business WHERE business_salesman_id = ? AND is_active = 0`,
            [business_salesman_id]
        );

        // 🟢 Total orders
        const [totalOrders] = await pool.query(
            `SELECT COUNT(*) AS total_orders FROM business__orders WHERE business_order_business_id IN (?)`,
            [businessIds]
        );

        // 🟢 Total pending orders
        const [totalPending] = await pool.query(
            `SELECT COUNT(*) AS total_pending_orders FROM business__orders WHERE business_order_business_id IN (?) AND business_order_status = 0`,
            [businessIds]
        );

        const [salesman_info] = await pool.query(`SELECT * FROM business__salesmans WHERE business_salesman_id = ?`, [business_salesman_id]);

        return res.json({
            success: true,
            data: {
                total_active_business: totalactive[0].total_active_business || 0,
                total_inactive_business: totalInactive[0].total_inactive_business || 0,
                total_orders: totalOrders[0].total_orders || 0,
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
                b.business_mobile,
                b.business_email,
                MAX(o.business_order_date) AS last_order_date
            FROM business b
            LEFT JOIN business__orders o 
                ON b.business_id = o.business_order_business_id
            WHERE b.business_salesman_id = ?
            GROUP BY b.business_id, b.business_name, b.business_mobile, b.business_email
            HAVING (last_order_date IS NULL OR last_order_date < DATE_SUB(NOW(), INTERVAL 2 DAY))
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