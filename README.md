📚 Daily Govt Exam Quiz & Ed-Tech Platform
A modular, zero-cost educational platform designed for Indian students preparing for competitive exams (SSC, Banking, Railway, NABARD). This application provides daily current affairs, study materials, and interactive quizzes to enhance learning and retention.

🚀 Live Demo
You can access the platform here: https://[your-username].github.io/my-quiz-app/

✨ Key Features
📅 Date-Based Quizzes: Automatically loads daily current affairs and static GK based on the selected date from a JSON database.

🔥 Daily Streak Tracking: Uses browser localStorage to track consecutive days of study, encouraging daily practice.

🏆 Personal Best: Saves and displays your high score locally to help you monitor improvement over time.

📖 Integrated Study Material: Includes a "Content" mode to review topics like the Indian Constitution, Mughal History, and Global Indices before taking the quiz.

📊 Performance Analytics: Provides a detailed breakdown of strengths and growth areas using Chart.js.

🇮🇳 Bilingual Support: Content and questions are available in both English and Hindi.

🛠️ Technology Stack
Frontend: HTML5, Tailwind CSS, JavaScript (ES6+).

Data Storage: Modular JSON files for easy daily updates.

Backend (optional): Node.js, Express, MongoDB (Mongoose) for date-wise quiz storage.

Analytics: Chart.js for visual performance tracking.

Deployment: GitHub Pages (Static Hosting).

📁 Project Structure
Plaintext
/my-quiz-app
  ├── index.html        # Main landing page and UI
  ├── script.js         # Core logic, timer, and localStorage
  └── /data             # Daily quiz database
       ├── 26-02-11.json
       ├── 26-02-12.json
       └── ...

/backend
  ├── src/server.js                 # Express API server
  ├── src/models/quizDay.js         # MongoDB date-wise quiz model
  ├── scripts/import-local-json.js  # Import existing /data json files into MongoDB
  ├── .env.example                  # Backend env template
  └── package.json

🔌 MongoDB Backend Setup
1. Open terminal in `backend` folder.
2. Install packages:
  - `npm install`
3. Create `.env` from `.env.example` and set:
  - `MONGODB_URI`
  - `PORT` (default `5000`)
4. Start backend:
  - `npm run dev`

📥 Import Existing Daily JSON into MongoDB
From `backend` folder run:
- `npm run import:data`

This imports `/data/*.json` into MongoDB as one record per day.

📡 API Endpoints
- `GET /api/health` → health check
- `GET /api/quiz/:date` → get quiz payload by `YYYY-MM-DD`
- `POST /api/quiz` → upload/create/update quiz for a date from request body
- `PUT /api/quiz/:date` → create/update quiz payload for a date
- `GET /api/quiz` → list available dates
- `GET /api/quiz?category=national affairs` → filter dates by question category
- `GET /api/quiz?details=1` → list dates with indexed categories
- `GET /api/quiz/categories` → list all available categories

Example `POST /api/quiz` body:

```json
{
  "date": "2026-02-21",
  "sourceFile": "manual-upload",
  "payload": {
    "category": "Current Affairs",
    "difficulty": "Medium",
    "questions": [
      {
        "q": "Sample question?",
        "category": "national affairs",
        "options": ["A", "B", "C", "D"],
        "correct": 0,
        "rationale": "Sample explanation"
      }
    ]
  }
}
```

Frontend behavior:
- On localhost, app first tries backend (`http://localhost:5000/api/quiz/:date`).
- If not found/unavailable, it falls back to local `/data/*.json`.

🧰 Admin Upload Page
- Open [admin-upload.html](admin-upload.html) in browser.
- Set API Base URL (default: `http://localhost:5000`).
- Select date, paste payload JSON, click `Upload Quiz`.

This uses `POST /api/quiz` to create/update one day quiz in MongoDB.

🧾 Recommended Quiz JSON Format
- Top-level: `date`, `category`, `difficulty`, `content`, `questions`
- Each question should include:
  - `q`
  - `category` (recommended values: `national affairs`, `international affairs`, `economic affairs`)
  - `options` (array)
  - `correct` (0-based index)
  - `rationale`

Using `question.category` improves:
- Strengths/Growth Areas analysis in frontend
- MongoDB search/filter by category
📈 Roadmap
[x] Implement local data persistence (Streaks/High Scores).

[x] Deploy to GitHub Pages for zero-cost hosting.

[ ] Add "Exam Mode" with negative marking.

[ ] Integrate a "Share on WhatsApp" feature for peer-to-peer competition.

[ ] Transition to MongoDB Atlas for advanced student analytics.

📝 License
This project is for educational and startup development purposes.

Why this README is good for your project:
Professionalism: It shows potential collaborators or mentors that you have a clear vision for your agriculture/student-focused startup.

Documentation: It clearly lists your use of localStorage for the streak feature, which is a great technical detail to highlight.

Ease of Use: It explains the folder structure, ensuring you (or anyone else) know exactly where to put new quiz files like 26-02-16.json.
