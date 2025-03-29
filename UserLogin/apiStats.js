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

    static async incrementUsage(userId, endpoint) {
        let selectQuery = `select * from ApiTracking where user_id = ${userId} and api_endpoint = ${endpoint};`
        let result = await db.selectQuery(selectQuery)

        if (!result || result.length <= 0) {
            const insertQuery = `insert into ApiTracking (user_id, api_endpoint, counter) values (${userId}, ${endpoint}, 1)`
            await db.insertQuery(insertQuery)
        } else {
            const usage = result[0]
            const updateQuery = `update ApiTracking set counter = ${usage.counter + 1} where user_id = ${userId} and api_endpoint = ${endpoint}`
            await db.updateQuery(updateQuery)
        }
    }
}

module.exports = apiStatsUtils
