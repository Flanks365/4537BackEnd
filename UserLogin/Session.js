const mysql = require('mysql2/promise');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const apiStatsUtils = require('./apiStats');
const aiUtils = require('./aiServices');
const fs = require('fs');

const messages = JSON.parse(fs.readFileSync('./lang/en/messages.json'));
const secretKey = process.env.JWT_SECRET_KEY;
const Database = require('./database');
const db = new Database();

class SessionTeacherUtils {
    generateRandomCode() {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let code = '';
        for (let i = 0; i < 4; i++) {
            const randomIndex = Math.floor(Math.random() * characters.length);
            code += characters[randomIndex];
        }
        return code;
    }

    static async createSession(req, res) {
        try {
            let randomCode = this.prototype.generateRandomCode();
            let selectQuery = 'SELECT * FROM Session WHERE session_code = ?';
            let result = await db.selectQuery(selectQuery, [randomCode]);

            while(result.length > 0) {
                randomCode = this.prototype.generateRandomCode();
                result = await db.selectQuery(selectQuery, [randomCode]);
            }

            const insertQuery = 'INSERT INTO Session (session_code, is_active) VALUES (?, true)';
            await db.insertQuery(insertQuery, [randomCode]);

            const sessionQuery = 'SELECT * FROM Session WHERE session_code = ?';
            const sessionResult = await db.selectQuery(sessionQuery, [randomCode]);

            if (sessionResult.length === 0) {
                throw new Error(messages.errors.sessionCreationFailed);
            }

            const sessionId = sessionResult[0].id;
            const userToken = req.body.token; 
            const userSelectQuery = 'SELECT * FROM validTokens WHERE token = ?';
            const userResult = await db.selectQuery(userSelectQuery, [userToken]);

            if (userResult.length === 0) {
                throw new Error(messages.errors.userNotFound);
            }

            const userId = userResult[0].user_id;
            await apiStatsUtils.incrementUsage(userId, '/api/v1/createSession', 'POST');

            const userSessionQuery = 'INSERT INTO UserSession (user_id, session_id) VALUES (?, ?)';
            await db.insertQuery(userSessionQuery, [userId, sessionId]);

            return {
                code: randomCode, 
                sessionId: sessionId,
                message: messages.success.sessionCreated
            };

        } catch (err) {
            res.status(500).json({
                message: messages.errors.sessionCreationError,
                error: err.message
            });
            throw err;
        }
    }

    static async checkSession(req, res) {
        try {
            const { token, sessionCode } = req.body;
            const userId = jwt.verify(token, secretKey, { algorithms: ['HS256'] }).userId;
            await apiStatsUtils.incrementUsage(userId, '/api/v1/checkSession', 'POST');

            const selectQuery = 'SELECT * FROM Session WHERE session_code = ?';
            const result = await db.selectQuery(selectQuery, [sessionCode]);

            if (result.length === 0) {
                return res.status(404).json({
                    message: messages.errors.sessionNotFound,
                    is_active: false
                });
            }

            return res.json({
                message: messages.success.sessionStatus,
                is_active: result[0].is_active
            });

        } catch (err) {
            res.status(500).json({
                message: messages.errors.sessionCheckError,
                error: err.message
            });
        }
    }

    static async destroySession(req, res) {
        try {
            const {token} = req.body;
            const userId = jwt.verify(token, secretKey, { algorithms: ['HS256'] }).userId;
            await apiStatsUtils.incrementUsage(userId, '/api/v1/destroySession', 'POST');

            if (!req.body || !req.body.sessionId) {
                return res.status(400).json({
                    message: messages.errors.missingSessionId
                });
            }

            const { sessionId } = req.body;
            const updateQuery = 'UPDATE Session SET is_active = false WHERE id = ?';
            const result = await db.insertQuery(updateQuery, [sessionId]);
            
            if (result.affectedRows === 0) {
                return res.status(404).json({
                    message: messages.errors.sessionNotFound
                });
            }

            return res.json({
                message: messages.success.sessionEnded
            });

        } catch (error) {
            res.status(500).json({
                message: messages.errors.sessionEndError,
                error: error.message
            });
        }
    }

    static async recieveQuestions(req, res) {
        try {
            const { token, sessionId, question } = req.body;
            const userId = jwt.verify(token, secretKey, { algorithms: ['HS256'] }).userId;
            await apiStatsUtils.incrementUsage(userId, '/api/v1/receiveQuestions', 'POST');

            await this.endQuestion(req, res);

            const insertQuery = 'INSERT INTO Question (session_id, text) VALUES (?, ?)';
            await db.insertQuery(insertQuery, [sessionId, question]);

            const selectQuery = 'SELECT * FROM Question WHERE text = ? AND session_id = ?';
            const result = await db.selectQuery(selectQuery, [question, sessionId]);

            if (result.length === 0) {
                throw new Error(messages.errors.questionCreationFailed);
            }

            return res.json({
                message: messages.success.questionCreated,
                questionId: result[0].id
            });

        } catch (err) {
            res.status(500).json({
                message: messages.errors.questionCreationError,
                error: err.message
            });
        }
    }

    static async endQuestion(req, res) {
        try {
            const { token, sessionId } = req.body;
            const userId = jwt.verify(token, secretKey, { algorithms: ['HS256'] }).userId;
            await apiStatsUtils.incrementUsage(userId, '/api/v1/endQuestion', 'POST');

            const checkQuery = 'SELECT * FROM Question WHERE session_id = ? AND curr_question = true';
            const checkResult = await db.selectQuery(checkQuery, [sessionId]);

            if (checkResult.length > 0) {
                const updateQuery = 'UPDATE Question SET curr_question = false WHERE session_id = ? AND curr_question = true';
                await db.insertQuery(updateQuery, [sessionId]);
            }

            return res.json({
                message: messages.success.questionEnded
            });

        } catch (err) {
            res.status(500).json({
                message: messages.errors.questionEndError,
                error: err.message
            });
        }
    }

    static async retrieveAnswers(req, res) {
        try {
            const {token, sessionId} = req.body;
            const userId = jwt.verify(token, secretKey, { algorithms: ['HS256'] }).userId;
            await apiStatsUtils.incrementUsage(userId, '/api/v1/retrieveAnswers', 'POST');

            const questionQuery = 'SELECT * FROM Question WHERE session_id = ? AND curr_question = true';
            const questionResult = await db.selectQuery(questionQuery, [sessionId]);

            if (questionResult.length === 0) {
                return res.json({
                    message: messages.success.noActiveQuestion,
                    answers: []
                });
            }

            const questionId = questionResult[0].id;
            const selectQuery = `
                SELECT Answer.id, Answer.text, Answer.correctness, users.name 
                FROM Answer
                JOIN users ON Answer.user_id = users.id
                WHERE Answer.question_id = ?
            `;

            const result = await db.selectQuery(selectQuery, [questionId]);

            return res.json({
                message: messages.success.answersRetrieved,
                answers: result.length > 0 ? result : []
            });

        } catch (err) {
            res.status(500).json({
                message: messages.errors.answersRetrievalError,
                error: err.message
            });
        }
    }
}

class SessionStudentUtils {
    static async joinSession(req, res) {
        try {
            const {session_code, token} = req.body;
            const userId = jwt.verify(token, secretKey, { algorithms: ['HS256'] }).userId;
            await apiStatsUtils.incrementUsage(userId, '/api/v1/joinSession', 'POST');

            const sessionQuery = 'SELECT * FROM Session WHERE session_code = ?';
            const sessionResult = await db.selectQuery(sessionQuery, [session_code]);

            if (sessionResult.length === 0) {
                return res.status(404).json({
                    message: messages.errors.sessionNotFound
                });
            }

            const sessionId = sessionResult[0].id;
            const userSessionQuery = 'INSERT INTO UserSession (user_id, session_id) VALUES (?, ?)';
            await db.insertQuery(userSessionQuery, [userId, sessionId]);

            return res.json({
                message: messages.success.sessionJoined,
                sessionId: sessionId
            });

        } catch (err) {
            res.status(500).json({
                message: messages.errors.sessionJoinError,
                error: err.message
            });
        }
    }

    static async retrieveQuestion(req, res) {
        try {
            const { token, sessionId } = req.body;
            const userId = jwt.verify(token, secretKey, { algorithms: ['HS256'] }).userId;
            await apiStatsUtils.incrementUsage(userId, '/api/v1/retrieveQuestion', 'POST');

            const selectQuery = 'SELECT * FROM Question WHERE session_id = ? AND curr_question = true';
            const result = await db.selectQuery(selectQuery, [sessionId]);

            if (result.length === 0) {
                return res.json({
                    message: messages.success.noActiveQuestion,
                    question: null
                });
            }

            return res.json({
                message: messages.success.questionRetrieved,
                question: result[0]
            });

        } catch (err) {
            res.status(500).json({
                message: messages.errors.questionRetrievalError,
                error: err.message
            });
        }
    }

    static async recieveAnswer(req, res) {
        try {
            const {token, questionId, question, answer} = req.body;
            const userId = jwt.verify(token, secretKey, { algorithms: ['HS256'] }).userId;
            await apiStatsUtils.incrementUsage(userId, '/api/v1/receiveAnswer', 'POST');

            const gradeObj = await aiUtils.gradeAnswer(question, answer);
            if (!gradeObj.grade || gradeObj.grade.length <= 0) {
                throw new Error(messages.errors.answerGradingFailed);
            }

            const correct_val = gradeObj.grade[0].score;
            const insertQuery = 'INSERT INTO Answer (text, correctness, question_id, user_id) VALUES (?, ?, ?, ?)';
            await db.insertQuery(insertQuery, [answer, correct_val, questionId, userId]);

            return res.json({
                message: messages.success.answerReceived,
                correctness: correct_val
            });

        } catch (err) {
            res.status(500).json({
                message: messages.errors.answerSubmissionError,
                error: err.message
            });
        }
    }
}

module.exports = {
    SessionTeacherUtils,
    SessionStudentUtils
};