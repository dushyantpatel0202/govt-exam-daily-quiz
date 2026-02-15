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

// Quiz categories for analysis
const QUIZ_CATEGORIES = {
    'Global Firepower Index': ['military', 'defense', 'global power', 'rank'],
    'Budget': ['budget', '₹', 'lakh crore', 'finance', 'economic'],
    'Capital': ['capital', 'city', 'france', 'paris'],
    'Science': ['planet', 'mars', 'red planet', 'solar system'],
    'Constitution': ['fundamental', 'constitution', 'amendment', 'duties', 'rights'],
    'Current Affairs': ['current', 'recent', '2026', '2025', 'india']
};

// Initialize quiz
async function loadQuizByDate() {
    const selectedDate = document.getElementById('quiz-date').value;
    
    if (!selectedDate) {
        alert("Please select a date first!");
        return;
    }

    try {
        const dateParts = selectedDate.split('-');
        const yearShort = dateParts[0].substring(2);
        const filename = `${yearShort}-${dateParts[1]}-${dateParts[2]}.json`;
        
        const response = await fetch(`./data/${filename}`);
        
        if (!response.ok) {
            throw new Error("No quiz found for this date.");
        }

        const quizData = await response.json();
        
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
        alert(error.message);
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
        const dateParts = selectedDate.split('-');
        const yearShort = dateParts[0].substring(2);
        const filename = `${yearShort}-${dateParts[1]}-${dateParts[2]}.json`;
        
        const response = await fetch(`./data/${filename}`);
        
        if (!response.ok) {
            throw new Error("No content found for this date.");
        }

        const quizData = await response.json();
        
        // Store the quiz data for later use
        currentQuiz = quizData;
        
        // Hide other sections
        const quizContainer = document.getElementById('quiz-container');
        if (quizContainer) quizContainer.classList.add('hidden');
        
        const resultsDashboard = document.getElementById('results-dashboard');
        if (resultsDashboard) resultsDashboard.classList.add('hidden');
        
        const reviewSection = document.getElementById('review-section');
        if (reviewSection) reviewSection.classList.add('hidden');
        
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
        alert(error.message);
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