const fs = require('fs');
const path = require('path');

const dataDir = path.resolve(__dirname, '../../data');
const fileRegex = /^(\d{2})-(\d{2})-(\d{2})\.json$/;

const ECONOMIC_KEYWORDS = [
    'bank', 'banking', 'economy', 'economic', 'budget', 'finance', 'financial',
    'inflation', 'gdp', 'rbi', 'sbi', 'idfc', 'unemployment', 'tax', 'lakh crore',
    'world bank', 'miga', 'cashback', 'रिज़र्व बैंक', 'बैंक', 'अर्थव्यवस्था', 'बजट', 'वित्त'
];

const INTERNATIONAL_KEYWORDS = [
    'international', 'global', 'world', 'foreign', 'iran', 'tehran', 'peru', 'denmark',
    'usa', 'america', 'china', 'russia', 'united nations', 'अंतरराष्ट्रीय', 'वैश्विक', 'विदेश'
];

const NATIONAL_KEYWORDS = [
    'national', 'india', 'indian', 'delhi', 'kerala', 'pune', 'visakhapatnam',
    'state', 'government of india', 'exercise milan', 'shivaji', 'केंद्र', 'भारत',
    'राष्ट्रीय', 'राज्य', 'सरकार', 'दिल्ली', 'केरल', 'पुणे'
];

function inferCategory(question) {
    const text = `${question.q || ''} ${question.rationale || ''}`.toLowerCase();

    if (ECONOMIC_KEYWORDS.some((keyword) => text.includes(keyword))) {
        return 'economic affairs';
    }

    if (INTERNATIONAL_KEYWORDS.some((keyword) => text.includes(keyword))) {
        return 'international affairs';
    }

    if (NATIONAL_KEYWORDS.some((keyword) => text.includes(keyword))) {
        return 'national affairs';
    }

    return 'general affairs';
}

function normalizeCategory(value) {
    return String(value || '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ');
}

function run() {
    const files = fs.readdirSync(dataDir).filter((file) => fileRegex.test(file));
    let changedFiles = 0;
    let updatedQuestions = 0;

    for (const file of files) {
        const filePath = path.join(dataDir, file);
        const raw = fs.readFileSync(filePath, 'utf-8');
        const json = JSON.parse(raw);

        if (!Array.isArray(json.questions)) continue;

        let fileChanged = false;
        json.questions = json.questions.map((question) => {
            const existingCategory = normalizeCategory(question.category);
            if (existingCategory) {
                return { ...question, category: existingCategory };
            }

            const category = inferCategory(question);
            fileChanged = true;
            updatedQuestions++;
            return { ...question, category };
        });

        if (fileChanged) {
            fs.writeFileSync(filePath, `${JSON.stringify(json, null, 2)}\n`, 'utf-8');
            changedFiles++;
            console.log(`Updated categories in ${file}`);
        }
    }

    console.log(`Done. Files changed: ${changedFiles}, questions updated: ${updatedQuestions}`);
}

run();
