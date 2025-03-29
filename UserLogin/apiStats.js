const mysql = require('mysql2/promise');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const secretKey = process.env.JWT_SECRET_KEY;
const Database = require('./database');
const db = new Database();

class apiStatsUtils {

    static async getUsage() {
        let selectQuery = `select * from ApiTracking;`;
        // let selectQuery = `describe ApiTracking;`
        // let selectQuery = `alter table ApiTracking add column method varchar(10);`
        let result = await db.selectQuery(selectQuery);

        return result
    }

    static async incrementUsage(userId, endpoint, method) {
        let selectQuery = `select * from ApiTracking where user_id = ${userId} and api_endpoint = ${endpoint};`
        let result = await db.selectQuery(selectQuery)

        if (!result || result.length <= 0) {
            const insertQuery = `insert into ApiTracking (user_id, api_endpoint, counter, method) values (${userId}, ${endpoint}, 1, ${method})`
            await db.insertQuery(insertQuery)
        } else {
            const usage = result[0]
            const updateQuery = `update ApiTracking set counter = ${usage.counter + 1} where user_id = ${userId} and api_endpoint = ${endpoint}`
            await db.updateQuery(updateQuery)
        }
    }
}

module.exports = apiStatsUtils
