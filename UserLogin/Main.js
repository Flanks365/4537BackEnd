const express = require('express');
const multer = require('multer');
const http = require('http');
const mysql = require('mysql2/promise');
require('dotenv').config();
const Database = require('./database');
const LoginUtils = require('./Login');
const { SessionTeacherUtils, SessionStudentUtils } = require('./Session');
const aiUtils = require('./aiServices')
const apiStatsUtils = require('./apiStats')
const cors = require('cors');
const fs = require('fs')
const jwt = require('jsonwebtoken');

const secretKey = process.env.JWT_SECRET_KEY;

const messages = JSON.parse(fs.readFileSync('./lang/en/messages.json'));

const app = express();
const server = http.createServer(app);
const port = process.env.PORT || 8080;
const upload = multer({ dest: 'uploads/' });

app.use(express.json());

const swaggerUIPath = require("swagger-ui-express");
const swaggerDocument = require("./docs/swagger.json");
app.use("/docs", swaggerUIPath.serve);
app.get("/docs", swaggerUIPath.setup(swaggerDocument));

const corsOptions = {
  origin: [
    'https://octopus-app-x9uen.ondigitalocean.app',
    'http://localhost:8080',
    'https://cdn.jsdelivr.net'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept'
  ],
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

const db = new Database();
const login = LoginUtils;
const session = SessionTeacherUtils;
const sessionStudent = SessionStudentUtils;

app.get('/', async (req, res) => {
  try {
    const results = await db.selectQuery('SELECT * FROM users');
    res.json({
      message: messages.db.querySuccess,
      data: results
    });
  } catch (err) {
    res.status(500).json({
      msg: messages.db.connectionError,
      error: err.message
    });
  }
});

app.post("/api/v1/createsession", async (req, res) => {
  try {
    const sessionres = await session.createSession(req, res);
    res.json({
      msg: messages.session.created,
      sessionCode: (await sessionres).code,
      sessionId: (await sessionres).sessionId,
    });
  } catch (err) {
    res.status(500).json({
      msg: messages.db.connectionError,
      error: err.message
    });
  }
});

app.post('/api/v1/joinsession', async (req, res) => {
  try {
    const result = await sessionStudent.joinSession(req, res);
    res.json({
      msg: messages.session.joined,
      sessionId: result.sessionId
    });
  } catch (err) {
    res.status(500).json({
      msg: messages.db.connectionError,
      error: err.message
    });
  }
});

app.post('/api/v1/retrivequestion', async (req, res) => {
  try {
    const question = await sessionStudent.retrieveQuestion(req, res);
    res.json({
      msg: messages.session.questionRetrieved,
      question: question
    });
  } catch (err) {
    res.status(500).json({
      msg: messages.db.connectionError,
      error: err.message
    });
  }
});

app.post('/api/v1/recieveanswer', async (req, res) => {
  try {
    const result = await sessionStudent.recieveAnswer(req, res);
    res.json({
      msg: messages.session.answerReceived,
      result: result
    });
  } catch (err) {
    res.status(500).json({
      msg: messages.db.connectionError,
      error: err.message
    });
  }
});

app.post('/api/v1/checksession', async (req, res) => {
  try {
    const sessionStatus = await session.checkSession(req, res);
    res.json({
      msg: messages.session.checked,
      is_active: sessionStatus
    });
  } catch (err) {
    res.status(500).json({
      msg: messages.db.connectionError,
      error: err.message
    });
  }
});

app.put('/api/v1/destroysession', async (req, res) => {
  try {
    const result = await session.destroySession(req, res);
    res.json({
      msg: messages.session.destroyed,
      is_active: result
    });
  } catch (err) {
    res.status(500).json({
      msg: messages.db.connectionError,
      error: err.message
    });
  }
});

app.post('/api/v1/confirmquestion', async (req, res) => {
  try {
    const questionId = await session.recieveQuestions(req, res);
    res.json({
      msg: messages.session.questionConfirmed,
      questionId: questionId
    });
  } catch (err) {
    res.status(500).json({
      msg: messages.db.connectionError,
      error: err.message
    });
  }
});

app.post('/api/v1/endquestion', async (req, res) => {
  try {
    await session.endQuestion(req, res);
    res.json({
      msg: messages.session.questionEnded
    });
  } catch (err) {
    res.status(500).json({
      msg: messages.db.connectionError,
      error: err.message
    });
  }
});

app.post('/api/v1/getanswers', async (req, res) => {
  try {
    const answers = await session.retrieveAnswers(req, res);
    res.json({
      msg: messages.session.answersRetrieved,
      answers: answers
    });
  } catch (err) {
    res.status(500).json({
      msg: messages.db.connectionError,
      error: err.message
    });
  }
});

app.post('/api/v1/signup', async (req, res) => {
  try {
    await login.routeRequest(req, res);
  } catch (err) {
    res.status(500).json({
      msg: messages.db.connectionError,
      error: err.message
    });
  }
});

app.post('/api/v1/login', async (req, res) => {
  try {
    await login.routeRequest(req, res);
  } catch (err) {
    res.status(500).json({
      msg: messages.db.connectionError,
      error: err.message
    });
  }
});

app.delete('/api/v1/logout', async (req, res) => {
  try {
    await login.routeRequest(req, res);
  } catch (err) {
    res.status(500).json({
      msg: messages.db.connectionError,
      error: err.message
    });
  }
});

app.post('/api/v1/checktoken', async (req, res) => {
  try {
    await login.routeRequest(req, res);
  } catch (err) {
    res.status(500).json({
      msg: messages.db.connectionError,
      error: err.message
    });
  }
});

// ChatGPT used for file uploading syntax
app.post('/api/v1/transcribeQuestion', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: messages.auth.noFile });
  }

  try {
    const userId = jwt.verify(req.body.token, secretKey, { algorithms: ['HS256'] }).userId;
    await apiStatsUtils.incrementUsage(userId, '/api/v1/transcribeQuestion', 'POST');
    const questionText = await aiUtils.transcribeQuestion(req, res);
    await aiUtils.decrementUsage(userId);
    res.json(questionText);
  } catch (err) {
    res.status(500).json({
      msg: messages.auth.serverError,
      error: err.message
    });
  }
});

app.post('/api/v1/apiEndpointUsage', async (req, res) => {
  try {
    await apiStatsUtils.incrementUsage(req.body.userId, '/api/v1/apiEndpointUsage', 'GET');
    const result = await apiStatsUtils.endpointUsage();
    res.json({
      message: messages.api.endpointUsage,
      data: result
    });
  } catch (err) {
    res.status(500).json({
      msg: messages.db.connectionError,
      error: err.message
    });
  }
});

app.post('/api/v1/apiUserUsage', async (req, res) => {
  try {
    await apiStatsUtils.incrementUsage(req.body.userId, '/api/v1/apiUserUsage', 'GET');
    const result = await apiStatsUtils.userUsage();
    res.json({
      message: messages.api.userUsage,
      data: result
    });
  } catch (err) {
    res.status(500).json({
      msg: messages.db.connectionError,
      error: err.message
    });
  }
});

app.get('/api/v1/apiEndpointUsage', async (req, res) => {
  try {
    // await apiStatsUtils.incrementUsage(req.body.userId, '/api/v1/apiEndpointUsage', 'GET');
    const result = await apiStatsUtils.endpointUsage();
    res.json({
      message: messages.api.endpointUsage,
      data: result
    });
  } catch (err) {
    res.status(500).json({
      msg: messages.db.connectionError,
      error: err.message
    });
  }
});

app.get('/api/v1/apiUserUsage', async (req, res) => {
  try {
    const result = await apiStatsUtils.userUsage();
    res.json({
      message: messages.api.userUsage,
      data: result
    });
  } catch (err) {
    res.status(500).json({
      msg: messages.db.connectionError,
      error: err.message
    });
  }
});

app.get('/api/v1/apiAiUsage', async (req, res) => {
  console.log("GET /apiAiUsage");
  try {
    let userId = 27
    if (req.query.token) {
      userId = jwt.verify(req.query.token, secretKey, { algorithms: ['HS256'] }).userId;
    }
    await apiStatsUtils.incrementUsage(userId, '/api/v1/apiAiUsage', 'GET')
    const result = await apiStatsUtils.aiUsage(userId)
    res.json(result)
  } catch (err) {
    res.status(500).json({
      msg: messages.serverOrDbError,
      error: err.message
    });
  }
});

app.get('/api/v1/testdb', async (req, res) => {
  try {
    const result = await apiStatsUtils.testDb(req.body.query);
    res.json({
      message: messages.db.querySuccess,
      data: result
    });
  } catch (err) {
    res.status(500).json({
      msg: messages.db.connectionError,
      error: err.message
    });
  }
});

server.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});