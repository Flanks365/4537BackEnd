const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const mysql = require('mysql2');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = 8080;
app.use(express.json());

// CORS configuration: Allow all origins and only POST methods, including OPTIONS pre-flight requests for POST
app.use(cors({
    origin: '*',  // Allow all origins
    methods: ['POST'],  // Only allow POST methods
    allowedHeaders: ['Content-Type'],  // Specify the allowed headers (e.g., for JSON requests)
}));

// Handle OPTIONS pre-flight requests explicitly for POST
app.options('*', cors({
    origin: '*',  // Allow all origins for OPTIONS requests
    methods: ['POST'],  // Only allow POST methods for OPTIONS requests
}));

class Database {
    constructor() {
        this.pool = null;
    }

    // Establish a connection pool instead of a single connection
    connect() {
        if (!this.pool) {
            this.pool = mysql.createPool({
                host: process.env.HOST,
                user: process.env.USERNAME,
                password: process.env.PASSWORD,
                database: process.env.DATABASE,
                port: process.env.PORT,
                connectionLimit: 10,  // Maximum number of connections
                waitForConnections: true,  // Wait for a connection if all are in use
                connectTimeout: 10000,  // 10 seconds timeout
            });

            console.log('Database pool connected');
        }
    }

    // Close the connection pool
    close() {
        if (this.pool) {
            this.pool.end((err) => {
                if (err) {
                    console.error('Error closing database connection pool:', err);
                } else {
                    console.log('Connection pool closed');
                }
                this.pool = null;
            });
        }
    }

    // Query the database using async/await for better readability and error handling
    async query(query, params) {
        try {
            this.connect(); // Ensure the pool is created before running any queries
            const [results] = await this.pool.promise().query(query, params);
            return results;
        } catch (err) {
            console.error('Error executing query:', err);
            throw new Error('Error executing query');
        }
    }
}

const database = new Database();
const SECRET_KEY = process.env.J;

app.post('/signup', async (req, res) => {
    const { email, password, name } = req.body;
    const role = 'student';  // Default role
    const saltRounds = 10;

    try {
        // Check if the email already exists
        const results = await database.query(`SELECT * FROM users WHERE email = ?`, [email]);
        if (results.length > 0) {
            return res.status(400).json({ msg: 'Email already exists' });
        }

        // Hash the password before saving
        const hash = await bcrypt.hash(password, saltRounds);

        // Insert the user into the users table
        const insertResult = await database.query(`INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)`, [email, hash, name, role]);

        // Generate JWT token
        const token = jwt.sign({ user_id: insertResult.insertId }, SECRET_KEY, { expiresIn: '2h' });

        // Insert the token into the validTokens table
        await database.query(`INSERT INTO validTokens (token, user_id) VALUES (?, ?)`, [token, insertResult.insertId]);

        // Respond with token and user details
        res.status(201).json({
            token,
            user: {
                id: insertResult.insertId,
                name,
                email,
                role,
            }
        });
    } catch (err) {
        console.error('Error during signup process:', err);
        res.status(500).json({ msg: 'Error during signup' });
    }
});

app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        // Fetch the user from the database (email is the key now)
        const results = await database.query(`SELECT * FROM users WHERE email = ?`, [email]);
        if (results.length === 0) {
            return res.status(400).json({ msg: 'Email not found' });
        }

        const user = results[0];

        // Compare the password with the stored hash
        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            return res.status(400).json({ msg: 'Incorrect password' });
        }

        // Generate JWT token
        const token = jwt.sign({ user_id: user.id }, SECRET_KEY, { expiresIn: '2h' });

        // Remove existing token for the user before inserting a new one
        await database.query(`DELETE FROM validTokens WHERE user_id = ?`, [user.id]);

        // Insert new token
        await database.query(`INSERT INTO validTokens (token, user_id) VALUES (?, ?)`, [token, user.id]);

        // Respond with token and user details
        res.status(200).json({
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (err) {
        console.error('Error during login process:', err);
        res.status(500).json({ msg: 'Error during login' });
    }
});

app.listen(port, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${port}`);
});
