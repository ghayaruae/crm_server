const mysql = require('mysql2/promise');
require('dotenv').config();

const dbInfo = {
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    database: process.env.MYSQL_DB,
    password: process.env.MYSQL_PASS,
};

const pool = mysql.createPool(dbInfo);
module.exports = pool;