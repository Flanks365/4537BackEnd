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
    origin: '*',
    methods: ['POST'],
    allowedHeaders: ['Content-Type'],
}));

app.options('*', cors({
    origin: '*',
    methods: ['POST'],
}));

// Utility to create a new MySQL connection
const createDbConnection = () => {
    return mysql.createConnection({
        host: process.env.HOST,
        user: process.env.USERNAME,
        password: process.env.PASSWORD,
        database: process.env.DATABASE,
        port: process.env.PORT
    });
};

app.post('/signup', (req, res) => {
    const { email, password, name } = req.body;
    const role = 'student';  // Default role

    const saltRounds = 10;

    bcrypt.hash(password, saltRounds, (err, hash) => {
        if (err) {
            console.error('Error hashing password:', err.message);
            return res.status(500).json({ error: err.message });
        }

        const connection = createDbConnection();

        const insertQuery = `INSERT INTO users (email, password, name, role) VALUES ('${email}', '${hash}', '${name}', '${role}')`;
        
        connection.query(insertQuery, (err, insertResult) => {
            if (err) {
                console.error('Error inserting user:', err.message);
                connection.end();  // Close connection
                return res.status(500).json({ error: err.message });
            }

            const selectQuery = `SELECT * FROM users WHERE email = '${email}'`;
            connection.query(selectQuery, (err, result) => {
                if (err) {
                    console.error('Error selecting user:', err.message);
                    connection.end();  // Close connection
                    return res.status(500).json({ error: err.message });
                }

                if (result.length === 0) {
                    connection.end();  // Close connection
                    return res.status(400).json({ error: 'User not found after insertion' });
                }

                const userId = result[0].id;  // Getting the inserted user's ID
                const token = jwt.sign({ id: userId, email }, process.env.J, { expiresIn: '2h' });

                const tokenQuery = `INSERT INTO validTokens (token, user_id) VALUES ('${token}', '${userId}')`;
                connection.query(tokenQuery, (err) => {
                    if (err) {
                        console.error('Error inserting token:', err.message);
                        connection.end();  // Close connection
                        return res.status(500).json({ error: err.message });
                    }

                    connection.end();  // Close connection
                    res.status(201).json({
                        token,
                        user: {
                            id: userId,
                            email,
                            name,
                            role  // Return the role along with other user details
                        }
                    });
                });
            });
        });
    });
});

app.post('/login', (req, res) => {
    const { email, password } = req.body;

    const connection = createDbConnection();

    const query = `SELECT * FROM users WHERE email = '${email}'`;
    connection.query(query, (err, result) => {
        if (err) {
            console.error('Error selecting user:', err.message);
            connection.end();  // Close connection
            return res.status(500).json({ error: err.message });
        }

        if (result.length === 0) {
            connection.end();  // Close connection
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const user = result[0];  // Get the user object from the result

        bcrypt.compare(password, user.password, (err, match) => {
            if (err) {
                console.error('Error comparing passwords:', err.message);
                connection.end();  // Close connection
                return res.status(500).json({ error: err.message });
            }

            if (!match) {
                connection.end();  // Close connection
                return res.status(401).json({ error: 'Invalid email or password' });
            }

            const token = jwt.sign({ id: user.id, email: user.email }, process.env.J, { expiresIn: '2h' });

            const deleteOldTokenQuery = `DELETE FROM validTokens WHERE user_id = '${user.id}'`;
            connection.query(deleteOldTokenQuery, (err) => {
                if (err) {
                    console.error('Error removing old token:', err.message);
                    connection.end();  // Close connection
                    return res.status(500).json({ error: err.message });
                }

                const tokenQuery = `INSERT INTO validTokens (token, user_id) VALUES ('${token}', '${user.id}')`;
                connection.query(tokenQuery, (err) => {
                    if (err) {
                        console.error('Error inserting token:', err.message);
                        connection.end();  // Close connection
                        return res.status(500).json({ error: err.message });
                    }

                    connection.end();  // Close connection
                    res.status(200).json({
                        token,
                        user: {
                            id: user.id,
                            email: user.email,
                            name: user.name,
                            role: user.role  // Return the role along with other user details
                        }
                    });
                });
            });
        });
    });
});

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
