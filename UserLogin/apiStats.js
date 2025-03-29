const mysql = require('mysql2/promise');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const secretKey = process.env.JWT_SECRET_KEY;
const Database = require('./database');
const db = new Database();

class apiStatsUtils {

    static async getUsage(req, res) {
        let selectQuery = `SELECT * FROM APITracking`;
        let result = await db.selectQuery(selectQuery);

        return result

        // while(result.length > 0) {
        //     console.log(`Code ${randomCode} already exists. Generating a new one.`);
        //     randomCode = this.prototype.generateRandomCode();
        //     selectQuery = `SELECT * FROM Session WHERE session_code = '${randomCode}'`;
        //     result = await db.selectQuery(selectQuery);
        // }

        // console.log(`Inserting new session with code: ${randomCode}`);
        // const insertQuery = `INSERT INTO Session (session_code, is_active) VALUES ('${randomCode}', true)`;
        // await db.insertQuery(insertQuery);

        // const sessionQuery = `SELECT * FROM Session WHERE session_code = '${randomCode}'`;
        // const sessionResult = await db.selectQuery(sessionQuery);

        // if (sessionResult.length === 0) {
        //     console.error('Session creation failed');
        //     throw new Error('Session creation failed');
        // }

        // const sessionId = sessionResult[0].id;
        // console.log(`Session created successfully with ID: ${sessionId}`);

        // const userToken = req.body.token; 
        // const userSelectQuery = `SELECT * FROM validTokens WHERE token = '${userToken}'`;
        // const userResult = await db.selectQuery(userSelectQuery);

        // if (userResult.length === 0) {
        //     console.error('User not found');
        //     throw new Error('User not found');
        // }

        // const userId = userResult[0].user_id;
        // console.log(`User ID ${userId} associated with the session.`);

        // const userSessionQuery = `INSERT INTO UserSession (user_id, session_id) VALUES ('${userId}', '${sessionId}')`;
        // await db.insertQuery(userSessionQuery);

        // return {code: randomCode, sessionId: sessionId};
    }
}

module.exports = apiStatsUtils
