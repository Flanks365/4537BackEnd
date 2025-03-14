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
        this.connection = null;
    }

    // Establish a connection to the database
    connect() {
        if (!this.connection) {
            this.connection = mysql.createConnection({
                host: process.env.HOST,
                user: process.env.USERNAME,
                password: process.env.PASSWORD,
                database: process.env.DATABASE,
                port: process.env.PORT
            });

            this.connection.connect((err) => {
                if (err) {
                    console.error('Error connecting to database:', err);
                } else {
                    console.log('Connected to database');
                }
            });
        }
    }

    // Close the connection to the database
    close() {
        if (this.connection) {
            this.connection.end((err) => {
                if (err) {
                    console.error('Error closing database connection:', err);
                } else {
                    console.log('Connection to database closed');
                }
                this.connection = null;
            });
        }
    }

    // Generic method to execute a query and return a promise with the result
    async query(query, params = []) {
        this.connect();  // Ensure the connection is established before executing the query
        return new Promise((resolve, reject) => {
            this.connection.query(query, params, (err, results) => {
                if (err) {
                    reject(err);  // Reject if there is an error with the query
                } else {
                    resolve(results);  // Resolve with the query results
                }
            });
        });
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
