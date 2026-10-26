# Interview agent integration update

This package includes an integrated update to the Node interview controller and Python interview agent.

## Intended interview behavior
- The first question is a short introduction prompt.
- Questions 2–4 are generated from the candidate's real earlier answers and evaluation context.
- When **Use Resume** is enabled, the complete resume is sent to the Python agent only during the one-time preload. The agent creates a compact role-relevant summary and caches it for the interview.
- Subsequent evaluation and question-generation calls send the interview ID and compact summary, not the full resume/profile. The full resume is not echoed back in the interview-start response.
- Evaluation handles provider failures and malformed JSON with a safe fallback so a model-format error does not itself crash the evaluation endpoint.
- Existing frontend API routes and interview-room response shapes are retained.

## Setup
1. Extract the ZIP.
2. Copy `backend/.env.example` to `backend/.env` (if the example file exists) and set your own `GROQ_API_KEY`, MongoDB URI, and JWT secret. Do not commit `.env` or paste credentials into logs.
3. Install the frontend and backend dependencies using their respective package manifests.
4. Start the backend and Python interview agent using the repository's existing scripts/instructions.
5. Start a **new interview** after restarting both services so the new per-interview context cache is initialized.

## Validation performed
- Node syntax checks passed for backend JavaScript files.
- Python compilation checks passed for the Python agent files.
- A live Groq/MongoDB/browser end-to-end test was not possible in this environment; configure credentials and run a fresh interview to validate the external services.
