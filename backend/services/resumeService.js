const fs = require('fs');
const path = require('path');
const mammoth = require('mammoth');
const pdfParse = require('pdf-parse');

async function extractResumeText(filePath, originalName) {
  const ext = path.extname(originalName).toLowerCase();
  if (ext === '.txt') return fs.readFileSync(filePath, 'utf8');
  if (ext === '.pdf') return (await pdfParse(fs.readFileSync(filePath))).text || '';
  if (ext === '.docx') return (await mammoth.extractRawText({ path: filePath })).value || '';
  return '';
}

function inferProfile(text, current = {}, resumeMeta = {}) {
  const normalized = text.replace(/\s+/g, ' ').trim();
  const email = normalized.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || '';
  const phone = normalized.match(/(?:\+?\d[\d\s().-]{8,}\d)/)?.[0]?.trim() || '';
  const skills = ['JavaScript','TypeScript','Python','Java','C++','C#','React','Next.js','Node.js','Express','MongoDB','PostgreSQL','MySQL','SQL','AWS','Azure','Docker','Kubernetes','Git','GitHub','HTML','CSS','Tailwind','Flask','Django','FastAPI','TensorFlow','PyTorch','Machine Learning','Artificial Intelligence','NLP','Computer Vision','DevOps','Linux','REST APIs','GraphQL','Redis'];
  const foundSkills = skills.filter(s => new RegExp(`(^|\\W)${s.replace(/[.+]/g, '\\$&')}(?=\\W|$)`, 'i').test(normalized));
  const roles = ['Software Engineer','Frontend Engineer','Backend Engineer','Full Stack Developer','React Developer','Node.js Developer','Python Developer','DevOps Engineer','Cloud Engineer','Data Scientist','ML Engineer','AI Engineer','Product Manager','Business Analyst','UI Designer','UX Designer'];
  const targetRole = roles.find(r => normalized.toLowerCase().includes(r.toLowerCase())) || current.targetRole || '';
  const years = [...normalized.matchAll(/\b(19|20)\d{2}\b/g)].map(m => Number(m[0])).filter(y => y >= 1950 && y <= 2035);
  const nameCandidate = text.split(/\r?\n/).map(x => x.trim()).filter(Boolean)[0] || '';
  const fullName = current.fullName || (nameCandidate && !/@|\d/.test(nameCandidate) && nameCandidate.length < 70 ? nameCandidate : '');
  const degree = current.degree || (normalized.match(/(?:B\.?Tech|B\.?E\.?|B\.?S\.?|M\.?Tech|M\.?E\.?|Master|Bachelor)/i)?.[0] || '');
  return {
    ...current,
    fullName,
    phone: current.phone || phone,
    targetRole,
    skills: foundSkills.length ? foundSkills.join(', ') : current.skills || '',
    degree,
    graduationYear: current.graduationYear || (years.length ? String(Math.min(...years)) : ''),
    summary: current.summary || normalized.slice(0, 600),
    resume: { ...(current.resume || {}), ...resumeMeta, text: normalized },
  };
}
module.exports = { extractResumeText, inferProfile };
