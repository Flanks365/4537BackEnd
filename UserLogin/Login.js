const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
require('dotenv').config();
const Database = require('./database');

const secretKey = process.env.JWT_SECRET_KEY;
const db = new Database();

async function checkLogin(req, res) {
    try {
        const { email, password } = req.body;
        console.log(`Checking login for email: ${email}`);

        // Directly inserting email into the query string (not recommended!)
        const query = `SELECT id, name, role, password FROM users WHERE email = '${email}'`;
        const result = await db.selectQuery(query);

        if (result.length === 0) {
            return res.status(401).json({ msg: 'Invalid email or password' });
        }

        const user = result[0];
        const match = await bcrypt.compare(password, user.password);

        if (!match) {
            return res.status(401).json({ msg: 'Invalid email or password' });
        }

        // Delete any existing token for the user
        await db.insertQuery(`DELETE FROM validTokens WHERE user_id = '${user.id}'`);

        // Generate JWT using HMAC (HS256)
        const token = jwt.sign({ email, role: user.role }, secretKey, { algorithm: 'HS256', expiresIn: '3h' });

        await db.insertQuery(`INSERT INTO validTokens (user_id, token) VALUES ('${user.id}', '${token}')`);

        res.json({
            msg: "Successful Login",
            user: { id: user.id, name: user.name, email, role: user.role },
            token
        });

    } catch (err) {
        console.error('Error during login process:', err);
        res.status(500).json({ msg: 'Error during login process' });
    }
}

async function checkSignup(req, res) {
    try {
        const { name, email, password } = req.body;

        const checkEmailQuery = `SELECT id FROM users WHERE email = '${email}'`;
        const result = await db.selectQuery(checkEmailQuery);

        if (result.length > 0) {
            return res.status(400).json([{ msg: 'Duplicate email' }]);
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const query = `INSERT INTO users (name, email, password, role) VALUES ('${name}', '${email}', '${hashedPassword}', 'student')`;
        await db.insertQuery(query);

        const userResult = await db.selectQuery(`SELECT id, role FROM users WHERE email = '${email}'`);

        if (userResult.length === 0) {
            return res.status(404).json({ msg: 'User not found after signup' });
        }

        const userId = userResult[0].id;
        const userRole = userResult[0].role;

        const token = jwt.sign({ email, role: userRole }, secretKey, { algorithm: 'HS256', expiresIn: '3h' });

        await db.insertQuery(`INSERT INTO validTokens (user_id, token) VALUES ('${userId}', '${token}')`);

        res.json({
            msg: 'User registered successfully',
            user: { id: userId, name, email, role: userRole },
            token
        });

    } catch (err) {
        console.error('Error during signup process:', err);
        res.status(500).json({ msg: 'Error during signup process' });
    }
}

async function checkToken(req, res) {
    const { token } = req.body;
    if (!token) {
        return res.status(400).json({ msg: 'No token provided' });
    }

    try {
        const decoded = jwt.verify(token, secretKey, { algorithms: ['HS256'] });

        const tokenResult = await db.selectQuery(`SELECT * FROM validTokens WHERE token = '${token}'`);

        if (tokenResult.length === 0) {
            return res.status(401).json({ msg: 'Invalid token' });
        }

        const userResult = await db.selectQuery(`SELECT id, name, email, role FROM users WHERE id = '${tokenResult[0].user_id}'`);

        if (userResult.length === 0) {
            return res.status(404).json({ msg: 'User not found' });
        }

        res.json({
            msg: 'Token is valid',
            user: userResult[0]
        });

    } catch (err) {
        console.error('Token verification error:', err);
        res.status(401).json({ msg: 'Invalid or expired token' });
    }
}

async function logOut(req, res) {
    const { token } = req.body;
    if (!token) {
        return res.status(400).json({ msg: 'No token provided' });
    }

    try {
        await db.deleteQuery(`DELETE FROM validTokens WHERE token = '${token}'`);
        res.json({ msg: 'Successfully logged out' });
    } catch (err) {
        console.error('Logout error:', err);
        res.status(500).json({ msg: 'Error during logout' });
    }
}

// Routing using Express
class LoginUtils {
    static routeRequest(req, res) {
        console.log('Routing request:', req.originalUrl);  // Use originalUrl or path
        if (req.originalUrl === '/login') {
            checkLogin(req, res);
        } else if (req.originalUrl === '/signup') {
            checkSignup(req, res);
        } else if (req.originalUrl === '/checktoken') {
            console.log('In /checktoken route');
            checkToken(req, res);
        } else if (req.originalUrl === '/logout') {
            logOut(req, res);
        } else {
            console.log('Invalid endpoint');
            res.status(404).json({ msg: 'Invalid endpoint' });
        }
    }
}
module.exports = LoginUtils;
