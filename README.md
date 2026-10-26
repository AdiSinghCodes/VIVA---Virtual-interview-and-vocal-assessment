# VIVA AI Interview

## Run
1. Start MongoDB.
2. `cd backend && npm install`
3. Copy `.env.example` to `.env` and adjust values.
4. Install Python dependencies: `pip install -r requirements.txt`.
5. From `backend`, run `npm start`. This starts the Node API on port 4000 and the Python proctor on port 5000.
6. In the project root, run `npm install` then `npm run dev`.

The frontend talks to `http://localhost:4000/api`. The interview room talks to the Python proctor at `http://localhost:5000`.

## Authentication/profile flow
- Sign up creates a MongoDB user and signs them in.
- Signup redirects to Profile.
- A profile is not considered complete until all required profile fields AND a parsed resume are present.
- Dashboard/interview tools are guarded until completion.
- Resume upload parses PDF/DOCX/TXT, stores the text and file metadata in MongoDB, and autofills editable profile fields.
- Interview Setup reads the stored profile/resume every time it opens.
- Resume Analysis calls the backend and displays the live ATS score.

## Groq API key pools (5 keys)

Configure these in `backend/.env` using `backend/.env.example` as a template:
- `GROQ_EVALUATION_API_KEYS`: two keys for normal, coding, and SQL answer evaluation.
- `GROQ_QUESTION_API_KEYS`: two keys for all interview question generation, including coding and SQL.
- `GROQ_ATS_API_KEY`: the fifth key, reserved exclusively for ATS resume scoring through `/analyze-resume`.
- `GROQ_API_KEY`: still used by the existing transcription endpoint; set it to your primary question key unless you have a separate transcription key.

The interview's one-time compact resume summary uses the question-key pool; it does not consume the ATS-scoring key. ATS scoring tries the configured model pool with the dedicated ATS key and falls back to transparent semantic/structure scoring if AI scoring is unavailable. Do not commit real API keys.
