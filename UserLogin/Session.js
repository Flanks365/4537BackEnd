const express = require('express');
const http = require('http');
const mysql = require('mysql2/promise');
require('dotenv').config();
const Database = require('./database');
const LoginUtils = require('./Login');
const cors = require('cors');

const allowedOrigins = [
  'https://octopus-app-x9uen.ondigitalocean.app',
  'https://my-memory-game2.netlify.app',
  'https://seashell-app-ojo24.ondigitalocean.app'
];


const app = express();
const server = http.createServer(app);
const port = process.env.PORT || 8080;

app.use(express.json());

const corsOptions = {
  origin: function (origin, callback) {
      if (allowedOrigins.includes(origin)) {
          callback(null, true); // Allow the origin
      } else {
          callback(new Error('CORS not allowed'), false); // Reject the origin
      }
  },
  methods: 'GET, POST, PUT, DELETE, OPTIONS',
  allowedHeaders: 'Content-Type, Authorization'
};

// Use CORS middleware in Express
app.use(cors(corsOptions));


const db = new Database();
const login = new LoginUtils();

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

app.post('/signup', async (req, res) => {
  console.log("GET /signup");
  try {
    login.routeRequest(req, res);
  } catch (err) {
    res.status(500).json({
      message: 'Error connecting to the database or executing query',
      error: err.message
    });
  }
});

app.post('/login', async (req, res) => {
  console.log("GET /login");
  try {
    login.routeRequest(req, res);
  } catch (err) {
    res.status(500).json({
      message: 'Error connecting to the database or executing query',
      error: err.message
    });
  }
});

app.post('/logout', async (req, res) => {
  console.log("GET /logout");
  try {
    login.routeRequest(req, res);
  } catch (err) {
    res.status(500).json({
      message: 'Error connecting to the database or executing query',
      error: err.message
    });
  }
});

app.post('/checktoken', async (req, res) => {
  console.log("GET /checkToken");
  try {
    login.routeRequest(req, res);
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
