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


exports.GetTargetAchievementReport = async (req, res) => {
    try {
        // ✅ Step 1: Get all salesmen
        const [salesmen] = await pool.query(`SELECT * FROM business__salesmans`);

        if (!salesmen.length) {
            return res.json({ success: true, data: { above_target: [], below_target: [] } });
        }

        const aboveTarget = [];
        const belowTarget = [];

        // ✅ Step 2: Loop through each salesman
        for (const salesman of salesmen) {
            const salesman_id = salesman.business_salesman_id;

            // --- Get total target ---
            const [targetRows] = await pool.query(
                `SELECT 
                    IFNULL(SUM(business_salesman_target), 0) AS total_target
                 FROM business__salesmans_targets
                 WHERE business_salesman_id = ?`,
                [salesman_id]
            );
            const total_target = targetRows[0]?.total_target || 0;

            // --- Get all businesses under this salesman ---
            const [businessRows] = await pool.query(
                `SELECT business_id FROM business WHERE business_salesman_id = ?`,
                [salesman_id]
            );

            const businessIds = businessRows.map(b => b.business_id);
            let total_achievement = 0;

            // --- Get total achieved sales ---
            if (businessIds.length > 0) {
                const [achievementRows] = await pool.query(
                    `SELECT 
                        IFNULL(SUM(business_order_grand_total), 0) AS total_achievement
                     FROM business__orders 
                     WHERE business_order_business_id IN (?)`,
                    [businessIds]
                );
                total_achievement = achievementRows[0]?.total_achievement || 0;
            }

            // --- Calculate difference ---
            const difference = total_achievement - total_target;

            // --- Create clean object ---
            const dataObject = {
                business_salesman_id: salesman.business_salesman_id,
                business_salesman_name: salesman.business_salesmen_name,
                business_salesman_email: salesman.business_salesman_email,
                business_salesman_contact_number: salesman.business_salesmen_contact_number,
                total_target,
                total_achievement,
                difference,
            };

            // ✅ Separate into groups
            if (difference >= 0) {
                aboveTarget.push(dataObject);
            } else {
                belowTarget.push(dataObject);
            }
        }

        // ✅ Return grouped data
        return res.json({
            success: true,
            message: "Salesman target vs achievement report fetched successfully",
            data: {
                above_target: aboveTarget,
                below_target: belowTarget,
            },
        });

    } catch (error) {
        console.error("GetTargetAchievementReport Error:", error);
        return res.json({
            success: false,
            message: "Internal server error",
            error,
        });
    }
};


exports.GetLastPartInquiries = async (req, res) => {
    try {
        const [rows] = await pool.query(`SELECT * FROM inventory__part_requests ORDER BY inventory_part_request_id DESC LIMIT 5`);
        return res.json({ success: true, data: rows })
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: "Internal Server Error", error });
    }
}