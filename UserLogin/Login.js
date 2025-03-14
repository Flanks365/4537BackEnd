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

    connect() {
        if (!this.connection) {
            this.connection = mysql.createConnection({
                host: process.env.HOST,
                user: process.env.USER,
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

    query(query, params, callback) {
        this.connect();  // Ensure the connection is open before running the query
        this.connection.query(query, params, (err, results) => {
            if (err) {
                console.error('Error executing query:', err);
                callback(err, null);  // Pass the error to the callback
            } else {
                callback(null, results);  // Pass the results to the callback
            }

        });
    }
}


const database = new Database();
const SECRET_KEY = process.env.J;

app.post('/signup', (req, res) => {
    const { email, password, name } = req.body;
    const role = 'student';  // Default role
    const saltRounds = 10;

    // Check if the email already exists
    database.query(`SELECT * FROM users WHERE email = ?`, [email], (err, results) => {
        if (err) return res.status(500).json({ msg: 'Error checking for duplicates' });
        if (results.length > 0) return res.status(400).json({ msg: 'Email already exists' });

        // Hash the password before saving
        bcrypt.hash(password, saltRounds, (err, hash) => {
            if (err) return res.status(500).json({ msg: 'Error hashing password' });

            // Insert the user into the users table
            const insertQuery = `INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)`;
            database.query(insertQuery, [email, hash, name, role], (err, result) => {
                if (err) return res.status(500).json({ msg: 'Error inserting user' });

                // Generate JWT token
                const token = jwt.sign({ user_id: result.insertId }, SECRET_KEY, { expiresIn: '2h' });

                // Insert the token into the validTokens table
                database.query(`INSERT INTO validTokens (token, user_id) VALUES (?, ?)`, [token, result.insertId], (err) => {
                    if (err) return res.status(500).json({ msg: 'Error storing token' });

                    // Respond with token and user details
                    res.status(201).json({
                        token,
                        user: {
                            id: result.insertId,
                            name: name,
                            email: email,  // Using email now
                            role: role
                        }
                    });
                });
            });
        });
    });
});

app.post('/login', (req, res) => {
    const { email, password } = req.body;

    // Fetch the user from the database (email is the key now)
    database.query(`SELECT * FROM users WHERE email = ?`, [email], (err, results) => {
        if (err) return res.status(500).json({ msg: 'Error checking for user' });
        if (results.length === 0) return res.status(400).json({ msg: 'Email not found' });

        const user = results[0];

        // Compare the password with the stored hash
        bcrypt.compare(password, user.password, (err, match) => {
            if (err) return res.status(500).json({ msg: 'Error comparing passwords' });
            if (!match) return res.status(400).json({ msg: 'Incorrect password' });

            // Generate JWT token
            const token = jwt.sign({ user_id: user.id }, SECRET_KEY, { expiresIn: '2h' });

            // Remove existing token for the user before inserting a new one
            database.query(`DELETE FROM validTokens WHERE user_id = ?`, [user.id], (err) => {
                if (err) return res.status(500).json({ msg: 'Error deleting old token' });

                // Insert new token
                database.query(`INSERT INTO validTokens (token, user_id) VALUES (?, ?)`, [token, user.id], (err) => {
                    if (err) return res.status(500).json({ msg: 'Error storing token' });

                    // Respond with token and user details
                    res.status(200).json({
                        token,
                        user: {
                            id: user.id,
                            name: user.name,
                            email: user.email,  // Using email now
                            role: user.role
                        }
                    });
                });
            });
        });
    });
});

app.listen(port, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${port}`);
});
