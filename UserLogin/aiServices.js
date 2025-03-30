require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const Database = require('./database');
const db = new Database();

const secretKey = process.env.JWT_SECRET_KEY;
const API_URL = process.env.AI_API_URL;
const API_KEY = process.env.AI_API_KEY;

class aiUtils{
    static async transcribeQuestion(req, res) {
        try {
            const userId = jwt.verify(req.token, secretKey, { algorithms: ['HS256'] }).userId;
            await apiStatsUtils.incrementUsage(userId, '/api/v1/transcribeQuestion', 'POST')

            const audioFilePath = req.file.path;
            const file = fs.createReadStream(audioFilePath)
            const headers = {
                'api-key': API_KEY,
                'Content-Type': 'multipart/form-data'
            }
            const body = {
                file: file
            }
            const response = await axios.post(API_URL + 'transcribe', body, {headers: headers});
    
            fs.unlinkSync(audioFilePath);
    
            return response.data; // {questionText}
        } catch (error) {
            console.error('Error:', error);
            throw new Error('Failed to transcribe audio: ' + error)
            // res.status(500).json({ error: 'Failed to transcribe audio' });
        }
    }

    static async gradeAnswer(req, res) {
        try {
            const headers = {
                'api-key': API_KEY,
                'Content-Type': 'application/json'
            }

            const answerText = `The following answer is relevant, and correctly and completely answers the question.\nQuestion: ${req.body.question}\nAnswer: ${req.body.answer}`
            const body = {
                text: answerText
            }

            const response = await axios.post(API_URL + 'gradeanswer', body, {headers: headers});
    
            return response.data; // {label, score}
        } catch (error) {
            console.error('Error:', error);
            throw new Error('Failed to grade answer')
            // res.status(500).json({ error: 'Failed to grade answer' });
        }
    }

    static async decrementUsage(userId) {
        if (typeof userId !== 'number' && typeof userId !== 'string') {
            throw new Error('Invalid user ID.')
        }

        let selectQuery = `select * from users where id = ${userId};`
        let result = await db.selectQuery(selectQuery)

        if (!result || result.length <= 0) {
            throw new Error('User data could not be found.')
        } else {
            const user = result[0]
            const updateQuery = `update users set api_usage = ${Math.max(0, user.api_usage - 1)} where id = ${userId};`
            await db.updateQuery(updateQuery)
        }
    }
}

module.exports = aiUtils
