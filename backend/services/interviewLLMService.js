const axios = require('axios');

const AGENT_URL = process.env.INTERVIEW_AGENT_URL || 'http://127.0.0.1:5100';

async function agent(path, payload, timeout = 90000) {
  const response = await axios.post(`${AGENT_URL}${path}`, payload, { timeout });
  return response.data;
}

exports.evaluateAnswer = (payload) => agent('/evaluate', payload);
exports.transcribe = async (buffer, filename, mimeType) => {
  const FormData = require('form-data');
  const form = new FormData();
  form.append('audio', buffer, { filename, contentType: mimeType || 'audio/webm' });
  const response = await axios.post(`${AGENT_URL}/transcribe`, form, {
    headers: form.getHeaders(),
    timeout: 120000,
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
  });
  return response.data;
};

exports.generateQuestionBank = (payload) => agent('/generate-bank', payload);
exports.generateNextQuestion = (payload) => agent('/next-question', payload, 45000);
exports.prepareFollowupQuestions = (payload) => agent('/prepare-followup-questions', payload, 120000);
exports.preloadInterviewContext = (payload) => agent('/preload-context', payload, 120000);
exports.analyzeResume = (payload) => agent('/analyze-resume', payload, 45000);
