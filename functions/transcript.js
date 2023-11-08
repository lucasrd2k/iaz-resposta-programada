const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
require('dotenv').config();

const API_KEY_IA = process.env.API_KEY_IA;

async function transcribeAudio(filePath) {
    console.log(filePath);
    const form = new FormData();
    form.append('file', fs.createReadStream(filePath));
    form.append('model', 'whisper-1');
    form.append('response_format', 'text');

    try {
        const response = await axios.post('https://api.openai.com/v1/audio/transcriptions', form, {
            headers: {
                ...form.getHeaders(),
                'Authorization': `Bearer ${API_KEY_IA}`
            }
        });
        console.log(response);
        return response.data;
    } catch (error) {
        console.log(response);
        console.error('Erro ao transcrever o áudio:', error);
        throw error;
    }
}

//transcribeAudio('./audios/false_556284208957@c.us_3EB0140E92C7AC993BF548.ogg');

module.exports = transcribeAudio;
