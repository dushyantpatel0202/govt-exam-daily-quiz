const mongoose = require('mongoose');

const quizDaySchema = new mongoose.Schema(
    {
        date: {
            type: String,
            required: true,
            unique: true,
            match: /^\d{4}-\d{2}-\d{2}$/
        },
        payload: {
            type: mongoose.Schema.Types.Mixed,
            required: true
        },
        questionCategories: {
            type: [String],
            default: []
        },
        sourceFile: {
            type: String,
            default: null
        }
    },
    {
        timestamps: true,
        versionKey: false
    }
);

quizDaySchema.index({ questionCategories: 1 });

module.exports = mongoose.model('QuizDay', quizDaySchema);
