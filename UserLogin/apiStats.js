const mysql = require('mysql2/promise');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const secretKey = process.env.JWT_SECRET_KEY;
const Database = require('./database');
const db = new Database();

class apiStatsUtils {

    static async getUsage(req, res) {
        // let selectQuery = `select * from ApiTracking;`;
        let selectQuery = `describe ApiTracking;`
        let result = await db.selectQuery(selectQuery);

        return result
    }

    static async incrementUsage(user, endpoint) {
        let selectQuery = `select * from ApiTracking where ;`;
        let result = await db.selectQuery(selectQuery);


    }
}

module.exports = apiStatsUtils
