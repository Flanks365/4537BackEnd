const express = require('express');
const http = require('http');
const mysql = require('mysql2/promise');
require('dotenv').config();
const Database = require('./database');


const app = express();
const server = http.createServer(app);
const port = process.env.PORT || 8080;

app.use(express.json());


const db = new Database();

// create session




// session checker

// check if session is available via a boolean



// session destroyer


// take 



// 

app.get('/', async (req, res) => {
  console.log("GET /");
  try {
    const results = await db.selectQuery('SELECT * FROM users');
    res.json({
      message: 'Database connection and query successful!',
      data: results
    });
  } catch (err) {
    res.status(500).json({
      message: 'Error connecting to the database or executing query',
      error: err.message
    });
  }
});





server.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
