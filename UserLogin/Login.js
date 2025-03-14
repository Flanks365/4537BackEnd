const express = require('express');
const bcrypt = require('bcrypt');
const mysql = require('mysql2');
require('dotenv').config();

const app = express();
const port = 8080;
app.use(express.json());

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
                port: process.env.PORT_DB
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

    
    selectQuery(query, res) {
        this.connect();

        this.connection.query(query, (err, results) => {
            if (err) {
                console.error('Error executing query:', err);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ msg: "failed to execute" }));
            } else {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(results));
            }
            this.close();
        });
    }

    
    insertQuery(query, res) {
        this.connect();

        this.connection.query(query, (err, results) => {
            if (err) {
                console.error('Error executing query:', err);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ msg: "failed"}));
            } else {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ msg: "success" }));
            }
            this.close();
        });
    }
}

const database = new Database(); 

app.get('/', (req, res) => {
    res.send('Hello World!');
});


app.post('/signup', (req, res) => {
    const { username, password } = req.body;
    const saltRounds = 10;

    database.selectQuery(`SELECT * FROM users WHERE username = '${username}'`, (err, results) => {
        if (err) {
            res.status(500).json({ msg: 'Error checking for duplicates' });
        } else if (results.length > 0) {
            res.status(400).json({ msg: 'Username already exists' });
        } else {
            bcrypt.hash(password, saltRounds, (err, hash) => {
                if (err) {
                    res.status(500).json({ msg: 'Error hashing password' });
                } else {
                    const insertQuery = `INSERT INTO users (username, password) VALUES ('${username}', '${hash}')`;
                    database.insertQuery(insertQuery, res);
                }
            });
        }
    });

    res.send('User signed up successfully!');
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    
    database.selectQuery(`SELECT * FROM users WHERE username = '${username}'`, (err, results) => {
        
        if (err) {
            res.status(500).json({ msg: 'Error checking for user' });
        } 
        else if (results.length === 0) {
            res.status(400).json({ msg: 'Username not found' });
        } 

        else {

            const hashedPassword = results[0].password;

            bcrypt.compare(password, hashedPassword, (err, result) => {
                
                if (err) {
                    res.status(500).json({ msg: 'Error comparing passwords' });
                } 
                else if (result) {
                    res.status(200).json({ msg: 'Login successful' });
                } 
                else {
                    res.status(400).json({ msg: 'Incorrect password' });
                }
            });
        }
    });

    res.send('User logged in successfully!');
});

app.listen(port, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${port}`);
});



