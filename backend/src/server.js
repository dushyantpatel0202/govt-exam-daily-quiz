const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const QuizDay = require('./models/quizDay');

const app = express();
const PORT = Number(process.env.PORT || 5000);
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    throw new Error('MONGODB_URI is missing. Add it in backend/.env');
}

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '5mb' }));

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

function normalizeCategory(value) {
    return String(value || '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ');
}

function addDefaultQuestionCategories(payload) {
    if (!payload || !Array.isArray(payload.questions)) return payload;

    const updatedQuestions = payload.questions.map((question) => {
        const existingCategory = normalizeCategory(question.category);
        if (existingCategory) {
            return question;
        }

        return {
            ...question,
            category: 'general affairs'
        };
    });

    return {
        ...payload,
        questions: updatedQuestions
    };
}

function extractQuestionCategories(payload) {
    if (!payload || !Array.isArray(payload.questions)) return [];

    const values = payload.questions
        .map((question) => normalizeCategory(question.category))
        .filter(Boolean);

    return [...new Set(values)];
}

app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'quiz-backend' });
});

app.get('/api/quiz/:date', async (req, res) => {
    try {
        const { date } = req.params;
        if (!dateRegex.test(date)) {
            return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD.' });
        }

        const record = await QuizDay.findOne({ date }).lean();
        if (!record) {
            return res.status(404).json({ error: 'Quiz not found for this date.' });
        }

        return res.json(record.payload);
    } catch (error) {
        return res.status(500).json({ error: 'Failed to fetch quiz.' });
    }
});

app.post('/api/quiz', async (req, res) => {
    try {
        const { date } = req.body || {};
        if (!date || !dateRegex.test(date)) {
            return res.status(400).json({ error: 'Invalid or missing date. Use YYYY-MM-DD.' });
        }

        const payload = req.body && req.body.payload ? req.body.payload : req.body;
        if (!payload || !Array.isArray(payload.questions)) {
            return res.status(400).json({ error: 'Payload must include questions array.' });
        }

        const normalizedPayload = addDefaultQuestionCategories(payload);
        const questionCategories = extractQuestionCategories(normalizedPayload);

        await QuizDay.findOneAndUpdate(
            { date },
            {
                date,
                payload: normalizedPayload,
                questionCategories,
                sourceFile: req.body?.sourceFile || null
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        return res.status(201).json({ ok: true, message: `Quiz uploaded for ${date}` });
    } catch (error) {
        return res.status(500).json({ error: 'Failed to upload quiz.' });
    }
});

app.put('/api/quiz/:date', async (req, res) => {
    try {
        const { date } = req.params;
        if (!dateRegex.test(date)) {
            return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD.' });
        }

        const payload = req.body && req.body.payload ? req.body.payload : req.body;
        if (!payload || !Array.isArray(payload.questions)) {
            return res.status(400).json({ error: 'Payload must include questions array.' });
        }

        const normalizedPayload = addDefaultQuestionCategories(payload);
        const questionCategories = extractQuestionCategories(normalizedPayload);

        await QuizDay.findOneAndUpdate(
            { date },
            {
                date,
                payload: normalizedPayload,
                questionCategories,
                sourceFile: req.body?.sourceFile || null
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        return res.json({ ok: true, message: `Quiz saved for ${date}` });
    } catch (error) {
        return res.status(500).json({ error: 'Failed to save quiz.' });
    }
});

app.get('/api/quiz', async (_req, res) => {
    try {
        const requestedCategory = normalizeCategory(_req.query.category);
        const filter = requestedCategory ? { questionCategories: requestedCategory } : {};
        const records = await QuizDay.find(filter, { _id: 0, date: 1, questionCategories: 1 }).sort({ date: 1 }).lean();

        if (_req.query.details === '1') {
            return res.json(records);
        }

        return res.json(records.map((record) => record.date));
    } catch (error) {
        return res.status(500).json({ error: 'Failed to list quiz dates.' });
    }
});

app.get('/api/quiz/categories', async (_req, res) => {
    try {
        const categories = await QuizDay.distinct('questionCategories');
        return res.json(categories.filter(Boolean).sort());
    } catch (error) {
        return res.status(500).json({ error: 'Failed to list categories.' });
    }
});

async function startServer() {
    await mongoose.connect(MONGODB_URI);
    app.listen(PORT, () => {
        console.log(`Quiz backend running on http://localhost:${PORT}`);
    });
}

startServer().catch((error) => {
    console.error('Failed to start backend:', error.message);
    process.exit(1);
});
