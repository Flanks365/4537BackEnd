const express = require('express');
const http = require('http');
const mysql = require('mysql2/promise');
require('dotenv').config();
const Database = require('./database');
const LoginUtils = require('./Login');
const { SessionTeacherUtils } = require('./Session');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const port = process.env.PORT || 8080;

app.use(express.json());

// Set up CORS to allow specific origin
const corsOptions = {
  origin: 'https://octopus-app-x9uen.ondigitalocean.app',  // Allow this origin
  methods: ['GET', 'POST'],  // Adjust as needed for allowed methods
  credentials: true  // If you want to support cookies/session headers, set this to true
};

app.use(cors(corsOptions));

const db = new Database();
const login = LoginUtils;  // No instantiation needed if methods are static
const session = SessionTeacherUtils


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

app.post("/createsession", async (req, res) => {
  console.log("GET /createsession");
  try {
    const sessionres = await session.createSession(req, res);
    res.json({
      msg: 'Session created successfully!',
      sessionCode: (await sessionres).code,
      sessionId: (await sessionres).sessionId,
    });
  } catch (err) {
    res.status(500).json({
      msg: 'Error connecting to the database or executing query',
      error: err.message
    });
  }
});

app.post('/checksession', async (req, res) => {
  console.log("GET /checksession");
  try {
    const res = await session.checkSession(req, res);
    res.json({
      msg: 'Session checked successfully!',
      is_active: res
    });
  } catch (err) {
    res.status(500).json({
      msg: 'Error connecting to the database or executing query',
      error: err.message
    });
  }
});


app.post('/destroysession', async (req, res) => {
  console.log("GET /destroysession");
  try {
    const res = await session.destroySession(req, res);
    res.json({
      msg: 'Session destroyed successfully!',
      is_active: res
    });
  } catch (err) {
    res.status(500).json({
      msg: 'Error connecting to the database or executing query',
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
      msg: 'Error connecting to the database or executing query',
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
      msg: 'Error connecting to the database or executing query',
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
      msg: 'Error connecting to the database or executing query',
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
      msg: 'Error connecting to the database or executing query',
      error: err.message
    });
  }
});

server.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
