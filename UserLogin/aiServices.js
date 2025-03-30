require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
require('dotenv').config();

const Database = require('./database');
const db = new Database();

const API_URL = process.env.AI_API_URL;
const API_KEY = process.env.AI_API_KEY;

const messages = JSON.parse(fs.readFileSync('./lang/en/messages.json'));

// ChatGPT used for overall design of this class
class aiUtils{
    // ChatGPT used for design of this function and some syntax
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
            throw new Error(messages.transcriptionFailed + error)
        }
    }

    static async gradeAnswer(question, answer) {
        try {
            const headers = {
                'api-key': API_KEY,
                'Content-Type': 'application/json'
            }

            console.log('grading answer: ' + answer + ' to question: ' + question)

            const answerText = `The following answer is relevant, and correctly and completely answers the question.\nQuestion: ${question}\nAnswer: ${answer}`
            const body = {
                text: answerText
            }

            console.log('grading prompt: ' + answerText)

            const response = await axios.post(API_URL + 'gradeanswer', body, {headers: headers});
    
            return response.data; // {label, score}
        } catch (error) {
            console.error('Error:', error);
            throw new Error(messages.gradingFailed)
        }
    }

    static async decrementUsage(userId) {
        if (typeof userId !== 'number' && typeof userId !== 'string') {
            throw new Error(messages.apiInvalidUser)
        }

        let selectQuery = `select * from users where id = ${userId};`
        let result = await db.selectQuery(selectQuery)

        if (!result || result.length <= 0) {
            throw new Error(messages.userDataNotFound)
        } else {
            const user = result[0]
            const updateQuery = `update users set api_usage = ${Math.max(0, user.api_usage - 1)} where id = ${userId};`
            await db.updateQuery(updateQuery)
        }
    }
}

module.exports = aiUtils
