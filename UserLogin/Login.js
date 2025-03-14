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
        return new Promise((resolve, reject) => {
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
                        reject(err);
                    } else {
                        console.log('Connected to database');
                        resolve();
                    }
                });
            } else {
                resolve();
            }
        });
    }

    close() {
        return new Promise((resolve, reject) => {
            if (this.connection) {
                this.connection.end((err) => {
                    if (err) {
                        console.error('Error closing database connection:', err);
                        reject(err);
                    } else {
                        console.log('Connection to database closed');
                        resolve();
                    }
                    this.connection = null;
                });
            }
        });
    }

    selectQuery(query) {
        return this.connect().then(() => {
            return new Promise((resolve, reject) => {
                this.connection.execute(query, (err, results) => {
                    if (err) {
                        console.error('Error executing SELECT query:', err);
                        reject(err);
                    } else {
                        resolve(results);
                    }
                });
            });
        });
    }

    insertQuery(query) {
        return this.connect().then(() => {
            return new Promise((resolve, reject) => {
                this.connection.execute(query, (err, results) => {
                    if (err) {
                        console.error('Error executing INSERT query:', err);
                        reject(err);
                    } else {
                        resolve(results);
                    }
                });
            });
        });
    }
}


const db = new Database();

app.post('/signup', async (req, res) => {
    console.log('Signup process started');
    const { email, password, name } = req.body;
    const role = 'student';  // Default role
    console.log('Received request body:', req.body);

    const saltRounds = 10;

    console.log('Hashing password...');
    try {
        const hash = await bcrypt.hash(password, saltRounds);
        console.log('Password hashed successfully');
        
        const insertQuery = `INSERT INTO users (email, password, name, role) VALUES ('${email}', '${hash}', '${name}', '${role}')`;
        console.log('Executing INSERT query...');
        const insertResult = await db.insertQuery(insertQuery);
        
        const selectQuery = `SELECT * FROM users WHERE email = '${email}'`;
        const result = await db.selectQuery(selectQuery);
        console.log(result);

        if (result.length === 0) {
            return res.status(400).json({ error: 'User not found after insertion' });
        }
        
        const userId = result[0].id;  // Getting the inserted user's ID
        console.log('User inserted, generating JWT token...');
        const token = jwt.sign({ id: userId, email }, process.env.J, { expiresIn: '2h' });

        console.log('Inserting token into validTokens table...');
        await db.insertQuery(`INSERT INTO validTokens (token, user_id) VALUES ('${token}', '${userId}')`);

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
    } catch (err) {
        console.error('Error during signup process:', err.message);
        res.status(500).json({ error: err.message });
    }
});


app.post('/login', async (req, res) => {
    console.log('Login process started');
    const { email, password } = req.body;
    console.log('Received request body:', req.body);

    try {
        console.log('Executing SELECT query to find user...');
        const query = `SELECT * FROM users WHERE email = '${email}'`;
        const result = await db.selectQuery(query);
        console.log(result);

        if (result.length === 0) {
            console.log('No user found with the provided email');
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const user = result[0];  // Get the user object from the result
        console.log('User found, comparing passwords...');
        
        // Compare the provided password with the stored hashed password
        const match = await bcrypt.compare(password, user.password);

        if (!match) {
            console.log('Password does not match');
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        console.log('Password matched, generating JWT token...');
        const token = jwt.sign({ id: user.id, email: user.email }, process.env.J, { expiresIn: '2h' });

        // Remove any existing token from the `validTokens` table
        console.log('Removing existing token for the user...');
        await db.insertQuery(`DELETE FROM validTokens WHERE user_id = '${user.id}'`);

        // Insert the new token into the `validTokens` table
        console.log('Inserting new token into validTokens table...');
        await db.insertQuery(`INSERT INTO validTokens (token, user_id) VALUES ('${token}', '${user.id}')`);

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

    } catch (err) {
        console.error('Error during login process:', err.message);
        res.status(500).json({ error: err.message });
    }
});


app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
