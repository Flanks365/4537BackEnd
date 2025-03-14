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

class Database {
    constructor() {
        this.connection = null;
    }

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

    selectQuery(query) {
        this.connect();
        let result = null;
        this.connection.query(query, (err, results) => {
            if (err) {
                console.error('Error executing SELECT query:', err);
                result = { error: err.message };
            } else {
                result = results;
            }
        });
        this.close();
        return result;
    }

    insertQuery(query) {
        this.connect();
        let result = null;
        this.connection.query(query, (err, results) => {
            if (err) {
                console.error('Error executing INSERT query:', err);
                result = { error: err.message };
            } else {
                result = results;
            }
        });
        this.close();
        return result;
    }
}

const db = new Database();

app.post('/login', (req, res) => {
    const { email, password } = req.body;

    const query = `SELECT * FROM users WHERE email = '${email}'`;
    const result = db.selectQuery(query);

    if (result.error) {
        res.status(500).json({ error: result.error });
    } else if (result.length === 0) {
        res.status(401).json({ error: 'Invalid email or password' });
    } else {
        const user = result[0];

        bcrypt.compare(password, user.password, (err, match) => {
            if (err) {
                res.status(500).json({ error: err.message });
            } else if (!match) {
                res.status(401).json({ error: 'Invalid email or password' });
            } else {
                // Generate JWT token
                const token = jwt.sign({ id: user.id, email }, process.env.JWT_SECRET_KEY, { expiresIn: '2h' });

                // Remove any existing token for the user before inserting a new one
                db.insertQuery(`DELETE FROM validTokens WHERE user_id = '${user.id}'`);

                // Insert the new token into the validTokens table
                db.insertQuery(`INSERT INTO validTokens (token, user_id) VALUES ('${token}', '${user.id}')`);

                res.status(200).json({
                    token,
                    user: {
                        id: user.id,
                        email: user.email,
                        name: user.name,
                        role: user.role  // Return the role along with other user details
                    }
                });
            }
        });
    }
});


app.post('/signup', (req, res) => {
    const { email, password, name } = req.body;
    const role = 'student';  // Default role

    bcrypt.hash(password, 10, (err, hash) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            const insertQuery = `INSERT INTO users (email, password, name, role) VALUES ('${email}', '${hash}', '${name}', '${role}')`;
            const result = db.insertQuery(insertQuery);

            if (result.error) {
                res.status(500).json({ error: result.error });
            } else {
                const userId = result.insertId;  // Getting the inserted user's ID

                // Generate JWT token
                const token = jwt.sign({ id: userId, email }, process.env.JWT_SECRET_KEY, { expiresIn: '2h' });

                // Insert the token into validTokens table
                db.insertQuery(`INSERT INTO validTokens (token, user_id) VALUES ('${token}', '${userId}')`);

                res.status(201).json({
                    token,
                    user: {
                        id: userId,
                        email: result.email,
                        name: result.name,
                        role: result.role  // Return the role along with other user details
                    }
                });
            }
        }
    });
});



app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
