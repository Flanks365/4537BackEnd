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

app.post('/signup', (req, res) => {
    console.log('Signup process started');
    const { email, password, name } = req.body;
    const role = 'student';  // Default role

    const saltRounds = 10;

    console.log('Hashing password...');
    bcrypt.hash(password, saltRounds, (err, hash) => {
        if (err) {
            console.error('Error hashing password:', err.message);
            res.status(500).json({ error: err.message });
        } else {
            console.log('Password hashed successfully');
            const insertQuery = `INSERT INTO users (email, password, name, role) VALUES ('${email}', '${hash}', '${name}', '${role}')`;
            console.log('Executing INSERT query...');
            const result = db.insertQuery(insertQuery);

            if (result.error) {
                console.error('Error inserting user into database:', result.error);
                res.status(500).json({ error: result.error });
            } else {
                const userId = result.insertId;  // Getting the inserted user's ID
                console.log('User inserted, generating JWT token...');
                const token = jwt.sign({ id: userId, email }, process.env.J, { expiresIn: '2h' });

                console.log('Inserting token into validTokens table...');
                db.insertQuery(`INSERT INTO validTokens (token, user_id) VALUES ('${token}', '${userId}')`);

                console.log('Signup process completed');
                res.status(201).json({
                    token,
                    user: {
                        id: userId,
                        email,
                        name,
                        role  // Return the role along with other user details
                    }
                });
            }
        }
    });
});

app.post('/login', (req, res) => {
    console.log('Login process started');
    const { email, password } = req.body;

    console.log('Executing SELECT query to find user...');
    const query = `SELECT * FROM users WHERE email = '${email}'`;
    const result = db.selectQuery(query);

    if (result.error) {
        console.error('Error executing SELECT query:', result.error);
        res.status(500).json({ error: result.error });
    } else if (result.length === 0) {
        console.log('No user found with the provided email');
        res.status(401).json({ error: 'Invalid email or password' });
    } else {
        const user = result[0];
        console.log('User found, comparing passwords...');
        bcrypt.compare(password, user.password, (err, match) => {
            if (err) {
                console.error('Error comparing password:', err.message);
                res.status(500).json({ error: err.message });
            } else if (!match) {
                console.log('Password does not match');
                res.status(401).json({ error: 'Invalid email or password' });
            } else {
                console.log('Password matched, generating JWT token...');
                const token = jwt.sign({ id: user.id, email }, process.env.J, { expiresIn: '2h' });

                console.log('Removing existing token for the user...');
                db.insertQuery(`DELETE FROM validTokens WHERE user_id = '${user.id}'`);

                console.log('Inserting new token into validTokens table...');
                db.insertQuery(`INSERT INTO validTokens (token, user_id) VALUES ('${token}', '${user.id}')`);

                console.log('Login process completed');
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

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
