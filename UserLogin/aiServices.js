require('dotenv').config();
const axios = require('axios');
const fs = require('fs');

const Database = require('./database');
const db = new Database();

const API_URL = process.env.AI_API_URL;
const API_KEY = process.env.AI_API_KEY;

class aiUtils{
    static async transcribeQuestion(req, res) {
        try {
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
            throw new Error('Failed to transcribe audio')
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
        let selectQuery = `select * from users where user_id = ${userId};`
        let result = await db.selectQuery(selectQuery)

        if (!result || result.length <= 0) {
            throw new Error('User could not be found.')
        } else {
            const user = result[0]
            const updateQuery = `update users set api_usage = ${Math.max(0, user.api_usage - 1)} where id = ${userId};`
            await db.updateQuery(updateQuery)
        }
    }
}

module.exports = aiUtils
