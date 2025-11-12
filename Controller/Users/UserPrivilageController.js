const pool = require("../../Config/db_pool");
const { PaginationQuery } = require("../Helper/QueryHelper");

exports.GetSalesmanPrivilageList = async (req, res) => {
    try {
        const [result] = await pool.query('SELECT * FROM business__salesman_privilage_list');
        return res.json({ success: true, data: result });
    } catch (error) {
        console.log('error', error);
        return res.json({ success: false, messgae: 'Internal Server Error', error })
    }
}

exports.UpdateSalesmanPermissions = async (req, res) => {
    try {
        const { business_salesman_id, permissions } = req.body;

        if (!business_salesman_id) return res.json({ success: false, message: 'Salesman Not Found ...!' })
        if (permissions.length === 0) return res.json({ success: false, message: 'Please Select User Permissions ...!' })

        if (business_salesman_id) {

            await pool.query(`DELETE FROM business__salesman_privilage WHERE business_salesman_id = ?`, business_salesman_id);

            // Now Insert The new permissions
            for (let i = 0; i < permissions.length; i++) {

                const permission = permissions[i];

                let privilege_fields = {
                    business_salesman_id: business_salesman_id,
                    privilege_id: permission,
                    privilege_view: 1,
                    privilege_edit: 0,
                    privilege_delete: 0,
                }
                await pool.query(`INSERT INTO business__salesman_privilage SET ?`, privilege_fields);
            }

            return res.json({ success: true, message: 'Permissions updated successfully' });

        } else {
            return res.json({ success: false, message: 'Invalid Opration...!' })
        }
    } catch (error) {
        console.log('error', error);
        return res.json({ success: false, messgae: 'Internal Server Error', error });
    }
}

exports.CreatePrivillage = async (req, res) => {
    try {

        const request = req.body;

        console.log("request", request);

        let fields = {
            salesman_privilege_name: request.salesman_privilege_name,
            salesman_description: request.salesman_description,
        };

        let query, message, cond;

        if (request.salesman_privilage_id) {
            query = `UPDATE business__salesman_privilage_list SET ? WHERE salesman_privilage_id  = ?`;
            message = "Privilege updated successfully";
            cond = [fields, request.salesman_privilage_id];
        } else {
            query = `INSERT INTO business__salesman_privilage_list SET ?`;
            message = "Privilege created successfully";
            cond = [fields];
        }

        await pool.query(query, cond);

        return res.json({ success: true, message });
    } catch (error) {
        console.log('error', error);
        return res.json({ success: false, messgae: 'Internal Server Error', error });
    }
}

exports.GetPrivillage = async (req, res) => {
    try {

        const { page, limit } = req.query;

        let query_count = `SELECT COUNT(*) AS total_records FROM business__salesman_privilage_list`
        let query = `SELECT * FROM business__salesman_privilage_list`;

        const condValues = [];
        const condCols = [];

        if (condCols.length > 0) {
            query += " WHERE " + condCols.join(' AND ');
            query_count += " WHERE " + condCols.join(' AND ');
        }

        query += " ORDER BY business__salesman_privilage_list.salesman_privilage_id DESC";
        query += " LIMIT ?, ?";

        const response = await PaginationQuery(query_count, query, condValues, limit, page);
        return res.status(200).json(response);

    } catch (error) {
        console.error("error", error);
        return res.status(500).json({ success: false, message: "Internal Server Error", error });
    }
}