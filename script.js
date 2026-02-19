// Global variables
let currentQuiz = null;
let currentQuestionIndex = 0;
let score = 0;
let totalQuestions = 0;
let selectedAnswers = [];
let skippedQuestions = [];
let reviewMarkedQuestions = [];
let questionTimes = [];
let timerInterval = null;
let secondsElapsed = 0;
let isTimerRunning = false;
let hintUsed = false;
let userPerformance = {
    strengths: [],
    weaknesses: [],
    topics: {}
};

// Review mode variables
let isReviewMode = false;
let currentReviewIndex = 0;
let reviewFilter = 'all'; // 'all', 'wrong', 'skipped'
let filteredReviewIndices = [];
let toastTimeout = null;
const pdfBadgePaddingTop = -7;
const pdfReviewHeadingFontSize = 12;
const pdfReviewHeadingNudge = -8;

// Quiz categories for analysis
const QUIZ_CATEGORIES = {
    'Global Firepower Index': ['military', 'defense', 'global power', 'rank'],
    'Budget': ['budget', '₹', 'lakh crore', 'finance', 'economic'],
    'Capital': ['capital', 'city', 'france', 'paris'],
    'Science': ['planet', 'mars', 'red planet', 'solar system'],
    'Constitution': ['fundamental', 'constitution', 'amendment', 'duties', 'rights'],
    'Current Affairs': ['current', 'recent', '2026', '2025', 'india']
};

function getFilenameFromDate(selectedDate) {
    const dateParts = selectedDate.split('-');
    const yearShort = dateParts[0].substring(2);
    return `${yearShort}-${dateParts[1]}-${dateParts[2]}.json`;
}

function formatDisplayDate(dateString) {
    return new Date(`${dateString}T00:00:00`).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function formatShortDate(dateString) {
    const date = new Date(`${dateString}T00:00:00`);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);
    return `${day}-${month}-${year}`;
}

async function fetchQuizDataByDate(selectedDate) {
    try {
        const filename = getFilenameFromDate(selectedDate);
        const response = await fetch(`./data/${filename}`, { cache: 'no-store' });
        if (!response.ok) return null;
        return await response.json();
    } catch (error) {
        return null;
    }
}

function hideUnavailableSection() {
    const unavailableSection = document.getElementById('unavailable-section');
    if (unavailableSection) unavailableSection.classList.add('hidden');
}

async function getLastAvailableQuizDates(fromDate, count = 4) {
    const results = [];
    const startDate = new Date(`${fromDate}T00:00:00`);

    if (Number.isNaN(startDate.getTime())) {
        return results;
    }

    const cursor = new Date(startDate);
    cursor.setDate(cursor.getDate() - 1);

    let attempts = 0;
    const maxAttempts = 90;

    while (results.length < count && attempts < maxAttempts) {
        const isoDate = cursor.toISOString().slice(0, 10);
        const quizData = await fetchQuizDataByDate(isoDate);
        if (quizData) {
            results.push(isoDate);
        }
        cursor.setDate(cursor.getDate() - 1);
        attempts++;
    }

    return results;
}

function playQuizForDate(dateString) {
    const dateInput = document.getElementById('quiz-date');
    if (dateInput) {
        dateInput.value = dateString;
    }
    hideUnavailableSection();
    loadQuizByDate();
}

async function showUnavailableSection(selectedDate) {
    const unavailableSection = document.getElementById('unavailable-section');
    const unavailableMessage = document.getElementById('unavailable-message');
    const quickButtonsContainer = document.getElementById('last-4-days-buttons');

    const quizContainer = document.getElementById('quiz-container');
    if (quizContainer) quizContainer.classList.add('hidden');

    const contentSection = document.getElementById('content-section');
    if (contentSection) contentSection.classList.add('hidden');

    if (unavailableMessage) {
        unavailableMessage.innerText = `We will be uploading soon for ${formatDisplayDate(selectedDate)}.`;
    }

    if (quickButtonsContainer) {
        quickButtonsContainer.innerHTML = '<p class="text-sm text-gray-500">Checking recent quizzes...</p>';
        const recentDates = await getLastAvailableQuizDates(selectedDate, 4);

        if (!recentDates.length) {
            quickButtonsContainer.innerHTML = '<p class="text-sm text-gray-500">No recent quizzes found.</p>';
        } else {
            quickButtonsContainer.innerHTML = recentDates.map((dateString) => `
                <button
                    onclick="playQuizForDate('${dateString}')"
                    class="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-medium px-4 py-2 rounded-lg transition-all"
                >
                    ▶ Play ${formatShortDate(dateString)}
                </button>
            `).join('');
        }
    }

    if (unavailableSection) unavailableSection.classList.remove('hidden');
}

// Initialize quiz
async function loadQuizByDate() {
    const selectedDate = document.getElementById('quiz-date').value;
    
    if (!selectedDate) {
        alert("Please select a date first!");
        return;
    }

    try {
        const quizData = await fetchQuizDataByDate(selectedDate);
        if (!quizData) {
            await showUnavailableSection(selectedDate);
            return;
        }

        hideUnavailableSection();
        // ADD THIS LINE to hide the content page if it was open
        const contentSection = document.getElementById('content-section');
        if (contentSection) contentSection.classList.add('hidden');
        
        // Reset quiz state
        currentQuiz = quizData;
        currentQuestionIndex = 0;
        score = 0;
        totalQuestions = quizData.questions.length;
        selectedAnswers = new Array(totalQuestions).fill(null);
        skippedQuestions = [];
        reviewMarkedQuestions = [];
        questionTimes = new Array(totalQuestions).fill(null);
        secondsElapsed = 0;
        hintUsed = false;
        
        // Record start time for first question
        questionTimes[0] = {
            start: Date.now()
        };
        
        // Update UI with null checks
        const scoreValueEl = document.getElementById('score-value');
        if (scoreValueEl) scoreValueEl.innerText = score;
        
        const totalScoreEl = document.getElementById('total-score');
        if (totalScoreEl) totalScoreEl.innerText = totalQuestions;
        
        const totalQuestionsEl = document.getElementById('total-questions');
        if (totalQuestionsEl) totalQuestionsEl.innerText = `of ${totalQuestions}`;
        
        // Show quiz container
        const quizContainer = document.getElementById('quiz-container');
        if (quizContainer) quizContainer.classList.remove('hidden');
        
        const resultsDashboard = document.getElementById('results-dashboard');
        if (resultsDashboard) resultsDashboard.classList.add('hidden');
        
        const reviewSection = document.getElementById('review-section');
        if (reviewSection) reviewSection.classList.add('hidden');
        
        // Start timer
        startTimer();
        
        // Start quiz
        startQuiz();
        
    } catch (error) {
        alert('Unable to load quiz right now. Please try again.');
    }
}

// Show content section
async function showContent() {
    const selectedDate = document.getElementById('quiz-date').value;
    
    if (!selectedDate) {
        alert("Please select a date first!");
        return;
    }

    try {
        const quizData = await fetchQuizDataByDate(selectedDate);
        if (!quizData) {
            await showUnavailableSection(selectedDate);
            return;
        }

        hideUnavailableSection();
        
        // Store the quiz data for later use
        currentQuiz = quizData;
        
        // Hide other sections
        //const quizContainer = document.getElementById('quiz-container');
        //if (quizContainer) quizContainer.classList.add('hidden');
        
        //const resultsDashboard = document.getElementById('results-dashboard');
        //if (resultsDashboard) resultsDashboard.classList.add('hidden');
        
        //const reviewSection = document.getElementById('review-section');
        //if (reviewSection) reviewSection.classList.add('hidden');
        
        // Show content section
        const contentSection = document.getElementById('content-section');
        if (contentSection) contentSection.classList.remove('hidden');
        
        // Load content into the content section
        const contentText = document.getElementById('content-text');
        if (contentText) {
            // Check if JSON has a content field
            if (quizData.content) {
                contentText.innerHTML = quizData.content;
            } else {
                // Generate content from questions
                let contentHTML = '<div class="space-y-6">';
                
                // Date header
                const formattedDate = new Date(selectedDate).toLocaleDateString('en-IN', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
                
                contentHTML += `
                    <div class="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-6 rounded-xl">
                        <h3 class="text-2xl font-bold mb-2">📚 Study Material for ${formattedDate}</h3>
                        <p class="text-purple-100">Category: ${quizData.category || 'Current Affairs'} | Difficulty: ${quizData.difficulty || 'Medium'}</p>
                    </div>
                `;
                
                contentHTML += '<p class="text-gray-600 mb-4">Review the following topics and questions before starting the quiz:</p>';
                
                // Group questions by topic
                const topics = {};
                quizData.questions.forEach((q, index) => {
                    // Extract topic from question or use category
                    let topic = q.topic || 'General Knowledge';
                    
                    // Try to determine topic from question text if not specified
                    if (!q.topic) {
                        for (const [category, keywords] of Object.entries(QUIZ_CATEGORIES)) {
                            if (keywords.some(keyword => 
                                q.q.toLowerCase().includes(keyword.toLowerCase()) || 
                                (q.rationale && q.rationale.toLowerCase().includes(keyword.toLowerCase()))
                            )) {
                                topic = category;
                                break;
                            }
                        }
                    }
                    
                    if (!topics[topic]) {
                        topics[topic] = [];
                    }
                    topics[topic].push(q);
                });
                
                // Display topics and their questions
                for (const [topic, questions] of Object.entries(topics)) {
                    contentHTML += `
                        <div class="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all">
                            <h4 class="font-semibold text-lg text-purple-800 mb-3 flex items-center">
                                <span class="bg-purple-100 p-1 rounded-lg mr-2">📌</span>
                                ${topic}
                            </h4>
                            <div class="space-y-4">
                    `;
                    
                    questions.forEach((q, idx) => {
                        // Get correct answer
                        const correctIndex = typeof q.correct === 'number' ? q.correct : q.options.indexOf(q.correct);
                        const correctAnswer = q.options[correctIndex];
                        const correctLetter = String.fromCharCode(65 + correctIndex);
                        
                        contentHTML += `
                            <div class="border-l-4 border-purple-400 pl-4 py-2">
                                <p class="font-medium text-gray-800 mb-2">${idx + 1}. ${q.q}</p>
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-2 ml-4 mb-2">
                                    ${q.options.map((opt, optIdx) => {
                                        const letter = String.fromCharCode(65 + optIdx);
                                        const isCorrect = optIdx === correctIndex;
                                        return `<div class="text-sm ${isCorrect ? 'text-green-600 font-medium' : 'text-gray-600'}">
                                            ${letter}. ${opt} ${isCorrect ? '✓' : ''}
                                        </div>`;
                                    }).join('')}
                                </div>
                                ${q.rationale ? `
                                    <div class="text-sm bg-blue-50 p-3 rounded-lg mt-2">
                                        <span class="font-medium text-blue-700">📝 Explanation:</span>
                                        <span class="text-gray-700"> ${q.rationale}</span>
                                    </div>
                                ` : ''}
                            </div>
                        `;
                    });
                    
                    contentHTML += `
                            </div>
                        </div>
                    `;
                }
                
                // Quiz overview
                contentHTML += `
                    <div class="bg-indigo-50 p-5 rounded-xl border border-indigo-200 mt-6">
                        <h4 class="font-semibold text-indigo-800 mb-3 flex items-center">
                            <span class="bg-indigo-100 p-1 rounded-lg mr-2">📊</span>
                            Quiz Overview
                        </h4>
                        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div class="bg-white p-3 rounded-lg text-center">
                                <span class="block text-2xl font-bold text-indigo-600">${quizData.questions.length}</span>
                                <span class="text-xs text-gray-600">Total Questions</span>
                            </div>
                            <div class="bg-white p-3 rounded-lg text-center">
                                <span class="block text-2xl font-bold text-indigo-600">${Object.keys(topics).length}</span>
                                <span class="text-xs text-gray-600">Topics</span>
                            </div>
                            <div class="bg-white p-3 rounded-lg text-center">
                                <span class="block text-2xl font-bold text-indigo-600">${quizData.difficulty || 'Medium'}</span>
                                <span class="text-xs text-gray-600">Difficulty</span>
                            </div>
                            <div class="bg-white p-3 rounded-lg text-center">
                                <span class="block text-2xl font-bold text-indigo-600">${quizData.category || 'General'}</span>
                                <span class="text-xs text-gray-600">Category</span>
                            </div>
                        </div>
                    </div>
                `;
                
                contentHTML += `
                    <div class="flex justify-end mt-6">
                        <button onclick="startQuizFromContent()" class="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold px-8 py-3 rounded-xl transition-all hover-scale shadow-lg">
                            🚀 Start Quiz Now
                        </button>
                    </div>
                `;
                
                contentHTML += '</div>';
                contentText.innerHTML = contentHTML;
            }
        }
        
    } catch (error) {
        alert('Unable to load content right now. Please try again.');
    }
}

// Close content section
function closeContent() {
    const contentSection = document.getElementById('content-section');
    if (contentSection) contentSection.classList.add('hidden');
}

// Start quiz from content section
function startQuizFromContent() {
    if (!currentQuiz) {
        alert("Please select a date first!");
        return;
    }
    
    // Close content section
    const contentSection = document.getElementById('content-section');
    if (contentSection) contentSection.classList.add('hidden');
    
    // Reset quiz state
    currentQuestionIndex = 0;
    score = 0;
    totalQuestions = currentQuiz.questions.length;
    selectedAnswers = new Array(totalQuestions).fill(null);
    skippedQuestions = [];
    reviewMarkedQuestions = [];
    questionTimes = new Array(totalQuestions).fill(null);
    secondsElapsed = 0;
    hintUsed = false;
    
    // Record start time for first question
    questionTimes[0] = { start: Date.now() };
    
    // Update UI
    const scoreValueEl = document.getElementById('score-value');
    if (scoreValueEl) scoreValueEl.innerText = score;
    
    const totalScoreEl = document.getElementById('total-score');
    if (totalScoreEl) totalScoreEl.innerText = totalQuestions;
    
    const totalQuestionsEl = document.getElementById('total-questions');
    if (totalQuestionsEl) totalQuestionsEl.innerText = `of ${totalQuestions}`;
    
    // Show quiz container
    const quizContainer = document.getElementById('quiz-container');
    if (quizContainer) quizContainer.classList.remove('hidden');
    
    const resultsDashboard = document.getElementById('results-dashboard');
    if (resultsDashboard) resultsDashboard.classList.add('hidden');
    
    const reviewSection = document.getElementById('review-section');
    if (reviewSection) reviewSection.classList.add('hidden');
    
    // Start timer
    startTimer();
    
    // Start quiz
    startQuiz();
}

// Start quiz
function startQuiz() {
    const feedback = document.getElementById('feedback');
    if (feedback) feedback.classList.add('hidden');

    // Populate question navigator
    populateQuizNavigator();

    displayQuestion(currentQuestionIndex);
    updateProgress();
}

// Populate quiz question navigator
function populateQuizNavigator() {
    const container = document.getElementById('quiz-question-boxes');
    if (!container || !currentQuiz) return;

    container.innerHTML = '';

    for (let i = 0; i < totalQuestions; i++) {
        const button = document.createElement('button');
        button.innerText = i + 1;
        button.className = 'w-8 h-8 rounded-lg text-sm font-medium transition-all border-2 relative';
        
        // Set button style based on question status
        const userAnswer = selectedAnswers[i];
        const question = currentQuiz.questions[i];
        const correctIndex = typeof question?.correct === 'number' ? 
            question.correct : (question?.options ? question.options.indexOf(question.correct) : -1);

        // Status-based coloring
        if (userAnswer === 'skipped') {
            button.classList.add('bg-yellow-100', 'text-yellow-800', 'border-yellow-300');
        } else if (userAnswer !== null && userAnswer !== undefined) {
            if (userAnswer === correctIndex) {
                button.classList.add('bg-green-100', 'text-green-800', 'border-green-300');
            } else {
                button.classList.add('bg-red-100', 'text-red-800', 'border-red-300');
            }
        } else if (i === currentQuestionIndex) {
            button.classList.add('bg-indigo-100', 'text-indigo-800', 'border-indigo-300');
        } else {
            button.classList.add('bg-gray-100', 'text-gray-800', 'border-gray-300');
        }

        // Mark for review indicator
        if (reviewMarkedQuestions.includes(i)) {
            button.innerHTML = `${i + 1}<span class="absolute -top-2 -right-2 text-xs bg-white rounded-full px-1">📌</span>`;
        }

        // Current question highlighting
        if (i === currentQuestionIndex) {
            button.classList.add('ring-2', 'ring-indigo-500', 'ring-offset-2');
        }

        button.onclick = () => jumpToQuizQuestion(i);
        container.appendChild(button);
    }
}

// Update quiz navigator highlighting
function updateQuizNavigator() {
    const container = document.getElementById('quiz-question-boxes');
    if (!container) return;

    const buttons = container.children;
    for (let i = 0; i < buttons.length; i++) {
        const btn = buttons[i];
        // Remove ring from all
        btn.classList.remove('ring-2', 'ring-indigo-500', 'ring-offset-2');
        
        // Add ring to current question
        if (i === currentQuestionIndex) {
            btn.classList.add('ring-2', 'ring-indigo-500', 'ring-offset-2');
        }
    }
}

// Jump to specific question in quiz
function jumpToQuizQuestion(index) {
    if (index < 0 || index >= totalQuestions) return;

    // Save current question time before jumping
    if (questionTimes[currentQuestionIndex]) {
        questionTimes[currentQuestionIndex].end = Date.now();
    }

    // Jump to new question
    currentQuestionIndex = index;

    // Set start time for new question if not set
    if (!questionTimes[currentQuestionIndex]) {
        questionTimes[currentQuestionIndex] = {
            start: Date.now()
        };
    }

    // Hide feedback when jumping to new question
    const feedback = document.getElementById('feedback');
    if (feedback) feedback.classList.add('hidden');

    // Display the question
    displayQuestion(currentQuestionIndex);
    
    // Update navigator highlighting
    updateQuizNavigator();
}

// Display question
function displayQuestion(index) {
    if (!currentQuiz || index >= totalQuestions) {
        endQuiz();
        return;
    }

    const question = currentQuiz.questions[index];
    
    // Update question text
    const qTextEl = document.getElementById('q-text');
    if (qTextEl) qTextEl.innerText = `${index + 1}. ${question.q}`;
    
    const questionNumberEl = document.getElementById('question-number');
    if (questionNumberEl) questionNumberEl.innerText = index + 1;
    
    const currentQuestionEl = document.getElementById('current-question');
    if (currentQuestionEl) currentQuestionEl.innerText = `Question ${index + 1}`;
    
    // Clear and create option buttons
    const optionsDiv = document.getElementById('options');
    if (!optionsDiv) return;
    
    optionsDiv.innerHTML = '';
    
    question.options.forEach((option, i) => {
        const button = document.createElement('button');
        const letter = String.fromCharCode(65 + i);
        
        button.innerHTML = `
            <span class="inline-flex items-center justify-center w-6 h-6 rounded-full border border-gray-300 mr-3 text-sm font-medium">
                ${letter}
            </span>
            <span>${option}</span>
        `;
        
        button.className = 'w-full text-left p-3 border rounded-xl hover:bg-gray-50 transition-all flex items-center';
        
        // Check if previously answered
        if (selectedAnswers[index] !== null && selectedAnswers[index] !== undefined) {
            button.disabled = true;
            if (selectedAnswers[index] === i) {
                button.classList.add('bg-indigo-50', 'border-indigo-300');
            }
        }
        
        button.onclick = () => checkAnswer(i, question);
        optionsDiv.appendChild(button);
    });
    
    // Check if question was skipped
    if (skippedQuestions.includes(index)) {
        const feedback = document.getElementById('feedback');
        const feedbackText = document.getElementById('feedback-text');
        const rationale = document.getElementById('rationale');
        const nextBtn = document.getElementById('next-btn');
        
        if (feedback) {
            feedback.classList.remove('hidden');
            feedback.className = 'mt-6 p-5 rounded-xl bg-yellow-50 border-l-4 border-yellow-500';
        }
        if (feedbackText) feedbackText.innerHTML = '<span class="text-yellow-600 font-bold">⏭️ Question Skipped</span>';
        if (rationale) rationale.innerHTML = 'You can come back to this question later.';
        if (nextBtn) nextBtn.classList.remove('hidden');
    }

    // Update navigator
    updateQuizNavigator();
}

// Check answer
function checkAnswer(selectedIndex, question) {
    const startTime = questionTimes[currentQuestionIndex]?.start || Date.now();
    const timeSpent = (Date.now() - startTime) / 1000;
    
    // Record answer time
    questionTimes[currentQuestionIndex] = {
        ...questionTimes[currentQuestionIndex],
        answerTime: timeSpent,
        selected: selectedIndex,
        end: Date.now()
    };
    
    // Disable all option buttons
    const optionButtons = document.querySelectorAll('#options button');
    optionButtons.forEach(btn => btn.disabled = true);
    
    // Store the selected answer
    selectedAnswers[currentQuestionIndex] = selectedIndex;
    
    // Remove from skipped if it was skipped
    const skipIndex = skippedQuestions.indexOf(currentQuestionIndex);
    if (skipIndex > -1) {
        skippedQuestions.splice(skipIndex, 1);
    }
    
    // Determine correct answer index
    let correctIndex;
    if (typeof question.correct === 'number') {
        correctIndex = question.correct;
    } else {
        correctIndex = question.options.indexOf(question.correct);
    }
    
    // Highlight answers
    optionButtons.forEach((btn, index) => {
        if (index === correctIndex) {
            btn.classList.add('bg-green-100', 'border-green-400', 'text-green-800');
        } else if (index === selectedIndex && index !== correctIndex) {
            btn.classList.add('bg-red-100', 'border-red-400', 'text-red-800');
        }
    });
    
    // Check if correct
    const isCorrect = selectedIndex === correctIndex;
    
    // Update score
    if (isCorrect) {
        score++;
        const scoreValueEl = document.getElementById('score-value');
        if (scoreValueEl) scoreValueEl.innerText = score;
    }
    
    // Prepare feedback
    const feedback = document.getElementById('feedback');
    const feedbackText = document.getElementById('feedback-text');
    const rationale = document.getElementById('rationale');
    const nextBtn = document.getElementById('next-btn');
    
    if (feedback && feedbackText) {
        if (isCorrect) {
            feedbackText.innerHTML = '<span class="text-green-600 font-bold text-lg">✓ Correct!</span>';
            feedback.className = 'mt-6 p-5 rounded-xl bg-green-50 border-l-4 border-green-500';
        } else {
            const correctAnswer = question.options[correctIndex];
            const correctLetter = String.fromCharCode(65 + correctIndex);
            feedbackText.innerHTML = `
                <span class="text-red-600 font-bold text-lg">✗ Incorrect</span>
                <div class="text-sm mt-1">Correct answer: <span class="font-medium">${correctLetter}. ${correctAnswer}</span></div>
            `;
            feedback.className = 'mt-6 p-5 rounded-xl bg-red-50 border-l-4 border-red-500';
        }
        
        feedback.classList.remove('hidden');
    }
    
    // Show rationale
    if (rationale) {
        if (question.rationale) {
            rationale.innerHTML = `<span class="font-medium">📝 Explanation:</span> ${question.rationale}`;
            rationale.classList.remove('hidden');
        } else {
            rationale.classList.add('hidden');
        }
    }
    
    if (nextBtn) nextBtn.classList.remove('hidden');
    
    // Update progress
    updateProgress();
    
    // Update navigator
    populateQuizNavigator();
}

// Next question
function nextQuestion() {
    // Record question end time if not already recorded
    if (questionTimes[currentQuestionIndex] && !questionTimes[currentQuestionIndex].end) {
        questionTimes[currentQuestionIndex].end = Date.now();
    }
    
    currentQuestionIndex++;
    
    if (currentQuestionIndex < totalQuestions) {
        // Record start time for next question
        if (!questionTimes[currentQuestionIndex]) {
            questionTimes[currentQuestionIndex] = {
                start: Date.now()
            };
        }
        
        const feedback = document.getElementById('feedback');
        if (feedback) feedback.classList.add('hidden');
        
        displayQuestion(currentQuestionIndex);
    } else {
        endQuiz();
    }
}

// Skip question
function skipQuestion() {
    if (!skippedQuestions.includes(currentQuestionIndex)) {
        skippedQuestions.push(currentQuestionIndex);
    }
    
    // Mark as skipped in answers
    selectedAnswers[currentQuestionIndex] = 'skipped';
    
    // Update navigator
    populateQuizNavigator();
    
    // Move to next question
    nextQuestion();
}

// Mark for review
function markForReview() {
    if (!reviewMarkedQuestions.includes(currentQuestionIndex)) {
        reviewMarkedQuestions.push(currentQuestionIndex);
        alert('Question marked for review! 📌');
    } else {
        const index = reviewMarkedQuestions.indexOf(currentQuestionIndex);
        reviewMarkedQuestions.splice(index, 1);
        alert('Question removed from review!');
    }
    
    // Update navigator to show bookmark
    populateQuizNavigator();
}

// Show hint
function showHint() {
    hintUsed = true;
    const question = currentQuiz.questions[currentQuestionIndex];
    const correctIndex = typeof question.correct === 'number' ? question.correct : question.options.indexOf(question.correct);
    const correctLetter = String.fromCharCode(65 + correctIndex);
    
    alert(`💡 Hint: Look for answer option ${correctLetter}`);
}

// Timer functions
function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    isTimerRunning = true;
    
    timerInterval = setInterval(() => {
        secondsElapsed++;
        updateTimerDisplay();
    }, 1000);
}

function toggleTimer() {
    if (isTimerRunning) {
        clearInterval(timerInterval);
        isTimerRunning = false;
    } else {
        startTimer();
    }
}

function updateTimerDisplay() {
    const minutes = Math.floor(secondsElapsed / 60);
    const seconds = secondsElapsed % 60;
    const timerDisplay = document.getElementById('timer-display');
    if (timerDisplay) {
        timerDisplay.innerText = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
}

// Update progress bar
function updateProgress() {
    const answeredCount = selectedAnswers.filter(a => a !== null && a !== undefined).length;
    const progress = totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0;
    
    const progressBar = document.getElementById('progress-bar');
    if (progressBar) progressBar.style.width = `${progress}%`;
    
    const progressPercent = document.getElementById('progress-percent');
    if (progressPercent) progressPercent.innerText = `${Math.round(progress)}%`;
}

// End quiz and show results
function endQuiz() {
    updateProgressData();
    
    // Stop timer
    clearInterval(timerInterval);
    isTimerRunning = false;
    
    // Hide quiz container
    const quizContainer = document.getElementById('quiz-container');
    if (quizContainer) quizContainer.classList.add('hidden');
    
    // Calculate statistics
    const correctAnswers = selectedAnswers.filter((ans, idx) => {
        if (ans === 'skipped') return false;
        if (ans === null) return false;
        const question = currentQuiz.questions[idx];
        const correctIndex = typeof question.correct === 'number' ? 
            question.correct : question.options.indexOf(question.correct);
        return ans === correctIndex;
    }).length;
    
    const wrongAnswers = selectedAnswers.filter((ans, idx) => {
        if (ans === 'skipped') return false;
        if (ans === null) return false;
        const question = currentQuiz.questions[idx];
        const correctIndex = typeof question.correct === 'number' ? 
            question.correct : question.options.indexOf(question.correct);
        return ans !== correctIndex;
    }).length;
    
    const skipped = skippedQuestions.length;
    
    // Update results dashboard
    const finalScoreEl = document.getElementById('final-score');
    if (finalScoreEl) finalScoreEl.innerText = correctAnswers;
    
    const finalTotalEl = document.getElementById('final-total');
    if (finalTotalEl) finalTotalEl.innerText = totalQuestions;
    
    const correctCountEl = document.getElementById('correct-count');
    if (correctCountEl) correctCountEl.innerText = correctAnswers;
    
    const wrongCountEl = document.getElementById('wrong-count');
    if (wrongCountEl) wrongCountEl.innerText = wrongAnswers;
    
    const skippedCountEl = document.getElementById('skipped-count');
    if (skippedCountEl) skippedCountEl.innerText = skipped;
    
    const accuracy = totalQuestions > skipped ? Math.round((correctAnswers / (totalQuestions - skipped)) * 100) : 0;
    const accuracyPercentEl = document.getElementById('accuracy-percent');
    if (accuracyPercentEl) accuracyPercentEl.innerText = accuracy;
    
    const minutes = Math.floor(secondsElapsed / 60);
    const seconds = secondsElapsed % 60;
    const timeTakenEl = document.getElementById('time-taken');
    if (timeTakenEl) timeTakenEl.innerText = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    
    const avgTimeEl = document.getElementById('avg-time');
    if (avgTimeEl) {
        const avgTime = totalQuestions > 0 ? Math.round(secondsElapsed / totalQuestions) : 0;
        avgTimeEl.innerText = `Avg. ${avgTime}s per question`;
    }
    
    // Update chart data
    const chartRightEl = document.getElementById('chart-right');
    if (chartRightEl) chartRightEl.innerText = correctAnswers;
    
    const chartWrongEl = document.getElementById('chart-wrong');
    if (chartWrongEl) chartWrongEl.innerText = wrongAnswers;
    
    const chartSkippedEl = document.getElementById('chart-skipped');
    if (chartSkippedEl) chartSkippedEl.innerText = skipped;
    
    const rightBarEl = document.getElementById('right-bar');
    if (rightBarEl) {
        const rightPercent = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;
        rightBarEl.style.width = `${rightPercent}%`;
    }
    
    const wrongBarEl = document.getElementById('wrong-bar');
    if (wrongBarEl) {
        const wrongPercent = totalQuestions > 0 ? (wrongAnswers / totalQuestions) * 100 : 0;
        wrongBarEl.style.width = `${wrongPercent}%`;
    }
    
    const skippedBarEl = document.getElementById('skipped-bar');
    if (skippedBarEl) {
        const skippedPercent = totalQuestions > 0 ? (skipped / totalQuestions) * 100 : 0;
        skippedBarEl.style.width = `${skippedPercent}%`;
    }
    
    // Performance rating
    const ratingEl = document.getElementById('performance-rating');
    if (ratingEl) {
        if (accuracy >= 80) ratingEl.innerText = 'Excellent! 🎉';
        else if (accuracy >= 60) ratingEl.innerText = 'Good Job! 👍';
        else if (accuracy >= 40) ratingEl.innerText = 'Keep Practicing! 📚';
        else ratingEl.innerText = 'Need More Practice! 💪';
    }
    
    // Show results dashboard
    const resultsDashboard = document.getElementById('results-dashboard');
    if (resultsDashboard) resultsDashboard.classList.remove('hidden');
}

// Analyze performance by topic
function analyzeTopics() {
    if (!currentQuiz) return;
    
    const topics = {};
    
    currentQuiz.questions.forEach((question, index) => {
        // Determine topic
        let topic = 'General';
        for (const [category, keywords] of Object.entries(QUIZ_CATEGORIES)) {
            if (keywords.some(keyword => 
                question.q.toLowerCase().includes(keyword.toLowerCase()) || 
                (question.rationale && question.rationale.toLowerCase().includes(keyword.toLowerCase()))
            )) {
                topic = category;
                break;
            }
        }
        
        // Initialize topic data
        if (!topics[topic]) {
            topics[topic] = {
                total: 0,
                correct: 0,
                wrong: 0,
                skipped: 0
            };
        }
        
        // Count answers
        topics[topic].total++;
        
        const answer = selectedAnswers[index];
        if (answer === 'skipped') {
            topics[topic].skipped++;
        } else if (answer !== null) {
            const correctIndex = typeof question.correct === 'number' ? 
                question.correct : question.options.indexOf(question.correct);
            if (answer === correctIndex) {
                topics[topic].correct++;
            } else {
                topics[topic].wrong++;
            }
        }
    });
    
    // Identify strengths and weaknesses
    const strengths = [];
    const weaknesses = [];
    
    for (const [topic, data] of Object.entries(topics)) {
        const attempted = data.total - data.skipped;
        const accuracy = attempted > 0 ? (data.correct / attempted) * 100 : 0;
        if (accuracy >= 70 && attempted > 0) {
            strengths.push({ topic, accuracy, ...data });
        } else if (accuracy < 50 && attempted > 0) {
            weaknesses.push({ topic, accuracy, ...data });
        }
    }
    
    // Display strengths and weaknesses
    const container = document.getElementById('strengths-areas');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (strengths.length > 0) {
        const strengthsDiv = document.createElement('div');
        strengthsDiv.className = 'bg-green-50 p-4 rounded-xl';
        strengthsDiv.innerHTML = `
            <h4 class="font-semibold text-green-800 mb-3">✅ Strengths</h4>
            ${strengths.map(s => `
                <div class="mb-2">
                    <div class="flex justify-between text-sm">
                        <span class="text-gray-700">${s.topic}</span>
                        <span class="font-medium text-green-700">${Math.round(s.accuracy)}%</span>
                    </div>
                    <div class="w-full bg-green-200 rounded-full h-1.5">
                        <div class="bg-green-600 h-1.5 rounded-full" style="width: ${s.accuracy}%"></div>
                    </div>
                </div>
            `).join('')}
        `;
        container.appendChild(strengthsDiv);
    }
    
    if (weaknesses.length > 0) {
        const weaknessesDiv = document.createElement('div');
        weaknessesDiv.className = 'bg-red-50 p-4 rounded-xl';
        weaknessesDiv.innerHTML = `
            <h4 class="font-semibold text-red-800 mb-3">📚 Growth Areas</h4>
            ${weaknesses.map(w => `
                <div class="mb-2">
                    <div class="flex justify-between text-sm">
                        <span class="text-gray-700">${w.topic}</span>
                        <span class="font-medium text-red-700">${Math.round(w.accuracy)}%</span>
                    </div>
                    <div class="w-full bg-red-200 rounded-full h-1.5">
                        <div class="bg-red-600 h-1.5 rounded-full" style="width: ${w.accuracy}%"></div>
                    </div>
                </div>
            `).join('')}
        `;
        container.appendChild(weaknessesDiv);
    }
    
    if (strengths.length === 0 && weaknesses.length === 0) {
        container.innerHTML = `
            <div class="col-span-2 text-center p-6 bg-gray-50 rounded-xl">
                <p class="text-gray-500">Complete more questions to see your strengths and growth areas!</p>
            </div>
        `;
    }
}

// Analyze performance button
function analyzePerformance() {
    analyzeTopics();
}

// Generate flashcards
function generateFlashcards() {
    if (!currentQuiz) {
        alert('Please complete a quiz first!');
        return;
    }
    
    const incorrectQuestions = currentQuiz.questions.filter((_, index) => {
        const answer = selectedAnswers[index];
        if (answer === 'skipped' || answer === null) return true;
        const question = currentQuiz.questions[index];
        const correctIndex = typeof question.correct === 'number' ? 
            question.correct : question.options.indexOf(question.correct);
        return answer !== correctIndex;
    });
    
    if (incorrectQuestions.length === 0) {
        alert('🎉 Perfect score! No flashcards needed!');
        return;
    }
    
    alert(`🃏 Generated ${incorrectQuestions.length} flashcards for review!`);
}

// Generate study guide
function generateStudyGuide() {
    if (!currentQuiz) {
        alert('Please complete a quiz first!');
        return;
    }
    alert('📖 Generating comprehensive study guide...');
}

// Generate review quiz
function generateReviewQuiz() {
    if (!currentQuiz) {
        alert('Please complete a quiz first!');
        return;
    }
    alert('📝 Creating personalized review quiz based on weak areas...');
}

// Review mode functions
function startReview() {
    if (!currentQuiz) {
        alert('Please complete a quiz first!');
        return;
    }

    isReviewMode = true;
    currentReviewIndex = 0;
    reviewFilter = 'all';

    // Hide results dashboard
    const resultsDashboard = document.getElementById('results-dashboard');
    if (resultsDashboard) resultsDashboard.classList.add('hidden');

    // Show review section
    const reviewSection = document.getElementById('review-section');
    if (reviewSection) reviewSection.classList.remove('hidden');

    // Populate UI elements
    populateQuestionOverview();
    populateJumpToDropdown();
    updateFilterButtons();

    // Display first question
    displayReviewQuestion(0);
}

function displayReviewQuestion(index) {
    if (!currentQuiz || index >= totalQuestions) return;

    const question = currentQuiz.questions[index];
    const userAnswer = selectedAnswers[index];

    // Update jump-to dropdown
    const jumpSelect = document.getElementById('jump-to-question');
    if (jumpSelect) jumpSelect.value = index;

    // Update question overview highlighting
    const overviewButtons = document.querySelectorAll('#question-overview button');
    overviewButtons.forEach((btn, i) => {
        if (i === index) {
            btn.classList.add('ring-2', 'ring-indigo-500', 'ring-offset-1');
        } else {
            btn.classList.remove('ring-2', 'ring-indigo-500', 'ring-offset-1');
        }
    });

    // Update progress
    let progressText = `Question ${index + 1} of ${totalQuestions}`;
    if (reviewFilter !== 'all') {
        const currentPosition = filteredReviewIndices.indexOf(index) + 1;
        const totalFiltered = filteredReviewIndices.length;
        progressText += ` (${currentPosition} of ${totalFiltered} filtered)`;
    }
    const reviewProgress = document.getElementById('review-progress');
    if (reviewProgress) reviewProgress.innerText = progressText;

    // Update navigation buttons
    const prevBtn = document.getElementById('prev-review-btn');
    const nextBtn = document.getElementById('next-review-btn');

    if (reviewFilter === 'all') {
        if (prevBtn) prevBtn.disabled = index === 0;
        if (nextBtn) nextBtn.disabled = index === totalQuestions - 1;
    } else {
        const currentPosition = filteredReviewIndices.indexOf(index);
        if (prevBtn) prevBtn.disabled = currentPosition === 0;
        if (nextBtn) nextBtn.disabled = currentPosition === filteredReviewIndices.length - 1;
    }

    // Determine question status
    const questionStatus = document.getElementById('question-status');
    let statusText = '';
    let statusClass = '';

    const correctIndex = typeof question.correct === 'number' ?
        question.correct : question.options.indexOf(question.correct);

    if (userAnswer === 'skipped') {
        statusText = '⏭️ Skipped';
        statusClass = 'bg-yellow-100 text-yellow-800';
    } else if (userAnswer === null) {
        statusText = '❓ Not Answered';
        statusClass = 'bg-gray-100 text-gray-800';
    } else if (userAnswer === correctIndex) {
        statusText = '✅ Correct';
        statusClass = 'bg-green-100 text-green-800';
    } else {
        statusText = '❌ Wrong';
        statusClass = 'bg-red-100 text-red-800';
    }

    if (questionStatus) {
        questionStatus.innerText = statusText;
        questionStatus.className = `px-3 py-1 rounded-full text-sm font-medium ${statusClass}`;
    }

    // Display question time if available
    const questionTimeEl = document.getElementById('question-time');
    if (questionTimeEl) {
        const questionTime = questionTimes[index];
        if (questionTime && questionTime.answerTime) {
            const seconds = Math.round(questionTime.answerTime);
            questionTimeEl.innerText = `Answered in ${seconds}s`;
        } else {
            questionTimeEl.innerText = '';
        }
    }

    // Display question text
    const qText = document.getElementById('review-q-text');
    if (qText) qText.innerText = `${index + 1}. ${question.q}`;

    // Display options with highlighting
    const optionsDiv = document.getElementById('review-options');
    if (!optionsDiv) return;

    optionsDiv.innerHTML = '';

    question.options.forEach((option, i) => {
        const button = document.createElement('div');
        const letter = String.fromCharCode(65 + i);

        let buttonClass = 'w-full text-left p-3 border rounded-xl flex items-center ';
        let icon = '';

        if (i === correctIndex) {
            buttonClass += 'bg-green-100 border-green-400 text-green-800';
            icon = '✅ ';
        } else if (userAnswer === i && userAnswer !== correctIndex) {
            buttonClass += 'bg-red-100 border-red-400 text-red-800';
            icon = '❌ ';
        } else {
            buttonClass += 'bg-gray-50 border-gray-200';
        }

        button.innerHTML = `
            <span class="inline-flex items-center justify-center w-6 h-6 rounded-full border border-gray-300 mr-3 text-sm font-medium">
                ${letter}
            </span>
            <span>${icon}${option}</span>
        `;

        button.className = buttonClass;
        optionsDiv.appendChild(button);
    });

    // Display feedback with explanation
    const feedback = document.getElementById('review-feedback');
    const feedbackText = document.getElementById('review-feedback-text');
    const rationale = document.getElementById('review-rationale');

    if (feedback && feedbackText) {
        feedback.classList.remove('hidden');
        
        if (userAnswer === 'skipped') {
            feedbackText.innerHTML = '<span class="text-yellow-600 font-bold">⏭️ Question Skipped</span>';
            feedback.className = 'mt-6 p-5 rounded-xl bg-yellow-50 border-l-4 border-yellow-500';
        } else if (userAnswer === null) {
            feedbackText.innerHTML = '<span class="text-gray-600 font-bold">❓ Question Not Answered</span>';
            feedback.className = 'mt-6 p-5 rounded-xl bg-gray-50 border-l-4 border-gray-500';
        } else if (userAnswer === correctIndex) {
            feedbackText.innerHTML = '<span class="text-green-600 font-bold">✓ Correct Answer!</span>';
            feedback.className = 'mt-6 p-5 rounded-xl bg-green-50 border-l-4 border-green-500';
        } else {
            const correctAnswer = question.options[correctIndex];
            const correctLetter = String.fromCharCode(65 + correctIndex);
            feedbackText.innerHTML = `
                <span class="text-red-600 font-bold">✗ Incorrect</span>
                <div class="text-sm mt-1">Correct answer: <span class="font-medium">${correctLetter}. ${correctAnswer}</span></div>
            `;
            feedback.className = 'mt-6 p-5 rounded-xl bg-red-50 border-l-4 border-red-500';
        }
    }

    // Show rationale/explanation
    if (rationale) {
        if (question.rationale) {
            rationale.innerHTML = `<span class="font-medium">📝 Explanation:</span> ${question.rationale}`;
            rationale.classList.remove('hidden');
        } else {
            rationale.innerHTML = '<span class="text-gray-500">No explanation available for this question.</span>';
            rationale.classList.remove('hidden');
        }
    }
}

function nextReviewQuestion() {
    if (reviewFilter === 'all') {
        if (currentReviewIndex < totalQuestions - 1) {
            currentReviewIndex++;
            displayReviewQuestion(currentReviewIndex);
        }
    } else {
        const currentPosition = filteredReviewIndices.indexOf(currentReviewIndex);
        if (currentPosition < filteredReviewIndices.length - 1) {
            currentReviewIndex = filteredReviewIndices[currentPosition + 1];
            displayReviewQuestion(currentReviewIndex);
        }
    }
}

function prevReviewQuestion() {
    if (reviewFilter === 'all') {
        if (currentReviewIndex > 0) {
            currentReviewIndex--;
            displayReviewQuestion(currentReviewIndex);
        }
    } else {
        const currentPosition = filteredReviewIndices.indexOf(currentReviewIndex);
        if (currentPosition > 0) {
            currentReviewIndex = filteredReviewIndices[currentPosition - 1];
            displayReviewQuestion(currentReviewIndex);
        }
    }
}

function exitReview() {
    isReviewMode = false;

    // Hide review section
    const reviewSection = document.getElementById('review-section');
    if (reviewSection) reviewSection.classList.add('hidden');

    // Show results dashboard
    const resultsDashboard = document.getElementById('results-dashboard');
    if (resultsDashboard) resultsDashboard.classList.remove('hidden');
}

function filterReview(filterType) {
    reviewFilter = filterType;
    updateFilterButtons();

    // Build filtered indices
    filteredReviewIndices = [];
    for (let i = 0; i < totalQuestions; i++) {
        const userAnswer = selectedAnswers[i];
        const question = currentQuiz.questions[i];
        const correctIndex = typeof question.correct === 'number' ?
            question.correct : question.options.indexOf(question.correct);

        let include = false;
        if (filterType === 'all') {
            include = true;
        } else if (filterType === 'wrong') {
            include = userAnswer !== 'skipped' && userAnswer !== null && userAnswer !== correctIndex;
        } else if (filterType === 'skipped') {
            include = userAnswer === 'skipped';
        }

        if (include) {
            filteredReviewIndices.push(i);
        }
    }

    // Jump to first question in filter
    if (filteredReviewIndices.length > 0) {
        currentReviewIndex = filteredReviewIndices[0];
        displayReviewQuestion(currentReviewIndex);
    }
}

function jumpToQuestion(questionIndex) {
    const index = parseInt(questionIndex);
    if (index >= 0 && index < totalQuestions) {
        currentReviewIndex = index;
        displayReviewQuestion(currentReviewIndex);
    }
}

function updateFilterButtons() {
    const filterAll = document.getElementById('filter-all');
    const filterWrong = document.getElementById('filter-wrong');
    const filterSkipped = document.getElementById('filter-skipped');

    // Reset all buttons
    if (filterAll) filterAll.className = 'px-3 py-1 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200';
    if (filterWrong) filterWrong.className = 'px-3 py-1 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200';
    if (filterSkipped) filterSkipped.className = 'px-3 py-1 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200';

    // Highlight active filter
    if (reviewFilter === 'all' && filterAll) {
        filterAll.className = 'px-3 py-1 rounded-lg text-sm font-medium bg-indigo-600 text-white';
    } else if (reviewFilter === 'wrong' && filterWrong) {
        filterWrong.className = 'px-3 py-1 rounded-lg text-sm font-medium bg-indigo-600 text-white';
    } else if (reviewFilter === 'skipped' && filterSkipped) {
        filterSkipped.className = 'px-3 py-1 rounded-lg text-sm font-medium bg-indigo-600 text-white';
    }
}

function populateQuestionOverview() {
    const overviewDiv = document.getElementById('question-overview');
    if (!overviewDiv) return;

    overviewDiv.innerHTML = '';

    for (let i = 0; i < totalQuestions; i++) {
        const button = document.createElement('button');
        button.innerText = i + 1;
        button.className = 'w-8 h-8 rounded-lg text-sm font-medium border transition-all';

        const userAnswer = selectedAnswers[i];
        const question = currentQuiz.questions[i];
        const correctIndex = typeof question.correct === 'number' ?
            question.correct : question.options.indexOf(question.correct);

        if (userAnswer === 'skipped') {
            button.className += ' bg-yellow-100 text-yellow-800 border-yellow-300';
        } else if (userAnswer === null) {
            button.className += ' bg-gray-100 text-gray-800 border-gray-300';
        } else if (userAnswer === correctIndex) {
            button.className += ' bg-green-100 text-green-800 border-green-300';
        } else {
            button.className += ' bg-red-100 text-red-800 border-red-300';
        }

        button.onclick = () => {
            currentReviewIndex = i;
            displayReviewQuestion(i);
        };

        overviewDiv.appendChild(button);
    }
}

function populateJumpToDropdown() {
    const jumpSelect = document.getElementById('jump-to-question');
    if (!jumpSelect) return;

    jumpSelect.innerHTML = '';

    for (let i = 0; i < totalQuestions; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.innerText = `Question ${i + 1}`;
        jumpSelect.appendChild(option);
    }
}

async function downloadReviewAsPDF() {
    if (!currentQuiz || !Array.isArray(currentQuiz.questions) || currentQuiz.questions.length === 0) {
        alert('Please complete a quiz first!');
        return;
    }

    if (!window.jspdf || !window.jspdf.jsPDF) {
        alert('PDF library failed to load. Please refresh and try again.');
        return;
    }

    if (!window.html2canvas) {
        showToast('❌ PDF renderer failed to load. Refresh and try again.', 'error');
        return;
    }

    const { jsPDF } = window.jspdf;
    const renderScale = Math.min(4, Math.max(3, Math.ceil(window.devicePixelRatio || 1) * 2));
    const imageFormat = 'PNG';

    const renderContainer = document.createElement('div');
    renderContainer.style.position = 'fixed';
    renderContainer.style.left = '-10000px';
    renderContainer.style.top = '0';
    renderContainer.style.width = '1024px';
    renderContainer.style.background = '#f9fafb';
    renderContainer.style.padding = '24px';
    renderContainer.innerHTML = buildReviewHTMLForPDF();
    document.body.appendChild(renderContainer);

    const fileDate = (document.getElementById('quiz-date')?.value || 'quiz-result').replace(/[^0-9-]/g, '');

    try {
        showToast('📄 Preparing PDF...');

        const doc = new jsPDF({ unit: 'mm', format: 'a4' });
        const margin = 10;
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const usableWidth = pageWidth - (margin * 2);

        const sectionsRoot = renderContainer.firstElementChild;
        const sections = sectionsRoot ? Array.from(sectionsRoot.children) : [];
        if (sections.length === 0) {
            throw new Error('No content available for PDF');
        }

        const usableHeight = pageHeight - (margin * 2);
        let currentY = margin;

        for (const section of sections) {
            const sectionCanvas = await window.html2canvas(section, {
                scale: renderScale,
                useCORS: true,
                backgroundColor: '#f9fafb'
            });

            const sectionHeightMm = (sectionCanvas.height * usableWidth) / sectionCanvas.width;

            // If the section doesn't fit on current page, start new page first
            if (currentY > margin && (currentY + sectionHeightMm > pageHeight - margin)) {
                doc.addPage();
                currentY = margin;
            }

            // If a single section is too tall for one page, fit it into one page
            if (sectionHeightMm > usableHeight) {
                if (currentY > margin) {
                    doc.addPage();
                    currentY = margin;
                }

                const scaleToFit = usableHeight / sectionHeightMm;
                const drawWidth = usableWidth * scaleToFit;
                const drawHeight = sectionHeightMm * scaleToFit;
                const xOffset = margin + ((usableWidth - drawWidth) / 2);
                const imgData = sectionCanvas.toDataURL('image/png');

                doc.addImage(imgData, imageFormat, xOffset, currentY, drawWidth, drawHeight);
                currentY += drawHeight + 3;
            } else {
                const imgData = sectionCanvas.toDataURL('image/png');
                doc.addImage(imgData, imageFormat, margin, currentY, usableWidth, sectionHeightMm);
                currentY += sectionHeightMm + 3;
            }
        }

        doc.save(`quiz-review-${fileDate}.pdf`);
        showToast('✅ PDF download started');
    } catch (error) {
        showToast('❌ Failed to download PDF', 'error');
    } finally {
        renderContainer.remove();
    }
}

function buildReviewHTMLForPDF() {
    const getCorrectIndex = (question) => {
        if (typeof question.correct === 'number') return question.correct;
        return question.options.indexOf(question.correct);
    };

    const formatAnswer = (answer, question) => {
        if (answer === 'skipped') return 'Skipped';
        if (answer === null || answer === undefined) return 'Not answered';
        if (typeof answer !== 'number' || !question.options[answer]) return 'Not answered';
        return `${String.fromCharCode(65 + answer)}. ${question.options[answer]}`;
    };

    const escapeHtml = (text) => {
        return String(text || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    };

    const correctAnswers = currentQuiz.questions.reduce((count, question, index) => {
        const answer = selectedAnswers[index];
        if (answer === 'skipped' || answer === null || answer === undefined) return count;
        return answer === getCorrectIndex(question) ? count + 1 : count;
    }, 0);

    const wrongAnswers = currentQuiz.questions.reduce((count, question, index) => {
        const answer = selectedAnswers[index];
        if (answer === 'skipped' || answer === null || answer === undefined) return count;
        return answer !== getCorrectIndex(question) ? count + 1 : count;
    }, 0);

    const skipped = selectedAnswers.filter((ans) => ans === 'skipped' || ans === null || ans === undefined).length;
    const attempted = currentQuiz.questions.length - skipped;
    const accuracy = attempted > 0 ? Math.round((correctAnswers / attempted) * 100) : 0;
    const minutes = Math.floor(secondsElapsed / 60);
    const seconds = secondsElapsed % 60;
    const timeTaken = `${minutes}:${String(seconds).padStart(2, '0')}`;
    const dateValue = document.getElementById('quiz-date')?.value || new Date().toISOString().slice(0, 10);

    const questionBlocks = currentQuiz.questions.map((question, index) => {
        const answer = selectedAnswers[index];
        const correctIndex = getCorrectIndex(question);
        const yourAnswerText = formatAnswer(answer, question);
        const correctAnswerText = formatAnswer(correctIndex, question);
        const timing = questionTimes[index]?.answerTime;

        let result = 'Wrong';
        let resultClass = 'color:#dc2626;background:#fef2f2;border:1px solid #fecaca;';

        if (answer === 'skipped' || answer === null || answer === undefined) {
            result = 'Skipped';
            resultClass = 'color:#a16207;background:#fefce8;border:1px solid #fde68a;';
        } else if (answer === correctIndex) {
            result = 'Correct';
            resultClass = 'color:#15803d;background:#f0fdf4;border:1px solid #bbf7d0;';
        }

        const optionsHTML = question.options.map((option, optionIndex) => {
            let optionStyle = 'background:#f9fafb;border:1px solid #e5e7eb;color:#1f2937;';
            let icon = '';

            if (optionIndex === correctIndex) {
                optionStyle = 'background:#dcfce7;border:1px solid #86efac;color:#166534;';
                icon = '✅ ';
            } else if (answer === optionIndex && answer !== correctIndex) {
                optionStyle = 'background:#fee2e2;border:1px solid #fca5a5;color:#991b1b;';
                icon = '❌ ';
            }

            return `
                <div style="${optionStyle}border-radius:10px;padding:10px 12px;margin-bottom:8px;font-size:14px;line-height:1.45;">
                    <strong>${String.fromCharCode(65 + optionIndex)}.</strong> ${icon}${escapeHtml(option)}
                </div>
            `;
        }).join('');

        return `
            <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:14px;padding:16px;margin-bottom:14px;page-break-inside:avoid;box-shadow:0 1px 2px rgba(0,0,0,0.04);">
                <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:12px;">
                    <div style="font-weight:700;font-size:16px;color:#111827;line-height:1.45;flex:1;">Q${index + 1}. ${escapeHtml(question.q)}</div>
                    <div style="${resultClass}display:flex;align-items:center;justify-content:center;min-width:90px;height:30px;padding:0 12px;border-radius:999px;white-space:nowrap;text-align:center;box-sizing:border-box;">
                        <span style="display:block;position:relative;top:${pdfBadgePaddingTop}px;font-size:12px;font-weight:700;line-height:1.1;text-align:center;">
                            ${escapeHtml(result)}
                        </span>
                    </div>
                </div>

                <div style="margin-bottom:10px;">
                    ${optionsHTML}
                </div>

                <div style="font-size:14px;color:#374151;margin-bottom:6px;"><strong>Your Answer:</strong> ${escapeHtml(yourAnswerText)}</div>
                <div style="font-size:14px;color:#374151;margin-bottom:6px;"><strong>Correct Answer:</strong> ${escapeHtml(correctAnswerText)}</div>
                <div style="font-size:14px;color:#1f2937;background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:10px;margin-top:8px;">
                    <strong>Explanation:</strong> ${escapeHtml(question.rationale || 'No explanation available.')}
                </div>
                ${typeof timing === 'number' ? `<div style="font-size:12px;color:#6b7280;margin-top:8px;">Time Spent: ${Math.round(timing)}s</div>` : ''}
            </div>
        `;
    }).join('');

    return `
        <div style="font-family:Inter, Arial, sans-serif;color:#111827;">
            <div style="background:linear-gradient(90deg,#4f46e5,#7c3aed);border-radius:16px;padding:20px;margin-bottom:14px;color:#ffffff;">
                <div style="font-size:24px;font-weight:700;margin-bottom:8px;">Daily Govt Exam Quiz - Review Report</div>
                <div style="font-size:14px;color:#e0e7ff;">Performance summary and question-wise explanations</div>
            </div>

            <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;padding:20px;margin-bottom:14px;">
                <div style="font-size:14px;color:#374151;line-height:1.8;">
                    <div><strong>Date:</strong> ${escapeHtml(dateValue)}</div>
                    <div><strong>Score:</strong> ${correctAnswers}/${currentQuiz.questions.length}</div>
                    <div><strong>Correct:</strong> ${correctAnswers} | <strong>Wrong:</strong> ${wrongAnswers} | <strong>Skipped:</strong> ${skipped}</div>
                    <div><strong>Accuracy:</strong> ${accuracy}% | <strong>Time Taken:</strong> ${timeTaken}</div>
                </div>
            </div>

            <div style="font-size:${pdfReviewHeadingFontSize}px;font-weight:700;line-height:1;height:36px;padding:0 14px;margin:8px 0 10px;background:#eef2ff;border:1px solid #c7d2fe;border-radius:10px;display:inline-flex;align-items:center;justify-content:center;text-align:center;">
                <span style="display:block;position:relative;top:${pdfReviewHeadingNudge}px;">Question-wise Review</span>
            </div>
            ${questionBlocks}
        </div>
    `;
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    if (!toast) return;

    toast.innerText = message;
    toast.classList.remove('hidden', 'bg-green-600', 'bg-red-600');
    toast.classList.add(type === 'error' ? 'bg-red-600' : 'bg-green-600');

    if (toastTimeout) {
        clearTimeout(toastTimeout);
    }

    toastTimeout = setTimeout(() => {
        toast.classList.add('hidden');
    }, 2500);
}

// Initialize on page load
window.addEventListener('DOMContentLoaded', () => {
    // Set default date to today
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    
    const dateInput = document.getElementById('quiz-date');
    if (dateInput) {
        dateInput.value = `${year}-${month}-${day}`;
        dateInput.addEventListener('change', hideUnavailableSection);
    }
});



function displayStreak() {
    const streakElement = document.querySelector('.bg-indigo-50.text-indigo-700');
    const currentStreak = localStorage.getItem('quizStreak') || 0;
    if (streakElement) {
        streakElement.innerHTML = `Streak: 🔥 ${currentStreak} days`;
    }
}

// Call displayStreak when the page loads
window.addEventListener('DOMContentLoaded', displayStreak);
// Function to update the daily streak and best score
function updateProgressData() {
    const today = new Date().toDateString();
    const lastQuizDate = localStorage.getItem('lastQuizDate');
    let currentStreak = Number(localStorage.getItem('quizStreak')) || 0;//let currentStreak = parseInt(localStorage.getItem('quizStreak')) || 0;
    
    // 1. Update Streak Logic
    if (lastQuizDate !== today) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        
        // If they played yesterday, increase streak; otherwise reset to 1
        if (lastQuizDate === yesterday.toDateString()) {
            currentStreak++;
        } else {
            currentStreak = 1;
        }
        localStorage.setItem('quizStreak', currentStreak.toString());//localStorage.setItem('quizStreak', currentStreak);
        localStorage.setItem('lastQuizDate', today);
    }

    // 2. Update High Score Logic
 const savedHighScore = Number(localStorage.getItem('highScore')) || 0;//const savedHighScore = parseInt(localStorage.getItem('highScore')) || 0;
    if (score > savedHighScore) {
        localStorage.setItem('highScore', score.toString());//localStorage.setItem('highScore', score);
        alert(`🎉 New High Score: ${score}!`);
    }
    
    displayProgress();
}

// Function to show the data on your website
function displayProgress() {
    const streakEl = document.querySelector('.bg-indigo-50.text-indigo-700');
    const highStreak = localStorage.getItem('quizStreak') || 0;
    if (streakEl) streakEl.innerHTML = `Streak: 🔥 ${highStreak} days`;

    // Display Best Score on the Results Dashboard
    const finalScoreContainer = document.getElementById('final-score')?.parentElement;
    if (finalScoreContainer) {
        const bestScore = localStorage.getItem('highScore') || 0;
        const bestScoreEl = document.getElementById('best-score-display') || document.createElement('div');
        bestScoreEl.id = 'best-score-display';
        bestScoreEl.className = 'text-xs text-indigo-400 mt-1';
        bestScoreEl.innerText = `Personal Best: ${bestScore}`;
        finalScoreContainer.appendChild(bestScoreEl);
    }
}

// Initialize display when page loads
window.addEventListener('DOMContentLoaded', displayProgress);
function resetUserProgress() {
    if (confirm("Are you sure you want to reset your streak and high score?")) {
        localStorage.removeItem('quizStreak');
        localStorage.removeItem('highScore');
        localStorage.removeItem('lastQuizDate');
        alert("Progress reset successfully!");
        location.reload(); // Refresh to update the UI
    }
}
