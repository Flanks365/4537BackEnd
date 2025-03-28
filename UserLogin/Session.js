const mysql = require('mysql2/promise');
require('dotenv').config();

const Database = require('./database');
const db = new Database();

class SessionTeacherUtils{

    generateRandomCode() {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let code = '';
        for (let i = 0; i < 4; i++) {
            const randomIndex = Math.floor(Math.random() * characters.length);
            code += characters[randomIndex];
        }
        console.log(`Generated random code: ${code}`);
        return code;
    }

    static async createSession(req, res) {
        console.log('Creating session...');

        let randomCode = this.prototype.generateRandomCode();

        let selectQuery = `SELECT * FROM Session WHERE session_code = '${randomCode}'`;
        let result = await db.selectQuery(selectQuery);

        while(result.length > 0) {
            console.log(`Code ${randomCode} already exists. Generating a new one.`);
            randomCode = this.prototype.generateRandomCode();
            selectQuery = `SELECT * FROM Session WHERE session_code = '${randomCode}'`;
            result = await db.selectQuery(selectQuery);
        }

        console.log(`Inserting new session with code: ${randomCode}`);
        const insertQuery = `INSERT INTO Session (session_code, is_active) VALUES ('${randomCode}', true)`;
        await db.insertQuery(insertQuery);

        const sessionQuery = `SELECT * FROM Session WHERE session_code = '${randomCode}'`;
        const sessionResult = await db.selectQuery(sessionQuery);

        if (sessionResult.length === 0) {
            console.error('Session creation failed');
            throw new Error('Session creation failed');
        }

        const sessionId = sessionResult[0].id;
        console.log(`Session created successfully with ID: ${sessionId}`);

        const userToken = req.body.token; 
        const userSelectQuery = `SELECT * FROM validTokens WHERE token = '${userToken}'`;
        const userResult = await db.selectQuery(userSelectQuery);

        if (userResult.length === 0) {
            console.error('User not found');
            throw new Error('User not found');
        }

        const userId = userResult[0].user_id;
        console.log(`User ID ${userId} associated with the session.`);

        const userSessionQuery = `INSERT INTO UserSession (user_id, session_id) VALUES ('${userId}', '${sessionId}')`;
        await db.insertQuery(userSessionQuery);

        return {code: randomCode, sessionId: sessionId};
    }

    static async checkSession(req, res) {
        console.log('Checking session...');
        const { sessionCode } = req.body;
        const selectQuery = `SELECT * FROM Session WHERE session_code = '${sessionCode}'`;
        const result = await db.selectQuery(selectQuery);

        if (result.length === 0) {
            console.warn('Session not found');
            return false;
        }

        console.log(`Session found. Active: ${result[0].is_active}`);
        return result[0].is_active;
    }

    static async destroySession(req, res) {
        try {
            // Validate request body
            if (!req.body || !req.body.sessionId) {
                console.error('Error: Missing sessionCode in request body');
            }
    
            const { sessionId } = req.body;
            
            // Parameterized query to prevent SQL injection
            const updateQuery = `UPDATE Session SET is_active = false WHERE id = ${sessionId}`;
            console.log(`Attempting to deactivate session with code: ${sessionId}`);
            
            // Execute query with error handling
            const result = await db.insertQuery(updateQuery);
            
            // Check if any rows were affected
            if (result.rowCount === 0) {
                console.warn(`Warning: No session found with code: ${sessionId}`);
            }
    
            console.log(`Success: Session with code ${sessionId} marked as inactive. Rows affected: ${result.rowCount}`);
            
            return true
    
        } catch (error) {
            console.error('Error in destroySession:', error);
            
            // Differentiate between database errors and other errors
            if (error.code && error.code.startsWith('22') || error.code.startsWith('23')) {
                console.log('Database error:', error);
            } else if (error.code === 'ECONNREFUSED') {
                console.log('Database connection refused:', error);
            } else {
                console.log('Unexpected error:', error);
            }
        }
    }

    static async recieveQuestions(req,res){
        console.log('Receiving new question...');
        const { sessionId, question } = req.body;
        await this.endQuestion(req, res);
        console.log(`Inserting new question into session ${sessionId}`);

        const insertQuery = `INSERT INTO Question (session_id, text) VALUES ('${sessionId}', '${question}')`;
        await db.insertQuery(insertQuery);

        const selectQuery = `SELECT * FROM Question WHERE text = '${question}'`;
        const result = await db.selectQuery(selectQuery);

        if (result.length === 0) {
            console.error('Question insertion failed');
            throw new Error('Question insertion failed');
        }

        const questionId = result[0].id;
        console.log(`Question inserted successfully with ID: ${questionId}`);
        return questionId;
    }

    static async endQuestion(req,res){
        console.log('Ending active question...');
        const { sessionId } = req.body;

        const checkQuery = `SELECT * FROM Question WHERE session_id = '${sessionId}' AND curr_question = true`;
        const checkResult = await db.selectQuery(checkQuery);

        if (checkResult.length > 0) {
            console.log('Active question found. Ending it...');
            const updateQuery = `UPDATE Question SET curr_question = false WHERE session_id = '${sessionId}' AND curr_question = true`;
            await db.insertQuery(updateQuery);
        } else {
            console.log('No active question found.');
        }
    }

    static async retrieveAnswers(req,res){
        console.log('Retrieving answers for active question...');
        const sessionId = req.body.sessionId;

        const questionQuery = `SELECT * FROM Question WHERE session_id = '${sessionId}' AND curr_question = true`;
        const questionResult = await db.selectQuery(questionQuery);

        if (questionResult.length === 0) {
            console.error('No active question found');
            throw new Error('No active question found');
        }

        const questionId = questionResult[0].id;
        console.log(`Fetching answers for question ID: ${questionId}`);

        const selectQuery = `
            SELECT Answer.id, Answer.text, Answer.correctness, Users.name 
            FROM Answer
            JOIN Users ON Answer.user_id = Users.id
            WHERE Answer.question_id = '${questionId}'
        `;

        const result = await db.selectQuery(selectQuery);

        if (result.length === 0) {
            console.error('Answer retrieval failed');
            throw new Error('Answer retrieval failed');
        }

        console.log(`Retrieved ${result.length} answers.`);
        return result;
    }
}

class SessionStudentUtils{

    //join
    static async joinSession(req,res){
        const {session_code, userId} = req.body;

        console.log(`Joining session with code: ${session_code} for user ID: ${userId}`);
        const sessionQuery = `SELECT * FROM Session WHERE session_code = '${session_code}'`;
        const sessionResult = await db.selectQuery(sessionQuery);
        if (sessionResult.length === 0) {
            console.error('Session not found');
            throw new Error('Session not found');
        }
        const sessionId = sessionResult[0].id;
        console.log(`Session found with ID: ${sessionId}`);
        const userSessionQuery = `INSERT INTO UserSession (user_id, session_id) VALUES ('${userId}', '${sessionId}')`;
        await db.insertQuery(userSessionQuery);
        console.log(`User ID ${userId} joined session ID ${sessionId}`);
        return {sessionId: sessionId};
    }


    //retrive question
    static async retrieveQuestion(req,res){
        console.log('Retrieving active question...');
        const { sessionId } = req.body;

        const selectQuery = `SELECT * FROM Question WHERE session_id = '${sessionId}' AND curr_question = true`;
        const result = await db.selectQuery(selectQuery);

        if (result.length === 0) {
            console.error('No active question found');
            throw new Error('No active question found');
        }

        console.log(`Active question found: ${result[0].text}`);
        return result[0];
    }


    //recieve answer
    static async recieveAnswer(req,res){
        console.log('Receiving answer...');
        const {userId,questionId, answer} = req.body;

        // here do correctness logic / api call to ai

        console.log(`Inserting answer: ${answer}`);
        const insertQuery = `INSERT INTO Answer (text, correctness, question_id, user_id) VALUES ( '${answer}', 0.5, '${questionId}', '${userId}')`;
        await db.insertQuery(insertQuery);

        return correct_val;
    }
}

module.exports = {
    SessionTeacherUtils,
    SessionStudentUtils
};
