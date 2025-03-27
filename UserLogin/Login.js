const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
require('dotenv').config();
const Database = require('./database');

const privateKey = Buffer.from(process.env.JWT_PRIVATE_KEY_64, 'base64').toString('utf8');
const publicKey = process.env.JWT_PUBLIC_KEY;
const db = new Database();

async function checkLogin(req, res) {
    try {
        const { email, password } = req.body;
        console.log(`Checking login for email: ${email}`);

        const query = `SELECT id, name, role, password FROM users WHERE email = ?`;
        const result = await db.selectQuery(query, [email]);

        console.log('Database query result:', result);

        if (result.length === 0) {
            console.log('Email not found in database');
            return res.status(401).json({ msg: 'Invalid email or password' });
        }

        const user = result[0];
        console.log(`User found: ${user.name}, role: ${user.role}`);

        const match = await bcrypt.compare(password, user.password);
        console.log('Password match result:', match);

        if (!match) {
            console.log('Password mismatch');
            return res.status(401).json({ msg: 'Invalid email or password' });
        }

        // Delete any existing token for the user
        console.log('Deleting existing tokens for user');
        await db.insertQuery(`DELETE FROM validTokens WHERE user_id = ?`, [user.id]);

        // Generate JWT
        console.log('Generating new JWT token');
        const token = jwt.sign({ email, role: user.role }, privateKey, { algorithm: 'RS256', expiresIn: '3h' });

        console.log('Inserting new token into database');
        await db.insertQuery(`INSERT INTO validTokens (user_id, token) VALUES (?, ?)`, [user.id, token]);

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
        console.log(`Checking signup for email: ${email}`);

        const checkEmailQuery = `SELECT id FROM users WHERE email = ?`;
        const result = await db.selectQuery(checkEmailQuery, [email]);

        console.log('Email check result:', result);

        if (result.length > 0) {
            console.log('Email already exists');
            return res.status(400).json([{ msg: 'Duplicate email' }]);
        }

        console.log('Hashing password');
        const hashedPassword = await bcrypt.hash(password, 10);

        const query = `INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, 'student')`;
        await db.insertQuery(query, [name, email, hashedPassword]);

        const userResult = await db.selectQuery(`SELECT id, role FROM users WHERE email = ?`, [email]);

        console.log('User query result:', userResult);

        if (userResult.length === 0) {
            console.log('User not found after signup');
            return res.status(404).json({ msg: 'User not found after signup' });
        }

        const userId = userResult[0].id;
        const userRole = userResult[0].role;

        console.log('Generating JWT token for new user');
        const token = jwt.sign({ email, role: userRole }, privateKey, { algorithm: 'RS256', expiresIn: '3h' });

        console.log('Inserting new token into database');
        await db.insertQuery(`INSERT INTO validTokens (user_id, token) VALUES (?, ?)`, [userId, token]);

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
        console.log('No token provided');
        return res.status(400).json({ msg: 'No token provided' });
    }

    try {
        console.log('Verifying token');
        const decoded = jwt.verify(token, publicKey, { algorithms: ['RS256'] });

        console.log('Decoded token:', decoded);

        const tokenResult = await db.selectQuery(`SELECT * FROM validTokens WHERE token = ?`, [token]);
        console.log('Token validation result:', tokenResult);

        if (tokenResult.length === 0) {
            console.log('Token is invalid');
            return res.status(401).json({ msg: 'Invalid token' });
        }

        const userResult = await db.selectQuery(`SELECT id, name, email, role FROM users WHERE id = ?`, [tokenResult[0].user_id]);
        console.log('User query result:', userResult);

        if (userResult.length === 0) {
            console.log('User not found for valid token');
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
        console.log('No token provided for logout');
        return res.status(400).json({ msg: 'No token provided' });
    }

    try {
        console.log('Deleting token from database');
        await db.deleteQuery(`DELETE FROM validTokens WHERE token = ?`, [token]);
        res.json({ msg: 'Successfully logged out' });
    } catch (err) {
        console.error('Logout error:', err);
        res.status(500).json({ msg: 'Error during logout' });
    }
}

// Routing using Express
class LoginUtils {
    static routeRequest(req, res) {
        console.log('Routing request:', req.url);
        if (req.url === '/login') {
            checkLogin(req, res);
        } else if (req.url === '/signup') {
            checkSignup(req, res);
        } else if (req.url === '/checktoken') {
            checkToken(req, res);
        } else if (req.url === '/logout') {
            logOut(req, res);
        } else {
            console.log('Invalid endpoint');
            res.status(404).json({ msg: 'Invalid endpoint' });
        }
    }
}

module.exports = LoginUtils;
