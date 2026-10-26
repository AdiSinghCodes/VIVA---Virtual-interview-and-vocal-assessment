import os
import tempfile
from typing import Any, Dict, List

from flask import Flask, request, jsonify
from dotenv import load_dotenv
from groq import Groq

load_dotenv()
app = Flask(__name__)

# Agents remain lazy-loaded so the Flask server can start quickly.
eval_verbal = None
eval_code = None


def load_verbal_agent():
    global eval_verbal
    if eval_verbal is None:
        print("Loading normal-question RAG agent...", flush=True)
        from normal_questions_agent import evaluate
        eval_verbal = evaluate
        print("Normal-question evaluation agent loaded.", flush=True)
    return eval_verbal


def load_coding_agent():
    global eval_code
    if eval_code is None:
        print("Loading coding/SQL agent...", flush=True)
        from coding_sql_agent import evaluate
        eval_code = evaluate
        print("Coding/SQL evaluation agent loaded.", flush=True)
    return eval_code


def _is_technology_domain(setup: Dict[str, Any]) -> bool:
    """Detect technology/software interviews without relying on one exact label."""
    text = " ".join(str(setup.get(k) or "") for k in ("domain", "subDomain", "role", "objective")).lower()
    return any(term in text for term in (
        "technology & software", "technology and software", "software engineering",
        "software developer", "software engineer", "technical interview", "technology",
        "computer science", "backend developer", "frontend developer", "full stack",
        "full-stack", "programming", "developer", "software", "data engineer",
    ))


def _history_list(value: Any) -> List[Dict[str, Any]]:
    return [x for x in value if isinstance(x, dict)] if isinstance(value, list) else []


def _is_follow_up(item: Dict[str, Any]) -> bool:
    if item.get("isFollowUp") is True or item.get("followUp") is True:
        return True
    kind = str(item.get("questionType") or item.get("type") or "").lower()
    return "followup" in kind or "follow-up" in kind or "cross-question" in kind or "cross_question" in kind


def _count_section(history: List[Dict[str, Any]], section: str) -> int:
    return sum(1 for item in history if str(item.get("section") or "verbal").lower() == section)


def _count_main_verbal(history: List[Dict[str, Any]]) -> int:
    return sum(
        1 for item in history
        if str(item.get("section") or "verbal").lower() == "verbal" and not _is_follow_up(item)
    )


def _get_question_queue(p: Dict[str, Any]) -> List[Dict[str, Any]]:
    queue = p.get("preparedQuestions") or p.get("prepared_questions") or []
    return [q for q in queue if isinstance(q, dict) and str(q.get("text") or "").strip()] if isinstance(queue, list) else []


def _fallback_technical_question(setup: Dict[str, Any], section: str, index: int) -> Dict[str, Any]:
    """Return a safe, self-contained coding/SQL question if Groq is unavailable."""
    language = str(setup.get("codingLanguage") or setup.get("language") or "Java")
    if section == "sql":
        return {
            "section": "sql",
            "questionType": "sql",
            "category": "SQL fundamentals",
            "text": "Given the Employees(employee_id, name, department_id, salary) table, write a SQL query to return each department_id and its average salary, showing only departments whose average salary is greater than 60000. Sort by average salary descending.",
            "problem": "Use the Employees table with columns employee_id (integer), name (text), department_id (integer), and salary (numeric).",
            "constraints": ["Use GROUP BY for departments", "Filter aggregate results correctly"],
            "examples": [],
            "language": "SQL",
            "generationFallback": True,
        }
    return {
        "section": "coding",
        "questionType": "coding",
        "category": "Arrays and Hashing",
        "text": "Given an integer array and a target integer, return the indices of two distinct elements whose sum equals the target. Assume exactly one solution exists and do not use the same element twice.",
        "problem": f"Implement the solution in {language}. Explain the time and space complexity.",
        "constraints": ["2 <= array length <= 100000", "Each input has exactly one valid answer"],
        "examples": [{"input": "nums = [2, 7, 11, 15], target = 9", "output": "[0, 1]"}],
        "language": language,
        "generationFallback": True,
    }


# ---------------------------------------------------------------------------
# Transcription
# ---------------------------------------------------------------------------
def transcribe_file(file_storage):
    key = os.getenv("GROQ_API_KEY", "").strip()
    if not key:
        raise RuntimeError("GROQ_API_KEY is not configured")

    suffix = os.path.splitext(file_storage.filename or "answer.webm")[1] or ".webm"
    fd, path = tempfile.mkstemp(suffix=suffix)
    os.close(fd)
    try:
        file_storage.save(path)
        with open(path, "rb") as f:
            result = Groq(api_key=key).audio.transcriptions.create(
                file=(os.path.basename(path), f),
                model=os.getenv("TRANSCRIPTION_MODEL", "whisper-large-v3-turbo"),
                language="en",
                response_format="json",
            )
        return result.text
    finally:
        try:
            os.remove(path)
        except OSError:
            pass


@app.get("/health")
def health():
    return jsonify({"ok": True, "service": "interview-agent"})


@app.post("/transcribe")
def transcribe():
    try:
        if "audio" not in request.files:
            return jsonify({"message": "audio is required"}), 400
        return jsonify({"text": transcribe_file(request.files["audio"])})
    except Exception as exc:
        print("Transcription error:", exc, flush=True)
        return jsonify({"message": str(exc)}), 500


# ---------------------------------------------------------------------------
# Separate answer evaluation agent
# ---------------------------------------------------------------------------
@app.post("/evaluate")
def evaluate():
    try:
        p = request.get_json(force=True) or {}
        section = str(p.get("section") or "verbal").lower()
        if section in ("coding", "sql"):
            result = load_coding_agent()(p)
        else:
            result = load_verbal_agent()(p)
        return jsonify({
            "evaluation": result,
            "score": result.get("score", 0),
            "followUp": result.get("followUp", False),
            "endInterview": result.get("endInterview", False),
            "summary": result.get("summary", ""),
        })
    except Exception as exc:
        print("Answer evaluation error:", exc, flush=True)
        return jsonify({"message": str(exc)}), 500


# ---------------------------------------------------------------------------
# Preload RAG once, before the first interview question.
# ---------------------------------------------------------------------------
@app.post("/preload-context")
def preload_context():
    try:
        p = request.get_json(force=True) or {}
        from normal_questions_agent import preload_interview_context
        result = preload_interview_context(p.get("setup") or {})
        return jsonify(result)
    except Exception as exc:
        print("RAG preload warning:", exc, flush=True)
        # Keep interview start available even if web/RAG preload fails.
        return jsonify({"ok": False, "message": str(exc)}), 200


# ---------------------------------------------------------------------------
# Prepare a queue of later verbal questions.
# Call after the first four MAIN verbal answers. For technical interviews this
# can run in the background while the candidate completes DSA and SQL.
# ---------------------------------------------------------------------------
@app.post("/prepare-followup-questions")
def prepare_followup_questions():
    try:
        p = request.get_json(force=True) or {}
        setup = p.get("setup") or {}
        history = _history_list(p.get("history"))
        intro_summary = p.get("introSummary") or p.get("intro_summary") or []
        count = int(p.get("count", 8))
        from normal_questions_agent import generate_followup_questions
        questions = generate_followup_questions(
            setup=setup,
            intro_summary=intro_summary,
            history=history,
            count=count,
        )
        return jsonify({
            "ok": True,
            "questions": questions,
            "count": len(questions),
            "phase": "adaptive_verbal",
            "isTechnology": _is_technology_domain(setup),
        })
    except Exception as exc:
        print("Follow-up question preparation error:", exc, flush=True)
        return jsonify({"ok": False, "message": str(exc), "questions": []}), 500


# ---------------------------------------------------------------------------
# Interview state routing.
# The frontend should send the answered history, preparedQuestions, and
# preparedQuestionIndex on every call. Cross-questions must be tagged with
# isFollowUp=true so they do not consume one of the four main intro questions.
# ---------------------------------------------------------------------------
@app.post("/next-question")
def next_question():
    try:
        p = request.get_json(force=True) or {}
        setup = p.get("setup") or {}
        history = _history_list(p.get("history"))
        index = int(p.get("questionIndex", len(history) + 1))
        requested_section = str(p.get("section") or "auto").lower()
        is_technology = _is_technology_domain(setup)
        main_verbal_count = _count_main_verbal(history)
        coding_count = _count_section(history, "coding")
        sql_count = _count_section(history, "sql")
        prepared_questions = _get_question_queue(p)
        prepared_index = max(0, int(p.get("preparedQuestionIndex", p.get("prepared_question_index", 0))))

        # Phase A: exactly four main introductory verbal questions.
        if main_verbal_count < 4:
            from normal_questions_agent import ask_dynamic
            question = ask_dynamic(setup, history, index, p.get("lastEvaluation"))
            question["section"] = "verbal"
            question["isFollowUp"] = False
            return jsonify({
                "ok": True, "question": question, "section": "verbal",
                "phase": "intro_verbal", "questionIndex": index,
                "mainVerbalCount": main_verbal_count,
                "isTechnology": is_technology,
            })

        # Phase B: technology/software only — two coding and two SQL tasks.
        if is_technology and (coding_count < 2 or sql_count < 2):
            if requested_section in ("coding", "sql") and (
                (requested_section == "coding" and coding_count < 2) or
                (requested_section == "sql" and sql_count < 2)
            ):
                section = requested_section
            elif coding_count < 2 and (coding_count <= sql_count or sql_count >= 2):
                section = "coding"
            else:
                section = "sql"

            setup_for_task = dict(setup)
            setup_for_task.update({
                "requiresCoding": True, "requiresSql": True,
                "requires_coding": True, "requires_sql": True,
            })
            from coding_sql_agent import ask
            try:
                question = ask(setup_for_task, history, index, section)
            except Exception as generation_error:
                # A provider timeout/rate limit/invalid JSON must not terminate
                # the interview. Return a valid fallback question in the same
                # response shape expected by the frontend.
                print(
                    f"Technical question generation failed; using fallback: {generation_error}",
                    flush=True,
                )
                question = _fallback_technical_question(setup_for_task, section, index)
            question["section"] = section
            question["isFollowUp"] = False
            return jsonify({
                "ok": True, "question": question, "section": section,
                "phase": "coding_sql", "questionIndex": index,
                "codingCount": coding_count, "sqlCount": sql_count,
                "isTechnology": True,
                "prepareAdaptiveQuestionsNow": main_verbal_count >= 4,
            })

        # Phase C: adaptive verbal queue. No per-question generation request is
        # needed once the frontend has the prepared queue.
        if prepared_index < len(prepared_questions):
            question = dict(prepared_questions[prepared_index])
            question["section"] = "verbal"
            question["isFollowUp"] = False
            return jsonify({
                "ok": True, "question": question, "section": "verbal",
                "phase": "adaptive_verbal", "questionIndex": index,
                "preparedQuestionIndex": prepared_index,
                "nextPreparedQuestionIndex": prepared_index + 1,
                "preparedQuestionCount": len(prepared_questions),
                "isTechnology": is_technology,
            })

        # Tell the frontend to prepare the queue. For non-technical interviews,
        # it should show a one-minute break while the request runs. If loading
        # takes longer than 60 seconds, keep the break/loading screen visible.
        return jsonify({
            "ok": True,
            "preparationRequired": True,
            "phase": "preparing_adaptive_verbal",
            "breakSeconds": 60 if not is_technology else 0,
            "isTechnology": is_technology,
            "mainVerbalCount": main_verbal_count,
            "codingCount": coding_count,
            "sqlCount": sql_count,
            "message": "Call /prepare-followup-questions with the evaluation summaries, then pass its questions as preparedQuestions.",
        })
    except Exception as exc:
        print("Dynamic next-question error:", exc, flush=True)
        return jsonify({"ok": False, "message": str(exc)}), 500


@app.post("/analyze-resume")
def analyze_resume():
    try:
        p = request.get_json(force=True) or {}
        from ats_resume_agent import analyze_resume_text
        result = analyze_resume_text(
            str(p.get("text") or ""),
            str(p.get("targetRole") or ""),
            str(p.get("skills") or ""),
            str(p.get("jobDescription") or ""),
        )
        return jsonify({"ok": True, "ats": result})
    except Exception as exc:
        print("Resume analysis error:", exc, flush=True)
        return jsonify({"ok": False, "message": str(exc)}), 500


@app.post("/generate-bank")
def generate_bank():
    try:
        p = request.get_json(force=True) or {}
        from bank_generator import generate_question_bank
        questions = generate_question_bank(p.get("setup") or {}, p.get("plan") or {})
        return jsonify({"ok": True, "questions": questions, "count": len(questions)})
    except Exception as exc:
        print("Generate question bank error:", exc, flush=True)
        return jsonify({"ok": False, "message": str(exc), "questions": []}), 500


if __name__ == "__main__":
    port = int(os.getenv("INTERVIEW_AGENT_PORT", "5100"))
    print("VIVA AI INTERVIEW AGENT", flush=True)
    print(f"Starting Flask on port {port}...", flush=True)
    print("Question generation uses GROQ_API_KEY; evaluation uses GROQ_EVALUATION_API_KEY when configured.", flush=True)
    app.run(host="127.0.0.1", port=port, debug=False, threaded=True)
