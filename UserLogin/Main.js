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

const app = express();
const server = http.createServer(app);
const port = process.env.PORT || 8080;
const upload = multer({ dest: 'uploads/' });

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
const sessionStudent = SessionStudentUtils


app.get('/', async (req, res) => {
  console.log("GET /");
  try {
    const results = await db.selectQuery('SELECT * FROM users');
    res.json({
      message: 'Database connection and query successful',
      data: results
    });
  } catch (err) {
    res.status(500).json({
      message: 'Error connecting to the database or executing query',
      error: err.message
    });
  }
});

app.post("/api/v1/createsession", async (req, res) => {
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

app.post('/api/v1/joinsession', async (req, res) => {
  console.log("GET /joinsession");
  try {
    const result = await sessionStudent.joinSession(req,res);
    res.json({
      msg: 'Session joined successfully!',
      sessionId: result.sessionId
    });
  } catch (err) {
    res.status(500).json({
      msg: 'Error connecting to the database or executing query',
      error: err.message
    });
  }
});

app.post('/api/v1/retrivequestion', async (req, res) => {
  console.log("GET /retrivequestion");
  try {
    const question = await sessionStudent.retrieveQuestion(req,res);
    res.json({
      msg: 'Question retrieved successfully!',
      question: question
    });
  } catch (err) {
    res.status(500).json({
      msg: 'Error connecting to the database or executing query',
      error: err.message
    });
  }
});

app.post('/api/v1/recieveanswer', async (req, res) => {
  console.log("GET /recieveanswer");
  try {
    const result = await sessionStudent.recieveAnswer(req,res);
    res.json({
      msg: 'Answer received successfully!',
      result: result
    });
  } catch (err) {
    res.status(500).json({
      msg: 'Error connecting to the database or executing query',
      error: err.message
    });
  }
});




app.post('/api/v1/checksession', async (req, res) => {
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


app.post('/api/v1/destroysession', async (req, res) => {
  console.log("GET /destroysession");
  try {
    const result = await session.destroySession(req, res);
    res.json({
      msg: 'Session destroyed successfully!',
      is_active: result
    });
  } catch (err) {
    res.status(500).json({
      msg: 'Error connecting to the database or executing query',
      error: err.message
    });
  }
});

app.post('/api/v1/confirmquestion', async (req, res) => {
  console.log("GET /confirmquestion");
  try {
    const questionId = await session.recieveQuestions(req, res);
    res.json({
      msg: 'Question confirmed successfully!',
      questionId: questionId
    });
  } catch (err) {
    res.status(500).json({
      msg: 'Error connecting to the database or executing query',
      error: err.message
    });
  }
}
);

app.post('/api/v1/endquestion', async (req, res) => {
  console.log("GET /endquestion");
  try {
    await session.endQuestion(req, res);
    res.json({
      msg: 'Question ended successfully!'
    });
  } catch (err) {
    res.status(500).json({
      msg: 'Error connecting to the database or executing query',
      error: err.message
    });
  }
});

app.post('/api/v1/getanswers', async (req, res) => {
  console.log("GET /getanswers");
  try {
    const answers = await session.retrieveAnswers(req, res);
    res.json({
      msg: 'Answers retrieved successfully!',
      answers: answers
    });
  } catch (err) {
    res.status(500).json({
      msg: 'Error connecting to the database or executing query',
      error: err.message
    });
  }
});

app.post('/api/v1/signup', async (req, res) => {
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

app.post('/api/v1/login', async (req, res) => {
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

app.post('/api/v1/logout', async (req, res) => {
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

app.post('/api/v1/checktoken', async (req, res) => {
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

app.post('/api/v1/transcribeQuestion', upload.single('file'), async (req, res) => {
  console.log("POST /transcribeQuestion");
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    const questionText = await aiUtils.transcribeQuestion(req, res)
    res.json(questionText)
  } catch (err) {
    res.status(500).json({
      msg: 'Error connecting to the database or executing query',
      error: err.message
    });
  }
});

app.post('/api/v1/gradeAnswer', async (req, res) => {
  console.log("POST /gradeAnswer");
  try {
    const gradedAnswer = await aiUtils.gradeAnswer(req, res)
    res.json(gradedAnswer)
  } catch (err) {
    res.status(500).json({
      msg: 'Error connecting to the database or executing query',
      error: err.message
    });
  }
});

app.get('/api/v1/apiStats', async (req, res) => {
  console.log("GET /apiStats");
  res.json(req)
  try {
    const result = await apiStatsUtils.getUsage(req, res)
    res.json(result)
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
