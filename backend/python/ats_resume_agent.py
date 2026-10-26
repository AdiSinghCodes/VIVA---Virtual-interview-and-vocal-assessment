"""Industry- and job-description-aware resume screening estimate.

The output is an advisory estimate, not a claim about any employer's proprietary ATS.
"""
import json
import os
import re
from typing import Dict

MODEL_NAME = os.getenv("RAG_EMBED_MODEL", "all-MiniLM-L6-v2")
LLM_MODEL = os.getenv("INTERVIEW_LLM_MODEL", "openai/gpt-oss-120b").strip()


def _model():
    from normal_questions_agent import _get_embed_model
    return _get_embed_model()


def _cosine(a, b):
    import numpy as np
    a = np.asarray(a, dtype=float)
    b = np.asarray(b, dtype=float)
    denom = (np.linalg.norm(a) * np.linalg.norm(b)) or 1.0
    return float(np.dot(a, b) / denom)


def _ats_api_key() -> str:
    'Use the dedicated ATS key; never consume the interview question/evaluation pools.'
    for name in ("GROQ_ATS_API_KEY", "GROQ_ATS_API_KEYS", "GROQ_RESUME_API_KEY"):
        raw = os.getenv(name, "").strip()
        if raw:
            # The ATS role is designed for one dedicated key. If a comma-separated
            # value is provided, try the first key; this avoids mixing pools.
            return re.split(r"[,;\n]", raw)[0].strip().strip("\"'")
    return ""


def _ats_model_pool() -> list:
    raw = os.getenv("INTERVIEW_LLM_MODELS", "")
    candidates = [item.strip() for item in re.split(r"[,;\n]", raw) if item.strip()]
    candidates.extend([
        os.getenv("INTERVIEW_LLM_MODEL", "openai/gpt-oss-120b").strip(),
        os.getenv("INTERVIEW_LLM_FALLBACK_MODEL", "openai/gpt-oss-20b").strip(),
    ])
    result = []
    for model in candidates:
        if model and model not in result:
            result.append(model)
    return result


def _llm_screening_review(resume: str, role: str, skills: str, jd: str, semantic: float, checks: Dict) -> Dict:
    key = _ats_api_key()
    if not key:
        raise RuntimeError("GROQ_ATS_API_KEY is not configured")
    from groq import Groq
    prompt = f'''You are an expert resume screening reviewer. Estimate how well this resume may pass common industry ATS / AI-assisted recruiter screening for the target role. You do not have access to any employer's proprietary ATS or actual applicant pool, so do NOT claim to predict a guaranteed shortlist.

TARGET ROLE: {role}
CANDIDATE SKILLS: {skills or 'Not separately provided'}
JOB DESCRIPTION (if provided): {jd or 'Not provided; infer a typical role profile and state this limitation'}
PRETRAINED SEMANTIC MATCH: {semantic:.1f}/100
STRUCTURE CHECKS: {json.dumps(checks, ensure_ascii=False)}
RESUME TEXT:
{resume[:14000]}

Judge industry-standard signals: exact/related role keywords, required skills, evidence of using those skills, project relevance, impact/metrics, experience level, education where relevant, chronology/format parseability, missing mandatory requirements, and whether claims are evidenced. Do not reward keyword stuffing or recommend fabricated experience. Distinguish missing evidence from lack of ability.
Return ONLY valid JSON with this schema:
{{
 "atsScore": 0,
 "shortlistBand": "Low | Moderate | Strong",
 "shortlistChanceRange": "rough range such as 10-25% (heuristic only)",
 "screeningRationale": "concise explanation and uncertainty",
 "strengths": ["..."],
 "gaps": ["..."],
 "keywordsToInclude": ["..."],
 "summaryParagraph": "A tailored professional summary paragraph the candidate can adapt truthfully; do not invent years, metrics, or experience.",
 "bulletRewrites": ["truthful, specific resume bullet rewrite suggestions grounded in existing evidence"],
 "priorityActions": ["..."],
 "jdMatchedKeywords": ["..."],
 "jdMissingKeywords": ["..."]
}}
Scores should be strict and job-specific. If no JD is supplied, score against typical industry expectations for the target role and explicitly lower confidence. Use concise, practical advice.'''
    failures = []
    for model in _ats_model_pool():
        client = Groq(api_key=key)
        for json_mode in (True, False):
            try:
                kwargs = {
                    "model": model,
                    "messages": [{"role": "system", "content": prompt}],
                    "temperature": 0.15,
                    "max_tokens": 1800,
                }
                if json_mode:
                    kwargs["response_format"] = {"type": "json_object"}
                response = client.chat.completions.create(**kwargs)
                raw = (response.choices[0].message.content or "").strip()
                if not raw:
                    failures.append(f"{model}: empty content")
                    continue
                # Some providers wrap JSON in Markdown despite instructions.
                raw = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw, flags=re.IGNORECASE).strip()
                try:
                    parsed = json.loads(raw)
                except json.JSONDecodeError:
                    left, right = raw.find("{"), raw.rfind("}")
                    if left >= 0 and right > left:
                        parsed = json.loads(raw[left:right + 1])
                    else:
                        raise
                if not isinstance(parsed, dict):
                    raise ValueError("ATS model response was not a JSON object")
                return parsed
            except Exception as exc:
                failures.append(f"{model} ({'json' if json_mode else 'plain'}): {type(exc).__name__}: {str(exc)[:180]}")
                # If the failure looks like a hard quota/rate limit, the next model
                # is the best chance; do not retry the same model in plain mode.
                low = str(exc).lower()
                if any(token in low for token in ("rate limit", "rate_limit", "tokens per day", "model_not_found", "not found")):
                    break
    raise RuntimeError("ATS Groq model pool failed: " + " | ".join(failures[-6:]))


def analyze_resume_text(text: str, target_role: str = "", skills: str = "", job_description: str = "") -> Dict:
    raw = re.sub(r"\s+", " ", text or "").strip()
    role = (target_role or "Software Engineer").strip()
    jd = (job_description or "").strip()
    target = jd or (f"Industry-standard requirements for {role}. Required skills: {skills}. Responsibilities include delivering projects, technical problem solving, collaboration, quality, testing and maintainable implementation.")
    checks = {
        "contact": bool(re.search(r"[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}", raw, re.I) and re.search(r"\d{7,}", raw)),
        "skills": bool(re.search(r"skills|technologies|tech stack", raw, re.I)),
        "experience": bool(re.search(r"experience|employment|work history|internship", raw, re.I)),
        "education": bool(re.search(r"education|university|college|b\.?tech|bachelor|master", raw, re.I)),
        "projects": bool(re.search(r"projects|project experience", raw, re.I)),
        "actionWords": bool(re.search(r"developed|built|designed|implemented|led|created|optimized|managed|automated|integrated", raw, re.I)),
        "measurableImpact": bool(re.search(r"\d+%|₹\s?\d+|\$\s?\d+|\d+\+?\s*(users|clients|projects|requests|employees|months|years|records)", raw, re.I)),
        "readableLength": 500 <= len(raw) <= 16000,
    }
    weights = {"contact": 10, "skills": 12, "experience": 12, "education": 8, "projects": 10, "actionWords": 8, "measurableImpact": 10, "readableLength": 5}
    structure = sum(weights[k] for k, ok in checks.items() if ok)
    chunks = [raw[i:i + 900] for i in range(0, min(len(raw), 9000), 700)] or [raw or "No resume text"]
    model = _model()
    target_vec = model.encode([target], normalize_embeddings=True)[0]
    chunk_vecs = model.encode(chunks, normalize_embeddings=True)
    semantic = max(0.0, min(100.0, max(_cosine(target_vec, vec) for vec in chunk_vecs) * 100.0))
    base_score = round(max(0, min(100, structure + semantic * 0.25)))
    strengths = [k for k, v in checks.items() if v]
    improvements = [k for k, v in checks.items() if not v]
    if semantic < 45:
        improvements.append("roleRelevance")

    try:
        review = _llm_screening_review(raw, role, skills, jd, semantic, checks)
        llm_score = max(0, min(100, float(review.get("atsScore", base_score))))
        # AI reviewer is the primary industry-style assessment; semantic/structure
        # scoring acts as a stabilizer rather than being presented as an ATS vendor score.
        score = round(0.75 * llm_score + 0.15 * semantic + 0.10 * base_score)
        return {
            "score": score,
            "structureScore": structure,
            "semanticScore": round(semantic, 1),
            "model": f"{LLM_MODEL} + {MODEL_NAME}",
            "industryReview": True,
            "targetRole": role,
            "jobDescriptionProvided": bool(jd),
            "shortlistBand": review.get("shortlistBand", "Moderate"),
            "shortlistChanceRange": review.get("shortlistChanceRange", "Not reliably quantifiable"),
            "screeningRationale": review.get("screeningRationale", "Heuristic estimate based on the supplied resume and role."),
            "checks": checks,
            "strengths": review.get("strengths") or strengths,
            "improvements": improvements,
            "gaps": review.get("gaps", []),
            "keywordsToInclude": review.get("keywordsToInclude", []),
            "summaryParagraph": review.get("summaryParagraph", ""),
            "bulletRewrites": review.get("bulletRewrites", []),
            "priorityActions": review.get("priorityActions", []),
            "jdMatchedKeywords": review.get("jdMatchedKeywords", []),
            "jdMissingKeywords": review.get("jdMissingKeywords", []),
            "note": "AI-assisted, job-specific screening estimate. The percentage range is heuristic, not a calibrated probability or a guarantee; actual shortlisting depends on each employer's ATS, job criteria, applicant pool and recruiter decisions.",
        }
    except Exception as exc:
        print(f"LLM ATS review unavailable; using semantic fallback: {type(exc).__name__}: {exc}", flush=True)
        return {
            "score": base_score,
            "structureScore": structure,
            "semanticScore": round(semantic, 1),
            "model": MODEL_NAME,
            "industryReview": False,
            "targetRole": role,
            "jobDescriptionProvided": bool(jd),
            "shortlistBand": "Not assessed",
            "shortlistChanceRange": "Not reliably quantifiable without AI review and a specific job description",
            "screeningRationale": "LLM screening review was unavailable; this fallback only estimates semantic relevance and resume structure.",
            "checks": checks,
            "strengths": strengths,
            "improvements": improvements,
            "gaps": [], "keywordsToInclude": [], "summaryParagraph": "", "bulletRewrites": [],
            "priorityActions": improvements,
            "jdMatchedKeywords": [], "jdMissingKeywords": [],
            "note": "Fallback estimate, not a universal ATS score. Configure the dedicated GROQ_ATS_API_KEY and provide a job description for the most targeted review.",
        }
