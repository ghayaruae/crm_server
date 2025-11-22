const pool = require("../../Config/db_pool");
const { PaginationQuery } = require("../Helper/QueryHelper");

exports.GetBusinessOrdersReport = async (req, res) => {
    try {
        const { from_date, to_date, page, limit, keyword } = req.query;

        const business_salesman_id = req.headers['business-salesman-id'];

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

        if (keyword) {
            conditions.push(`business__orders.business_order_business_id LIKE ?`);
            conditionValue.push(`%${keyword}%`);
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
}

exports.GetBusinessAllOrdersReport = async (req, res) => {
    try {
        const { from_date, to_date, page, limit, keyword, status } = req.query;

        const business_salesman_id = req.headers['business-salesman-id'];

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

        if (keyword) {
            conditions.push(`business__orders.business_order_business_id LIKE ?`);
            conditionValue.push(`%${keyword}%`);
        }

        if (from_date && to_date) {
            conditions.push(`DATE(business__orders.business_order_date) BETWEEN ? AND ?`);
            conditionValue.push(from_date, to_date);
        }

        if (status) {
            conditions.push(`business__orders.business_order_status = ?`);
            conditionValue.push(status);
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
}

// ------------- target ------------- //
exports.GetAllTargetReports = async (req, res) => {
    try {
        let { from_date, to_date, business_salesman_id } = req.query;

        // Initialize base query and parameters
        let query = `
      SELECT 
        bst.*,
        bs.business_salesmen_name,
        bs.business_salesmen_contact_number,
        bs.business_salesman_email
      FROM business__salesmans_targets bst
      LEFT JOIN business__salesmans bs
      ON bst.business_salesman_id = bs.business_salesman_id
      WHERE 1=1
    `;
        const params = [];

        // 🧩 Filter 1: Date range (handle if one or both are missing)
        if (from_date && to_date) {
            query += ` AND DATE(bst.target_assigned_datetime) BETWEEN ? AND ?`;
            params.push(from_date, to_date);
        } else if (from_date) {
            query += ` AND DATE(bst.target_assigned_datetime) >= ?`;
            params.push(from_date);
        } else if (to_date) {
            query += ` AND DATE(bst.target_assigned_datetime) <= ?`;
            params.push(to_date);
        }

        // 🧩 Filter 2: Salesman ID
        if (business_salesman_id) {
            query += ` AND bst.business_salesman_id = ?`;
            params.push(business_salesman_id);
        }

        // 🧩 Optional: sort results by date
        query += ` ORDER BY bst.target_assigned_datetime DESC`;

        const [rows] = await pool.query(query, params);

        return res.json({
            success: true,
            count: rows.length,
            data: rows,
        });

    } catch (error) {
        console.error("GetAllTargetReports Error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};



exports.GetAllFollowupsReports = async (req, res) => {
    try {
        let { from_date, to_date, business_salesman_id } = req.query;

        // 🧩 Check if valid date filters provided
        const hasDates = from_date && to_date;

        // Base query
        let query = `
            SELECT 
                business__salesmans_followups.*,
                business__salesmans.business_salesmen_name,
                business__salesmans.business_salesmen_contact_number,
                business__salesmans.business_salesman_email
            FROM business__salesmans_followups
            LEFT JOIN business__salesmans 
                ON business__salesmans_followups.business_salesman_id = business__salesmans.business_salesman_id
            WHERE 1=1
        `;

        const params = [];

        // ✅ Add date filter only if both dates exist
        if (hasDates) {
            query += ` AND DATE(business__salesmans_followups.business_salesman_followup_date) BETWEEN ? AND ?`;
            params.push(from_date, to_date);
        }

        // ✅ Add salesman filter only if provided
        if (business_salesman_id) {
            query += ` AND business__salesmans_followups.business_salesman_id = ?`;
            params.push(business_salesman_id);
        }

        // Execute query
        const [rows] = await pool.query(query, params);

        return res.json({
            success: true,
            data: rows,
        });

    } catch (error) {
        console.error("GetAllFollowupsReports Error:", error);
        return res.json({
            success: false,
            message: "Internal server error",
            error,
        });
    }
};


// All salesman report //
exports.AllSalesmanReport = async (req, res) => {
    try {
        let query_count = `SELECT COUNT(*) as total_records FROM business__salesmans`;

        let query = `SELECT * FROM business__salesmans`;

        let conditionValue = [];
        let conditionCols = [];

        if (req.query.keyword) {
            conditionCols.push(`business__salesmans.business_salesmen_name LIKE ?`);
            conditionValue.push(`%${req.query.keyword}%`);
        }

        if (conditionCols.length > 0) {
            query += " WHERE " + conditionCols.join(" AND ");
            query_count += " WHERE " + conditionCols.join(" AND ");
        }

        query += ` ORDER BY business__salesmans.business_salesman_id DESC `;
        query += ` LIMIT ?, ?`;


        const response = await PaginationQuery(query_count, query, conditionValue, req.query.limit, req.query.page);
        return res.status(200).json(response);

    } catch (error) {
        SystemLogs(error, 'error');
        return res.status(500).json({ success: false, message: 'Internal Server Error', error: error })
    }
}

exports.AllSalesmanOrderReport = async (req, res) => {
    try {
        const { limit, page, keyword, salesman_name, status, from_date, to_date } = req.query;

        // Base queries
        let query_count = `
            SELECT COUNT(*) AS total_records
            FROM business__orders 
            LEFT JOIN business ON business__orders.business_order_business_id = business.business_id
            LEFT JOIN business__salesmans ON business.business_salesman_id = business__salesmans.business_salesman_id
            WHERE business.business_salesman_id IS NOT NULL
        `;

        let query = `
            SELECT
                business__orders.*, 
                business.business_name, 
                business.business_salesman_id,
                business__salesmans.business_salesmen_name
            FROM business__orders 
            LEFT JOIN business ON business__orders.business_order_business_id = business.business_id
            LEFT JOIN business__salesmans ON business.business_salesman_id = business__salesmans.business_salesman_id
            WHERE business.business_salesman_id IS NOT NULL
        `;

        const conditionValue = [];

        // Keyword search (business name)
        if (keyword) {
            query += ` AND business.business_name LIKE ?`;
            query_count += ` AND business.business_name LIKE ?`;
            conditionValue.push(`%${keyword}%`);
        }

        // Salesman filter
        if (salesman_name) {
            query += ` AND business__salesmans.business_salesmen_name LIKE ?`;
            query_count += ` AND business__salesmans.business_salesmen_name LIKE ?`;
            conditionValue.push(`%${salesman_name}%`);
        }

        // ✅ Status filter (handles single or multiple)
        if (status) {
            const statusArray = Array.isArray(status)
                ? status
                : typeof status === "string" && status.includes(",")
                    ? status.split(",")
                    : [status];

            const placeholders = statusArray.map(() => "?").join(", ");
            query += ` AND business__orders.business_order_status IN (${placeholders})`;
            query_count += ` AND business__orders.business_order_status IN (${placeholders})`;
            conditionValue.push(...statusArray);
        }

        // Date range filter
        if (from_date && to_date) {
            query += ` AND DATE(business__orders.business_order_date) BETWEEN ? AND ?`;
            query_count += ` AND DATE(business__orders.business_order_date) BETWEEN ? AND ?`;
            conditionValue.push(from_date, to_date);
        } else if (from_date) {
            query += ` AND DATE(business__orders.business_order_date) >= ?`;
            query_count += ` AND DATE(business__orders.business_order_date) >= ?`;
            conditionValue.push(from_date);
        } else if (to_date) {
            query += ` AND DATE(business__orders.business_order_date) <= ?`;
            query_count += ` AND DATE(business__orders.business_order_date) <= ?`;
            conditionValue.push(to_date);
        }

        // Final ordering and pagination
        query += ` ORDER BY business__orders.business_order_id DESC LIMIT ?, ?`;

        // Call pagination helper
        const response = await PaginationQuery(query_count, query, conditionValue, limit, page);

        return res.status(200).json(response);

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Internal Server Error',
            error: error.message
        });
    }
};

exports.AllSalesmanAssignBusinessReport = async (req, res) => {
    try {

        const { limit, page, keyword, status } = req.query;

        let query_count = `SELECT COUNT(*) AS total_records 
        FROM business 
        LEFT JOIN business__salesmans ON business.business_salesman_id = business__salesmans.business_salesman_id
        `;

        let [salesmansman] = await pool.query(`SELECT * FROM business__salesmans`);
        const business_salesman_id = salesmansman.map(item => item?.business_salesman_id);

        let query = `SELECT * 
        FROM business 
        LEFT JOIN business__salesmans ON business.business_salesman_id = business__salesmans.business_salesman_id 
        `

        let conditionValue = [];
        let conditionCols = [];

        if (business_salesman_id) {
            conditionCols.push(`business.business_salesman_id IN (?)`);
            conditionValue.push(business_salesman_id);
        }

        if (status) {
            conditionCols.push(`business.is_active = ?`);
            conditionValue.push(status);
        }

        if (keyword) {
            conditionCols.push(`business.business_name = ?`);
            conditionValue.push(keyword);
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
        console.log("error ===>", error);
        return res.json({ success: false, message: "Internal server error : ", error });
    }
}

// OE Management //
exports.GetInventoryCrossParts = async (req, res) => {
    try {

        const { part_number, limit, page, SUP_ID } = req.query;

        if (!part_number) {
            return res.json({ success: false, message: "part number is required" });
        }

        let query_count = `SELECT COUNT(*) as total_records FROM inventory__stock_cross`;

        let query = `SELECT * FROM inventory__stock_cross`;

        let conditionValue = [];
        let conditionCols = [];

        if (part_number) {
            conditionCols.push(`inventory__stock_cross.part_number = ?`);
            conditionValue.push(part_number);
        }

        if (SUP_ID) {
            conditionCols.push(`inventory__stock_cross.part_sup_id = ?`);
            conditionValue.push(SUP_ID);
        }

        if (conditionCols.length > 0) {
            query += " WHERE " + conditionCols.join(" AND ");
            query_count += " WHERE " + conditionCols.join(" AND ");
        }

        query += ` ORDER BY inventory__stock_cross.inventory_stock_oe_link_id DESC `;
        query += ` LIMIT ?, ?`;


        const response = await PaginationQuery(query_count, query, conditionValue, limit, page);
        return res.status(200).json(response);

    } catch (error) {
        return res.status(500).json({ success: false, message: 'Internal Server Error', error: error })
    }
}

exports.GetSupplierBrands = async (req, res) => {
    try {

        const brands = await pool.query(`SELECT * FROM SUPPLIERS WHERE SUP_STATUS = 1`);
        return res.json({ success: true, data: brands[0] })

    } catch (error) {
        console.log("error", error)
        return res.status(500).json({ success: false, message: 'Internal Server Error', error });
    }
}

exports.GetPartInfo = async (req, res) => {
    try {

        const { sup_id, part_number } = req.query;

        let query = `
         SELECT *, 
        (SELECT CONCAT(ART_MEDIA_INFO.ART_MEDIA_SUP_ID, '/', ART_MEDIA_INFO.ART_MEDIA_FILE_NAME) AS MEDIA_SOURCE
        FROM ART_MEDIA_INFO WHERE ART_MEDIA_INFO.ART_MEDIA_ART_ID = PARTS.ART_ID AND ART_MEDIA_INFO.ART_MEDIA_TYPE IN ('BMP', 'JPEG', 'JPG', 'PNG', 'GIF') AND ART_MEDIA_INFO.ART_MEDIA_SUP_ID = PARTS.ART_SUP_ID LIMIT 1) AS MEDIA_SOURCE,
        IFNULL(inventory__stock_status.stock_bb_price, 0) AS VD_PRICE,
        IFNULL(inventory__stock_status.stock_price_mrp, 0) AS VD_PRICE_MRP,
        IFNULL(inventory__stock_status.stock_available_qty, 0) AS VD_QTY,
        PARTS.PRODUCT_GROUP_EN AS ART_PRODUCT_NAME,
        (SELECT AVG(rating) FROM business__reviews WHERE part_number = PARTS.ART_SEARCH_NUMBER) AS ART_AVG_RATING, 
        (SELECT COUNT(*) AS TOTAL_REVIEWS FROM business__reviews WHERE part_number = PARTS.ART_SEARCH_NUMBER) AS TOTAL_REVIEWS 

        FROM PARTS 
        LEFT JOIN inventory__stock_status ON inventory__stock_status.stock_number = PARTS.ART_SEARCH_NUMBER  AND inventory__stock_status.stock_sup_id = PARTS.ART_SUP_ID
        LEFT JOIN SUPPLIERS ON SUPPLIERS.SUP_ID = PARTS.ART_SUP_ID 
        LEFT JOIN PRODUCTS_NOTES ON PRODUCTS_NOTES.PT_ID = PARTS.PT_ID 
        WHERE PARTS.ART_SUP_ID = ? AND PARTS.ART_SEARCH_NUMBER = ? LIMIT 1
        `

        const [rows] = await pool.query(query, [sup_id, part_number]);
        return res.json({ success: true, data: rows })

    } catch (error) {
        console.log("error", error)
        return res.status(500).json({ success: false, message: 'Internal Server Error', error });
    }
}


exports.GetInactiveBusinessList = async (req, res) => {
    try {
        const [salesmen] = await pool.query(
            `SELECT business_salesman_id FROM business__salesmans`
        );

        const salesman_ids = salesmen.map(s => s.business_salesman_id);

        let business_in_active_list = [];

        if (salesman_ids.length > 0) {
            const [businesses] = await pool.query(
                `SELECT business_id, business_name, business_mobile, is_active
                 FROM business
                 WHERE business_salesman_id IN (?)
                 AND is_active = 0`,
                [salesman_ids]
            );

            business_in_active_list = businesses;
        }

        return res.json({
            success: true,
            data: business_in_active_list
        });

    } catch (error) {
        console.error(error);
        return res.json({ success: false, message: "Internal server error", error });
    }
};
