const pool = require("../../Config/db_pool");

exports.GetDashboardStates = async (req, res) => {
    try {
        const business_salesman_id = req.headers['business-salesman-id'];

        if (!business_salesman_id) {
            return res.json({
                success: false,
                message: "business_salesman_id is required."
            });
        }

        // 1️⃣ Total Businesses
        const [business_data] = await pool.query(
            `SELECT COUNT(*) AS total_business FROM business WHERE business_salesman_id = ?`,
            [business_salesman_id]
        );

        // 2️⃣ Get all businesses for this salesman
        const [customers] = await pool.query(
            `SELECT business_id FROM business WHERE business_salesman_id = ?`,
            [business_salesman_id]
        );

        let total_pending_orders = 0;

        // 3️⃣ If businesses exist, count pending orders for all of them
        if (customers.length > 0) {
            const businessIds = customers.map(c => c.business_id);

            const [pending_orders_data] = await pool.query(
                `SELECT COUNT(*) AS total_pending_orders 
                 FROM business__orders 
                 WHERE business_order_status = 0 
                 AND business_id IN (?)`,
                [businessIds]
            );

            total_pending_orders = pending_orders_data[0]?.total_pending_orders || 0;
        }

        // 4️⃣ Send response
        return res.json({
            success: true,
            data: {
                total_business: business_data[0]?.total_business || 0,
                total_pending_orders: total_pending_orders
            }
        });

    } catch (error) {
        console.error("GetDashboardStates error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
};
