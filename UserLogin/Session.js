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

    static async createSession(req) {
        try {
            let randomCode = this.prototype.generateRandomCode();
            let selectQuery = `SELECT * FROM Session WHERE session_code = '${randomCode}'`;
            let result = await db.selectQuery(selectQuery);

            while(result.length > 0) {
                randomCode = this.prototype.generateRandomCode();
                result = await db.selectQuery(`SELECT * FROM Session WHERE session_code = '${randomCode}'`);
            }

            const insertQuery = `INSERT INTO Session (session_code, is_active) VALUES ('${randomCode}', true)`;
            await db.insertQuery(insertQuery);

            const sessionQuery = `SELECT * FROM Session WHERE session_code = '${randomCode}'`;
            const sessionResult = await db.selectQuery(sessionQuery);

            if (sessionResult.length === 0) {
                throw new Error(messages.errors.sessionCreationFailed);
            }

            const sessionId = sessionResult[0].id;
            const userToken = req.body.token; 
            const userSelectQuery = `SELECT * FROM validTokens WHERE token = '${userToken}'`;
            const userResult = await db.selectQuery(userSelectQuery);

            if (userResult.length === 0) {
                throw new Error(messages.errors.userNotFound);
            }

            const userId = userResult[0].user_id;
            await apiStatsUtils.incrementUsage(userId, '/api/v1/createSession', 'POST');

            const userSessionQuery = `INSERT INTO UserSession (user_id, session_id) VALUES ('${userId}', '${sessionId}')`;
            await db.insertQuery(userSessionQuery);

            return {
                success: true,
                code: randomCode, 
                sessionId: sessionId,
                message: messages.success.sessionCreated
            };

        } catch (err) {
            return {
                success: false,
                message: messages.errors.sessionCreationError,
                error: err.message
            };
        }
    }

    static async checkSession(req) {
        try {
            const { token, sessionCode } = req.body;
            const userId = jwt.verify(token, secretKey, { algorithms: ['HS256'] }).userId;
            await apiStatsUtils.incrementUsage(userId, '/api/v1/checkSession', 'POST');

            const selectQuery = `SELECT * FROM Session WHERE session_code = '${sessionCode}'`;
            const result = await db.selectQuery(selectQuery);

            if (result.length === 0) {
                return false;
            }

            return result[0].is_active
           

        } catch (err) {
            return {
                success: false,
                message: messages.errors.sessionCheckError,
                error: err.message
            };
        }
    }

    static async destroySession(req) {
        try {
            const {token} = req.body;
            const userId = jwt.verify(token, secretKey, { algorithms: ['HS256'] }).userId;
            await apiStatsUtils.incrementUsage(userId, '/api/v1/destroySession', 'POST');

            if (!req.body || !req.body.sessionId) {
                return {
                    success: false,
                    message: messages.errors.missingSessionId
                };
            }

            const { sessionId } = req.body;
            const updateQuery = `UPDATE Session SET is_active = false WHERE id = '${sessionId}'`;
            const result = await db.insertQuery(updateQuery);
            
            if (result.affectedRows === 0) {
                return false;
            }

            return true

        } catch (error) {
            return {
                success: false,
                message: messages.errors.sessionEndError,
                error: error.message
            };
        }
    }

    static async recieveQuestions(req) {
        try {
            const { token, sessionId, question } = req.body;
            const userId = jwt.verify(token, secretKey, { algorithms: ['HS256'] }).userId;
            await apiStatsUtils.incrementUsage(userId, '/api/v1/receiveQuestions', 'POST');

            await this.endQuestion(req);

            const insertQuery = `INSERT INTO Question (session_id, text) VALUES ('${sessionId}', '${question}')`;
            await db.insertQuery(insertQuery);

            const selectQuery = `SELECT * FROM Question WHERE text = '${question}' AND session_id = '${sessionId}'`;
            const result = await db.selectQuery(selectQuery);

            if (result.length === 0) {
                throw new Error(messages.errors.questionCreationFailed);
            }

            return result[0].id
        

        } catch (err) {
            return {
                success: false,
                message: messages.errors.questionCreationError,
                error: err.message
            };
        }
    }

    static async endQuestion(req) {
        try {
            const { token, sessionId } = req.body;
            const userId = jwt.verify(token, secretKey, { algorithms: ['HS256'] }).userId;
            await apiStatsUtils.incrementUsage(userId, '/api/v1/endQuestion', 'POST');

            const checkQuery = `SELECT * FROM Question WHERE session_id = '${sessionId}' AND curr_question = true`;
            const checkResult = await db.selectQuery(checkQuery);

            if (checkResult.length > 0) {
                const updateQuery = `UPDATE Question SET curr_question = false WHERE session_id = '${sessionId}' AND curr_question = true`;
                await db.insertQuery(updateQuery);
            }

            return {
                success: true,
                message: messages.success.questionEnded
            };

        } catch (err) {
            return {
                success: false,
                message: messages.errors.questionEndError,
                error: err.message
            };
        }
    }

    static async retrieveAnswers(req) {
        try {
            const {token, sessionId} = req.body;
            const userId = jwt.verify(token, secretKey, { algorithms: ['HS256'] }).userId;
            await apiStatsUtils.incrementUsage(userId, '/api/v1/retrieveAnswers', 'POST');

            const questionQuery = `SELECT * FROM Question WHERE session_id = '${sessionId}' AND curr_question = true`;
            const questionResult = await db.selectQuery(questionQuery);

            if (questionResult.length === 0) {
                return {
                    success: true,
                    message: messages.success.noActiveQuestion,
                    answers: []
                };
            }

            const questionId = questionResult[0].id;
            const selectQuery = `
                SELECT Answer.id, Answer.text, Answer.correctness, users.name 
                FROM Answer
                JOIN users ON Answer.user_id = users.id
                WHERE Answer.question_id = '${questionId}'
            `;

            const result = await db.selectQuery(selectQuery);

            return result.length > 0 ? result : []

        } catch (err) {
            return {
                success: false,
                message: messages.errors.answersRetrievalError,
                error: err.message
            };
        }
    }
}

class SessionStudentUtils {
    static async joinSession(req) {
        try {
            const {session_code, token} = req.body;
            const userId = jwt.verify(token, secretKey, { algorithms: ['HS256'] }).userId;
            await apiStatsUtils.incrementUsage(userId, '/api/v1/joinSession', 'POST');

            const sessionQuery = `SELECT * FROM Session WHERE session_code = '${session_code}'`;
            const sessionResult = await db.selectQuery(sessionQuery);

            if (sessionResult.length === 0) {
                return {
                    success: false,
                    message: messages.errors.sessionNotFound
                };
            }

            const sessionId = sessionResult[0].id;
            const userSessionQuery = `INSERT INTO UserSession (user_id, session_id) VALUES ('${userId}', '${sessionId}')`;
            await db.insertQuery(userSessionQuery);

            return {
                success: true,
                message: messages.success.sessionJoined,
                sessionId: sessionId
            };

        } catch (err) {
            return {
                success: false,
                message: messages.errors.sessionJoinError,
                error: err.message
            };
        }
    }

    static async retrieveQuestion(req) {
        try {
            const { token, sessionId } = req.body;
            const userId = jwt.verify(token, secretKey, { algorithms: ['HS256'] }).userId;
            await apiStatsUtils.incrementUsage(userId, '/api/v1/retrieveQuestion', 'POST');

            const selectQuery = `SELECT * FROM Question WHERE session_id = '${sessionId}' AND curr_question = true`;
            const result = await db.selectQuery(selectQuery);

            if (result.length === 0) {
                return {};
            }

            return result[0];
           

        } catch (err) {
            return {
                success: false,
                message: messages.errors.questionRetrievalError,
                error: err.message
            };
        }
    }

    static async recieveAnswer(req) {
        try {
            const {token, questionId, question, answer} = req.body;
            const userId = jwt.verify(token, secretKey, { algorithms: ['HS256'] }).userId;
            await apiStatsUtils.incrementUsage(userId, '/api/v1/receiveAnswer', 'POST');

            const gradeObj = await aiUtils.gradeAnswer(question, answer);
            if (!gradeObj.grade || gradeObj.grade.length <= 0) {
                throw new Error(messages.errors.answerGradingFailed);
            }

            const correct_val = gradeObj.grade[0].score;
            const insertQuery = `INSERT INTO Answer (text, correctness, question_id, user_id) VALUES ('${answer}', ${correct_val}, '${questionId}', '${userId}')`;
            await db.insertQuery(insertQuery);

            return correct_val;

        } catch (err) {
            return {
                success: false,
                message: messages.errors.answerSubmissionError,
                error: err.message
            };
        }
    }
}

module.exports = {
    SessionTeacherUtils,
    SessionStudentUtils
};