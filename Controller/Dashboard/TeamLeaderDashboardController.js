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
            `SELECT SUM(business_salesman_target) AS total_salesman_targets FROM business__salesmans_targets`
        );

        let business_ids = [];
        let business_in_active = 0;

        // ✅ Get businesses assigned to salesmen
        if (salesman_ids.length > 0) {
            const [assign_business] = await pool.query(
                `SELECT business_id, is_active 
                 FROM business 
                 WHERE business_salesman_id IN (?)`,
                [salesman_ids]
            );

            business_ids = assign_business.map(b => b.business_id);

            // ✅ Count businesses where is_active = 0
            business_in_active = assign_business.filter(b => b.is_active === 0).length;
        }

        let total_orders = 0;
        let total_pending_orders = 0;
        let pending_amount = 0;

        // ✅ Fetch all orders
        if (business_ids.length > 0) {

            const [orders] = await pool.query(
                `SELECT business_order_status, business_order_grand_total
                 FROM business__orders
                 WHERE business_order_business_id IN (?)`,
                [business_ids]
            );

            total_orders = orders.length;

            // ✅ Pending orders: status = 0
            const pendingOrders = orders.filter(o => o.business_order_status === 0);
            total_pending_orders = pendingOrders.length;

            // ✅ Pending amount only for pending orders
            pending_amount = pendingOrders.reduce(
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
                business_in_active,
                total_orders,
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
        // Step 1: Get all salesmen
        const [salesmen] = await pool.query(`
            SELECT *
            FROM business__salesmans
        `);

        if (!salesmen.length) {
            return res.json({
                success: true,
                data: { above_target: [], below_target: [] },
            });
        }

        const aboveTarget = [];
        const belowTarget = [];

        // Step 2: Loop through each salesman
        for (const salesman of salesmen) {
            const salesman_id = salesman.business_salesman_id;

            // --- Get all targets for this salesman
            const [targetRows] = await pool.query(
                `SELECT business_salesman_target, business_salesman_target_from, business_salesman_target_to
                 FROM business__salesmans_targets
                 WHERE business_salesman_id = ?
                 ORDER BY business_salesman_target_from ASC`,
                [salesman_id]
            );

            // --- Get all businesses under this salesman
            const [businessRows] = await pool.query(
                `SELECT business_id FROM business WHERE business_salesman_id = ?`,
                [salesman_id]
            );
            const businessIds = businessRows.map(b => b.business_id);

            // --- Loop through each target entry
            for (const target of targetRows) {
                let total_achievement = 0;

                // Get achievement for this target period only
                if (businessIds.length > 0) {
                    const [achievementRows] = await pool.query(
                        `SELECT IFNULL(SUM(business_order_grand_total), 0) AS total_achievement
                         FROM business__orders
                         WHERE business_order_business_id IN (?)
                           AND DATE(business_order_date) BETWEEN ? AND ?`,
                        [businessIds, target.business_salesman_target_from, target.business_salesman_target_to]
                    );
                    total_achievement = achievementRows[0]?.total_achievement || 0;
                }

                const difference = total_achievement - target.business_salesman_target;

                // --- Create data object
                const dataObject = {
                    business_salesman_id: salesman.business_salesman_id,
                    business_salesman_name: salesman.business_salesmen_name,
                    business_salesman_email: salesman.business_salesman_email,
                    business_salesman_contact_number: salesman.business_salesmen_contact_number,
                    business_salesman_target_from: target.business_salesman_target_from,
                    business_salesman_target_to: target.business_salesman_target_to,
                    total_target: target.business_salesman_target,
                    total_achievement,
                    difference,
                };

                // --- Group by above/below target
                if (difference >= 0) {
                    aboveTarget.push(dataObject);
                } else {
                    belowTarget.push(dataObject);
                }
            }
        }

        // Step 3: Return grouped data
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
        const [rows] = await pool.query(`SELECT 
        inventory__part_requests.*,
        business__salesmans.business_salesmen_name
        FROM inventory__part_requests
        LEFT JOIN business__salesmans 
        ON inventory__part_requests.business_salesman_id = business__salesmans.business_salesman_id
        ORDER BY inventory__part_requests.inventory_part_request_id DESC
        LIMIT 5;
`);
        return res.json({ success: true, data: rows })
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: "Internal Server Error", error });
    }
}

exports.GetFollowTypeChart = async (req, res) => {
    try {

        const query = `
            SELECT
                COUNT(CASE WHEN business_salesman_followup_type = 'Meet' THEN 1 END) AS meet_count,
                COUNT(CASE WHEN business_salesman_followup_type = 'Call' THEN 1 END) AS call_count,
                COUNT(CASE WHEN business_salesman_followup_type = 'Visit' THEN 1 END) AS visit_count,
                COUNT(CASE WHEN business_salesman_followup_type = 'Whatsapp' THEN 1 END) AS whatsapp_count,
                COUNT(CASE WHEN business_salesman_followup_type = 'Mail' THEN 1 END) AS email_count
            FROM business__salesmans_followups
        `;

        const [rows] = await pool.query(query);

        return res.json({
            success: true,
            data: rows[0]
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error
        });
    }
};
