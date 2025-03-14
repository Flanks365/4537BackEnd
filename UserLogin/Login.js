const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const mysql = require('mysql2');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = 8080;

// Middleware
app.use(express.json());
app.use(cors()); // Allow everything

// Function to create a MySQL connection
const createDbConnection = () => {
    return mysql.createConnection({
        host: process.env.HOST,
        user: process.env.USERNAME,
        password: process.env.PASSWORD,
        database: process.env.DATABASE,
        port: process.env.PORT,
        connectTimeout: 30000
    });
};

// Signup route
app.post('/signup', (req, res) => {
    const { email, password, name } = req.body;
    const role = 'student'; // Default role

    bcrypt.hash(password, 10, (err, hash) => {
        if (err) {
            console.error('Error hashing password:', err.message);
            return res.status(500).json({ error: 'Internal server error' });
        }

        const connection = createDbConnection();
        const insertQuery = `INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)`;

        connection.query(insertQuery, [email, hash, name, role], (err, result) => {
            if (err) {
                console.error('Error inserting user:', err.message);
                connection.end();
                return res.status(500).json({ error: 'Internal server error' });
            }

            const userId = result.insertId;
            const token = jwt.sign({ id: userId, email }, process.env.J, { expiresIn: '2h' });

            const tokenQuery = `INSERT INTO validTokens (token, user_id) VALUES (?, ?)`;
            connection.query(tokenQuery, [token, userId], (err) => {
                connection.end();
                if (err) {
                    console.error('Error inserting token:', err.message);
                    return res.status(500).json({ error: 'Internal server error' });
                }

                res.status(201).json({
                    token,
                    user: { id: userId, email, name, role }
                });
            });
        });
    });
});

// Login route
app.post('/login', (req, res) => {
    const { email, password } = req.body;
    const connection = createDbConnection();

    const selectQuery = `SELECT * FROM users WHERE email = ?`;
    connection.query(selectQuery, [email], (err, results) => {
        if (err) {
            console.error('Error selecting user:', err.message);
            connection.end();
            return res.status(500).json({ error: 'Internal server error' });
        }

        if (results.length === 0) {
            connection.end();
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const user = results[0];
        bcrypt.compare(password, user.password, (err, match) => {
            if (err) {
                console.error('Error comparing passwords:', err.message);
                connection.end();
                return res.status(500).json({ error: 'Internal server error' });
            }

            if (!match) {
                connection.end();
                return res.status(401).json({ error: 'Invalid email or password' });
            }

            const token = jwt.sign({ id: user.id, email: user.email }, process.env.J, { expiresIn: '2h' });

            const deleteOldTokenQuery = `DELETE FROM validTokens WHERE user_id = ?`;
            connection.query(deleteOldTokenQuery, [user.id], (err) => {
                if (err) {
                    console.error('Error removing old token:', err.message);
                    connection.end();
                    return res.status(500).json({ error: 'Internal server error' });
                }

                const tokenQuery = `INSERT INTO validTokens (token, user_id) VALUES (?, ?)`;
                connection.query(tokenQuery, [token, user.id], (err) => {
                    connection.end();
                    if (err) {
                        console.error('Error inserting token:', err.message);
                        return res.status(500).json({ error: 'Internal server error' });
                    }

                    res.status(200).json({
                        token,
                        user: { id: user.id, email: user.email, name: user.name, role: user.role }
                    });
                });
            });
        });
    });
});

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
