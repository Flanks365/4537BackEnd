const mysql = require('mysql2/promise');
require('dotenv').config();

const Database = require('./database');
const { Session } = require('express-session');
const db = new Database();

class SessionTeacherUtils{


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
        // function gets callled. no payload
        // function generates a 4 char random code only alphanumeiric characters

        let randomCode = generateRandomCode();

        // function checks if the code already exists in the database
        // if it does, generate a new code and check again
        const selectQuery = `SELECT * FROM Session WHERE code = '${randomCode}'`;
        let result = await db.selectQuery(selectQuery);

        while(result.length > 0) {
            randomCode = generateRandomCode();
            const selectQuery = `SELECT * FROM Session WHERE code = '${randomCode}'`;
            result = await db.selectQuery(selectQuery);
        }
        // if it does not, insert the code into the database
        // and sets the session is_active to true

        const insertQuery = `INSERT INTO Session (code, is_active) VALUES ('${randomCode}', true)`;
        await db.insertQuery(insertQuery);

        // Get the newly created session ID (adjust based on your DB implementation)
        const sessionQuery = `SELECT * FROM Session WHERE code = '${randomCode}'`;
        const sessionResult = await db.selectQuery(sessionQuery);

        if (sessionResult.length === 0) {
            throw new Error('Session creation failed');
        }

        const sessionId = sessionResult.id;
    
        // Get the user ID (you'll need to adjust this based on how you store user info)

        const userToken = req.token; 
        const userSelectQuery = `SELECT * FROM validTokens WHERE token = '${userToken}'`;

        const userResult = await db.selectQuery(userSelectQuery);

        if (userResult.length === 0) {
            throw new Error('User not found');
        }

        const userId = userResult[0].user_id;
    
        // Insert into UserSession table
        const userSessionQuery = `INSERT INTO UserSession (user_id, session_id) VALUES ('${userId}', '${sessionId}')`;
        await db.insertQuery(userSessionQuery);

        return {code: randomCode, sessionId: sessionId};

    }

    static async checkSession(req, res) {
        const { sessionCode } = req.body;
        const selectQuery = `SELECT * FROM Session WHERE code = '${sessionCode}'`;
        const result = await db.selectQuery(selectQuery);

        if (result.length === 0) {
            return false;
        }

        return result[0].is_active;
    }

    static async destroySession(req, res) {
        const { sessionCode } = req.body;
        const updateQuery = `UPDATE Session SET is_active = false WHERE code = '${sessionCode}'`;
        await db.insertQuery(updateQuery);

        return true;
    }

    static async recieveQuestions(req,res){
        const { sessionId, question } = req.body;

        //check if there is an active question in the session
        // and the question curr_question columns = true
        this.endQuestion(req,res);
        // insert the new question
        const insertQuery = `INSERT INTO Question (session_id, text) VALUES ('${sessionId}', '${question}')`;
        await db.insertQuery(insertQuery);

        const selectQuery = `SELECT * FROM Question WHERE text = '${question}'`;
        const result = await db.selectQuery(selectQuery);
        if (result.length === 0) {
            throw new Error('Question insertion failed');
        }
        const questionId = result[0].id;

        return questionId;
    }

    static async endQuestion(req,res){
        const { sessionId } = req.body;

        // check if there is an active question in the session
        // and the question curr_question columns = true
        // if there is, set it to false

        const checkQuery = `SELECT * FROM Question WHERE session_id = '${sessionId}' AND curr_question = true`;
        const checkResult = await db.selectQuery(checkQuery);
        if (checkResult.length > 0) {
            // turn it off
            const updateQuery = `UPDATE Question SET curr_question = false WHERE session_id = '${sessionId}' AND curr_question = true`;
            await db.insertQuery(updateQuery);
        }
    }

    static async retrieveAnswers(req,res){
        const {sessionId} = req.body;

        const questionQuery = `SELECT * FROM Question WHERE session_id = '${sessionId}' AND curr_question = true`;
        const questionResult = await db.selectQuery(questionQuery);
        if (questionResult.length === 0) {
            throw new Error('No active question found');
        }
        const questionId = questionResult[0].id;

        const selectQuery = `
                SELECT Answer.id, Answer.text, Answer.correctness, Users.name 
                FROM Answer
                JOIN Users ON Answer.user_id = Users.id
                WHERE Answer.question_id = '${questionId}'
        `;

        const result = await db.selectQuery(selectQuery);

        if (result.length === 0) {
            throw new Error('Answer Retrivel failed');
        }

        return result;
    }
}

class SessionStudentUtils{

}

module.exports = {
    SessionTeacherUtils,
    SessionStudentUtils
};