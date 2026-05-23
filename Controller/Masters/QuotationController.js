const pool = require("../../Config/db_pool");
const { global } = require("../../Config/global");
const { PaginationQuery } = require("../Helper/QueryHelper");

exports.CreateQuotation = async (req, res) => {
    const conn = await pool.getConnection();

    try {
        await conn.beginTransaction();

        const request = req.body;
        const business_salesman_id = req.headers['business-salesman-id'];

        const fields = {
            business_salesman_id,
            quotation_number: request.quotation_number,
            customer_name: request.customer_name,
            customer_email: request.customer_email,
            customer_contact: request.customer_contact,
            customer_address: request.customer_address,
            issue_date: request.issue_date,
            expiry_date: request.expiry_date,
            remark: request.remark,
            payment_condition: request.payment_condition,
            quotation_qty: request.quotation_qty,
        };

        let quotation_id = request.quotation_id;

        if (quotation_id) {
            fields.updated_by = business_salesman_id;
            fields.updated_date = global.current_date;

            await conn.query(
                "UPDATE business__salesman_quotations SET ? WHERE quotation_id = ?",
                [fields, quotation_id]
            );

            await conn.query(
                "DELETE FROM business__salesman_quotation_items WHERE quotation_id = ?",
                [quotation_id]
            );
        } else {
            fields.created_by = business_salesman_id;
            fields.created_date = global.current_date;

            const [result] = await conn.query(
                "INSERT INTO business__salesman_quotations SET ?",
                [fields]
            );

            quotation_id = result.insertId;
        }

        if (request.items?.length) {
            const values = request.items.map(item => [
                quotation_id,
                item.item_number,
                item.item_name,
                item.item_brand_name,
                item.item_qty,
                item.item_price,
                item.item_vat,
                item.item_total,
                business_salesman_id,
                global.current_date
            ]);

            await conn.query(
                `INSERT INTO business__salesman_quotation_items (
                    quotation_id,
                    item_number,
                    item_name,
                    item_brand_name,
                    item_qty,
                    item_price,
                    item_vat,
                    item_total,
                    created_by,
                    created_date
                ) VALUES ?`,
                [values]
            );
        }

        await conn.commit();

        return res.status(200).json({
            success: true,
            message:
                request.quotation_id
                    ? "Quotation updated successfully"
                    : "Quotation created successfully",
            data: { quotation_id }
        });

    } catch (error) {
        await conn.rollback();
        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });

    } finally {
        conn.release();
    }
};

exports.GetQuotations = async (req, res) => {
    try {
        const { limit, page, keyword } = req.query;
        const business_salesman_id = req.headers['business-salesman-id']

        let query_count = `
          SELECT COUNT(*) AS total_records
          FROM business__salesman_quotations
        `;

        let query = `SELECT * FROM business__salesman_quotations`;

        let conditionValue = [];
        let conditionCols = [];

        conditionCols.push(`business_salesman_id = ?`);
        conditionValue.push(business_salesman_id);

        if (keyword) {
            conditionCols.push(`(quotation_number LIKE ? OR customer_name LIKE ?)`);
            conditionValue.push(`%${keyword}%`, `%${keyword}%`);
        }

        // Apply WHERE if needed
        if (conditionCols.length > 0) {
            const whereClause = " WHERE " + conditionCols.join(" AND ");
            query += whereClause;
            query_count += whereClause;
        }

        query += ` ORDER BY quotation_id DESC LIMIT ?, ?`;

        const response = await PaginationQuery(query_count, query, conditionValue, limit, page);
        return res.status(200).json(response);

    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: "Internal Server Error", error });
    }
};

exports.GetQuotationsReport = async (req, res) => {
    try {
        const { limit, page, keyword, to_date, from_date, business_salesman_id } = req.query;

        let query_count = `
          SELECT COUNT(*) AS total_records
          FROM business__salesman_quotations bq
          LEFT JOIN business__salesmans AS s 
              ON bq.business_salesman_id = s.business_salesman_id
        `;

        let query = `
          SELECT 
              bq.*, 
              s.business_salesmen_name
          FROM business__salesman_quotations bq
          LEFT JOIN business__salesmans AS s 
              ON bq.business_salesman_id = s.business_salesman_id
        `;

        let conditionValue = [];
        let conditionCols = [];

        // Searching
        if (business_salesman_id) {
            conditionCols.push(`bq.business_salesman_id = ?`);
            conditionValue.push(business_salesman_id);
        }

        if (from_date && to_date) {
            conditionCols.push(`DATE(bq.created_date) BETWEEN ? AND ?`);
            conditionValue.push(from_date, to_date);
        }

        if (keyword) {
            conditionCols.push(`s.business_salesmen_name LIKE ?`);
            conditionValue.push(`%${keyword}%`);
        }

        // Apply WHERE if needed
        if (conditionCols.length > 0) {
            const whereClause = " WHERE " + conditionCols.join(" AND ");
            query += whereClause;
            query_count += whereClause;
        }

        query += ` ORDER BY bq.quotation_id DESC LIMIT ?, ?`;

        const response = await PaginationQuery(query_count, query, conditionValue, limit, page);
        return res.status(200).json(response);

    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: "Internal Server Error", error });
    }
};

exports.GetQuotationInfo = async (req, res) => {
    try {
        const { quotation_id } = req.query;

        if (!quotation_id) {
            return res.status(400).json({ success: false, message: "Quotation ID is required" });
        }

        const [quotation] = await pool.query(
            `SELECT business__salesman_quotations.*, business__salesmans.business_salesmen_name FROM business__salesman_quotations 
            LEFT JOIN business__salesmans ON business__salesmans.business_salesman_id = business__salesman_quotations.business_salesman_id
            WHERE quotation_id = ?`,
            [quotation_id]
        );

        const [items] = await pool.query(
            `SELECT * FROM business__salesman_quotation_items WHERE quotation_id = ?`,
            [quotation_id]
        );

        if (!quotation.length) {
            return res.status(404).json({ success: false, message: "Quotation not found" });
        }

        return res.status(200).json({ success: true, data: { ...quotation[0], items } });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: "Internal Server Error", error });
    }
};

exports.DeleteQuotation = async (req, res) => {
    const conn = await pool.getConnection();

    try {
        await conn.beginTransaction();

        const { quotation_id } = req.body;

        if (!quotation_id) {
            conn.release();
            return res.status(400).json({
                success: false,
                message: "Quotation ID is required"
            });
        }

        await conn.query(
            `DELETE FROM business__salesman_quotation_items
             WHERE quotation_id = ?`,
            [quotation_id]
        );

        await conn.query(
            `DELETE FROM business__salesman_quotations
             WHERE quotation_id = ?`,
            [quotation_id]
        );

        await conn.commit();

        return res.status(200).json({
            success: true,
            message: "Quotation deleted successfully"
        });

    } catch (error) {
        await conn.rollback();

        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });

    } finally {
        conn.release();
    }
};

exports.GetOEBrandList = async (req, res) => {
    try {

        let query = `SELECT stock_brand_name FROM inventory__stock_status WHERE stock_oe = 1 GROUP BY stock_brand_name`;

        const [rows] = await pool.query(query);
        return res.json({ success: true, data: rows })

    } catch (error) {
        console.error('GetBrands Error:', error);
        return res.status(500).json({ success: false, message: "Internal server error", error });
    }
}

exports.GetSuppliersBrandList = async (req, res) => {
    try {
        let query = `SELECT * FROM SUPPLIERS ORDER BY SUP_ID DESC`;
        let [result] = await pool.query(query);

        return res.status(200).json({ success: true, data: result });
    } catch (error) {
        console.error('GetBrands Error:', error);
        return res.status(500).json({ success: false, message: "Internal server error", error });
    }
}

exports.GetPartInfo = async (req, res) => {
    try {

        const { sup_id, part_number, brand_name, stock_type } = req.query;

        let query;
        let searchParams;

        if (Number(stock_type) === 1) {

            query = `
            SELECT * FROM inventory__stock_status
            INNER JOIN PARTS ON inventory__stock_status.stock_part_id = PARTS.PART_ID
            WHERE inventory__stock_status.stock_number = ?
            AND inventory__stock_status.stock_brand_name = ?
            `
            searchParams = [part_number, brand_name]
        } else {

            query = `
            SELECT * FROM inventory__stock_status
            INNER JOIN PARTS ON inventory__stock_status.stock_part_id = PARTS.PART_ID
            WHERE inventory__stock_status.stock_number = ?
            AND inventory__stock_status.stock_sup_id = ?
            `
            searchParams = [part_number, sup_id]

        }

        const [[part_info]] = await pool.query(query, searchParams);

        return res.status(200).json({ success: true, data: part_info });

    } catch (error) {
        console.error('GetPartInfo Error:', error);
        return res.status(500).json({ success: false, message: "Internal server error", error });
    }
}

