const pool = require("../../Config/db_pool");

exports.GetTeamLeaderDashboardStates = async (req, res) => {
    try {

        // ✅ Total salesman count
        const [[{ total_salesman }]] = await pool.query(
            `SELECT COUNT(*) AS total_salesman FROM business__salesmans`
        );

        // ✅ Get all salesman IDs
        const [salesmen] = await pool.query(
            `SELECT business_salesman_id FROM business__salesmans`
        );
        const salesman_ids = salesmen.map(s => s.business_salesman_id);

        // ✅ Salesman targets
        const [[{ total_salesman_targets }]] = await pool.query(
            `SELECT COUNT(*) AS total_salesman_targets FROM business__salesmans_targets`
        );

        let business_ids = [];

        // ✅ Get businesses assigned to salesmen
        if (salesman_ids.length > 0) {
            const [assign_business] = await pool.query(
                `SELECT business_id FROM business WHERE business_salesman_id IN (?)`,
                [salesman_ids]
            );

            business_ids = assign_business.map(b => b.business_id);
        }

        let total_orders = 0;
        let in_processing_orders = 0;
        let total_pending_orders = 0;
        let pending_amount = 0;

        // ✅ Fetch all orders & process here
        if (business_ids.length > 0) {

            const [orders] = await pool.query(
                `SELECT business_order_status, business_order_grand_total
                 FROM business__orders
                 WHERE business_order_business_id IN (?)`,
                [business_ids]
            );

            total_orders = orders.length;

            // ✅ In-process orders: status (0,1,2,3,4)
            const processingOrders = orders.filter(o =>
                [0, 1, 2, 3, 4].includes(o.business_order_status)
            );

            in_processing_orders = processingOrders.length;

            // ✅ Pending orders: status = 0
            total_pending_orders = orders.filter(o =>
                o.business_order_status === 0
            ).length;

            // ✅ Pending amount calculation
            pending_amount = processingOrders.reduce(
                (acc, o) => acc + (o.business_order_grand_total || 0),
                0
            );
        }

        return res.json({
            success: true,
            data: {
                total_salesman,
                total_salesman_targets,
                total_assigned_business: business_ids.length,
                total_orders,
                in_processing_orders,
                total_pending_orders,
                pending_amount: parseFloat(pending_amount).toFixed(2)
            }
        });

    } catch (error) {
        console.error(error);
        return res.json({
            success: false,
            message: "Internal server error",
            error
        });
    }
};
