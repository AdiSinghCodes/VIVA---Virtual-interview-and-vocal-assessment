# VIVA adaptive interview flow integration

## What changed

- The opening phase contains exactly four **main verbal questions**. Evaluator-generated cross-questions are recorded separately and do not consume one of those four slots.
- For technology/software interviews, the interview plan includes exactly two coding/DSA tasks and two SQL tasks after the opening verbal phase.
- Adaptive verbal questions are prepared in one background batch using the first four main verbal answers, their evaluation summaries, recent interview history, and the preloaded RAG context.
- For non-technical interviews, the interview room shows a one-minute break after the opening phase (including any follow-up to question four). It waits for both the countdown and question preparation to finish.
- For technical interviews, adaptive question preparation starts in the background while the candidate completes the coding and SQL tasks.
- The Python question-generation agent uses `GROQ_API_KEY`. The evaluation agent uses `GROQ_EVALUATION_API_KEY` when configured, with backward-compatible fallback to `GROQ_API_KEY`.
- Existing interview records, reports, speech transcription, coding/SQL workspaces, camera, and proctoring paths are retained.

## Main implementation files

- `src/screens/InterviewRoom.tsx` — preparation overlay/countdown, cross-question metadata, adaptive question polling.
- `src/api/api.ts` — preparation-status and next-question API methods.
- `backend/routes/liveInterviewRoutes.js` — authenticated endpoints for preparation status and retrieving the next question.
- `backend/controllers/liveInterviewController.js` — phase sequencing, adaptive batch preparation, exact coding/SQL counts, and persistence.
- `backend/models/Interview.js` — persists prepared queue state and cross-question metadata.
- `backend/services/interviewLLMService.js` — connects Node.js to the Python batch-preparation endpoint.
- `backend/python/interview.py` — `/prepare-followup-questions` and `/next-question`.
- `backend/python/normal_questions_agent.py` — preloaded context, adaptive verbal question batch, and verbal evaluation.
- `backend/python/coding_sql_agent.py` — coding/SQL generation and evaluation.

## Setup

1. Copy `backend/.env.example` to `backend/.env`.
2. Set `MONGO_URI`, `JWT_SECRET`, `GROQ_API_KEY`, and (recommended) a separate `GROQ_EVALUATION_API_KEY`.
3. Install frontend dependencies from the project root:
   `npm install`
4. Install backend dependencies:
   `cd backend && npm install`
5. Install Python dependencies in the Python environment selected by `PYTHON_BIN`:
   `pip install -r python/requirements_interview.txt`
   `pip install -r requirements.txt`
6. Start the Node backend from `backend` with `npm run dev`.
7. Start the Vite frontend from the project root with `npm run dev`.

The Node backend loads `backend/.env` and passes its environment to the Python interview agent process. Keep all keys server-side.

## API flow

- `POST /api/live-interviews/start` creates the interview and returns the opening question while the RAG context is warmed in the background.
- `POST /api/live-interviews/:id/answer` evaluates and stores the answer, then returns either `nextQuestion`, `done`, or `preparationRequired`.
- `GET /api/live-interviews/:id/preparation-status` returns the background adaptive-question queue state.
- `POST /api/live-interviews/:id/next-question` returns the next queued verbal question once the queue is ready.

All new endpoints use the same authentication middleware as the existing live-interview endpoints.

## Verification

The edited Node.js files passed `node --check`. All Python files in `backend/python` passed `py_compile`. The TypeScript/TSX files passed TypeScript parser syntax checks. A full Vite build could not be completed in this environment because dependency installation did not finish; run `npm install` and `npm run build` locally to confirm the final environment-specific build.
