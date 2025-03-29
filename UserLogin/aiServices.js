require('dotenv').config();
const axios = require('axios');
const fs = require('fs');

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

            const answerText = `The following answer correctly and completely answers the question.\nQuestion: ${req.body.question}\nAnswer: ${req.body.answer}`
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
}

module.exports = aiUtils
