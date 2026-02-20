const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const QuizDay = require('../src/models/quizDay');

const MONGODB_URI = process.env.MONGODB_URI;
const dataDir = path.resolve(__dirname, '../../data');
const fileRegex = /^(\d{2})-(\d{2})-(\d{2})\.json$/;

if (!MONGODB_URI) {
    throw new Error('MONGODB_URI is missing. Add it in backend/.env');
}

function filenameToISODate(fileName) {
    const match = fileName.match(fileRegex);
    if (!match) return null;

    const [_, yy, mm, dd] = match;
    return `20${yy}-${mm}-${dd}`;
}

function normalizeCategory(value) {
    return String(value || '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ');
}

function addDefaultQuestionCategories(payload) {
    if (!payload || !Array.isArray(payload.questions)) return payload;

    return {
        ...payload,
        questions: payload.questions.map((question) => {
            const category = normalizeCategory(question.category);
            if (category) return question;
            return { ...question, category: 'general affairs' };
        })
    };
}

function extractQuestionCategories(payload) {
    if (!payload || !Array.isArray(payload.questions)) return [];
    const values = payload.questions
        .map((question) => normalizeCategory(question.category))
        .filter(Boolean);
    return [...new Set(values)];
}

async function run() {
    await mongoose.connect(MONGODB_URI);

    const files = fs.readdirSync(dataDir).filter((file) => fileRegex.test(file));
    let importedCount = 0;

    for (const file of files) {
        const date = filenameToISODate(file);
        if (!date) continue;

        const filePath = path.join(dataDir, file);
        const raw = fs.readFileSync(filePath, 'utf-8');
        const payloadRaw = JSON.parse(raw);
        const payload = addDefaultQuestionCategories(payloadRaw);
        const questionCategories = extractQuestionCategories(payload);

        await QuizDay.findOneAndUpdate(
            { date },
            {
                date,
                payload,
                questionCategories,
                sourceFile: file
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        importedCount++;
        console.log(`Imported ${file} -> ${date}`);
    }

    console.log(`Done. Imported ${importedCount} files.`);
    await mongoose.disconnect();
}

run().catch(async (error) => {
    console.error('Import failed:', error.message);
    await mongoose.disconnect();
    process.exit(1);
});
