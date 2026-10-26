// ATS scoring is an explainable compatibility estimate, not a score used by
// every commercial ATS. Semantic matching is provided by the pretrained
// all-MiniLM-L6-v2 model in the Python interview service; this is the fallback.
function calculateATS(text = '', profile = {}) {
  const raw = String(text || '');
  const content = `${raw} ${profile.targetRole || ''} ${profile.skills || ''}`.toLowerCase();
  const checks = {
    contact: /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(raw) && /\d{7,}/.test(raw),
    skills: /(skills|technical skills|technologies|tech stack)/i.test(raw),
    experience: /(experience|employment|work history|internship)/i.test(raw),
    education: /(education|university|college|b\.?tech|bachelor|master)/i.test(raw),
    projects: /(projects|project experience)/i.test(raw),
    actionWords: /(developed|built|designed|implemented|led|created|optimized|managed|automated|integrated)/i.test(raw),
    measurableImpact: /(\d+%|₹\s?\d+|\$\s?\d+|\d+\+?\s*(users|clients|projects|requests|employees|months|years|records))/i.test(raw),
    readableLength: raw.trim().length >= 500 && raw.trim().length <= 16000,
  };
  const weights = { contact: 10, skills: 15, experience: 15, education: 10, projects: 10, actionWords: 10, measurableImpact: 15, readableLength: 5 };
  const structureScore = Object.entries(checks).reduce((sum, [key, ok]) => sum + (ok ? weights[key] : 0), 0);
  return {
    score: Math.max(0, Math.min(100, Math.round(structureScore))),
    structureScore,
    semanticScore: null,
    model: 'rule-based-fallback',
    checks,
    strengths: Object.keys(checks).filter(k => checks[k]),
    improvements: Object.keys(checks).filter(k => !checks[k]),
    note: 'Fallback estimate: semantic model scoring was unavailable. ATS scores vary by employer and job description.',
  };
}
module.exports = { calculateATS };
