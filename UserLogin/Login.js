const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
require('dotenv').config();
const Database = require('./database');
const fs = require('fs');
const apiStatsUtils = require('./apiStats')

const messages = JSON.parse(fs.readFileSync('./lang/en/messages.json'));
const secretKey = process.env.JWT_SECRET_KEY;
const db = new Database();

async function checkLogin(req, res) {
    try {
        const { email, password } = req.body;

        // Using direct string interpolation
        const query = `SELECT id, name, role, password FROM users WHERE email = '${email}'`;
        const result = await db.selectQuery(query);

        if (result.length === 0) {
            return res.status(401).json({
                msg: messages.errors.invalidCredentials
            });
        }

        const user = result[0];
        const match = await bcrypt.compare(password, user.password);

        if (!match) {
            return res.status(401).json({
                msg: messages.errors.invalidCredentials
            });
        }

        // Delete any existing token for the user
        await db.insertQuery(`DELETE FROM validTokens WHERE user_id = '${user.id}'`);

        // Generate JWT
        const token = jwt.sign(
            { userId: user.id, email, role: user.role }, 
            secretKey, 
            { algorithm: 'HS256', expiresIn: '3h' }
        );

        await db.insertQuery(
            `INSERT INTO validTokens (user_id, token) VALUES ('${user.id}', '${token}')`
        );

        res.json({
            msg: messages.success.login,
            user: { 
                id: user.id, 
                name: user.name, 
                email, 
                role: user.role 
            },
            token
        });

    } catch (err) {
        res.status(500).json({
            msg: messages.errors.loginProcess,
            error: err.message
        });
    }
}

async function checkSignup(req, res) {
    try {
        const { name, email, password } = req.body;

        const checkEmailQuery = `SELECT id FROM users WHERE email = '${email}'`;
        const result = await db.selectQuery(checkEmailQuery);

        if (result.length > 0) {
            return res.status(400).json({
                msg: messages.errors.duplicateEmail
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const insertQuery = `
            INSERT INTO users (name, email, password, role) 
            VALUES ('${name}', '${email}', '${hashedPassword}', 'student')
        `;
        await db.insertQuery(insertQuery);

        const userResult = await db.selectQuery(
            `SELECT id, role FROM users WHERE email = '${email}'`
        );

        if (userResult.length === 0) {
            return res.status(404).json({
                msg: messages.errors.userNotFound
            });
        }

        const userId = userResult[0].id;
        const userRole = userResult[0].role;

        const token = jwt.sign(
            { userId, email, role: userRole }, 
            secretKey, 
            { algorithm: 'HS256', expiresIn: '3h' }
        );

        await db.insertQuery(
            `INSERT INTO validTokens (user_id, token) VALUES ('${userId}', '${token}')`
        );

        res.json({
            msg: messages.success.signup,
            user: { 
                id: userId, 
                name, 
                email, 
                role: userRole 
            },
            token
        });

    } catch (err) {
        res.status(500).json({
            msg: messages.errors.signupProcess,
            error: err.message
        });
    }
}

async function checkToken(req, res) {
    const { token } = req.body;
    if (!token) {
        return res.status(400).json({
            msg: messages.errors.noTokenProvided
        });
    }

    try {
        const decoded = jwt.verify(token, secretKey, { algorithms: ['HS256'] });

        const tokenResult = await db.selectQuery(
            `SELECT * FROM validTokens WHERE token = '${token}'`
        );

        if (tokenResult.length === 0) {
            return res.status(401).json({
                msg: messages.errors.invalidToken
            });
        }

        const userResult = await db.selectQuery(
            `SELECT id, name, email, role FROM users WHERE id = '${tokenResult[0].user_id}'`
        );

        if (userResult.length === 0) {
            return res.status(404).json({
                msg: messages.errors.userNotFound
            });
        }

        res.json({
            msg: messages.success.validToken,
            user: userResult[0]
        });

    } catch (err) {
        res.status(401).json({
            msg: messages.errors.tokenVerification,
            error: err.message
        });
    }
}

async function logOut(req, res) {
    const { token } = req.body;
    if (!token) {
        return res.status(400).json({
            msg: messages.errors.noTokenProvided
        });
    }

    const userId = jwt.verify(token, secretKey, { algorithms: ['HS256'] }).userId;
    await apiStatsUtils.incrementUsage(userId, '/api/v1/logout', 'DELETE');

    try {
        await db.deleteQuery(`DELETE FROM validTokens WHERE token = '${token}'`);
        res.json({ msg: messages.success.logout });
    } catch (err) {
        res.status(500).json({
            msg: messages.errors.logoutProcess,
            error: err.message
        });
    }
}

class LoginUtils {
    static routeRequest(req, res) {
        if (req.originalUrl === '/api/v1/login') {
            checkLogin(req, res);
        } else if (req.originalUrl === '/api/v1/signup') {
            checkSignup(req, res);
        } else if (req.originalUrl === '/api/v1/checktoken') {
            checkToken(req, res);
        } else if (req.originalUrl === '/api/v1/logout') {
            logOut(req, res);
        } else {
            res.status(404).json({
                msg: messages.errors.invalidEndpoint
            });
        }
    }
}

module.exports = LoginUtils;