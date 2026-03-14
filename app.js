'use strict';

const SUBJECT_LABELS = {
  child_development: 'बाल विकास एवं शिक्षण विधि',
  mathematics: 'गणित',
  environmental_studies: 'पर्यावरण अध्ययन',
  language_1_hindi: 'भाषा-I (हिंदी)',
  language_2: 'भाषा-II',
};

const state = {
  allQuestions: [],
  filteredQuestions: [],
  selectedYears: new Set(['all']),
  selectedSubjects: new Set(['all']),
  order: 'sequential',
  currentIndex: 0,
  correct: 0,
  wrong: 0,
  skipped: 0,
  answered: false,
};

const el = {};

document.addEventListener('DOMContentLoaded', init);

async function init() {
  cacheElements();
  bindEvents();
  await loadDataset();
  renderFilters();
  updateSummary();
}

function cacheElements() {
  [
    'homeScreen', 'quizScreen', 'resultScreen', 'yearPills', 'subjectPills', 'datasetStatus',
    'metricQuestions', 'metricYears', 'metricSubjects', 'availableCount', 'startBtn',
    'sequentialBtn', 'randomBtn', 'topbarStats', 'scorePill', 'wrongPill', 'progressPill',
    'progressFill', 'yearBadge', 'subjectBadge', 'counterBadge', 'questionOrder', 'questionText',
    'optionsPanel', 'feedbackPanel', 'feedbackTitle', 'feedbackAnswer', 'feedbackExplanation',
    'skipBtn', 'nextBtn', 'homeBtn', 'resultPercent', 'resultCorrect', 'resultWrong',
    'resultSkipped', 'resultMessage', 'retryBtn', 'resultHomeBtn'
  ].forEach((id) => {
    el[id] = document.getElementById(id);
  });
}

function bindEvents() {
  el.sequentialBtn.addEventListener('click', () => setOrder('sequential'));
  el.randomBtn.addEventListener('click', () => setOrder('random'));
  el.startBtn.addEventListener('click', startQuiz);
  el.skipBtn.addEventListener('click', skipQuestion);
  el.nextBtn.addEventListener('click', nextQuestion);
  el.homeBtn.addEventListener('click', () => showScreen('home'));
  el.retryBtn.addEventListener('click', startQuiz);
  el.resultHomeBtn.addEventListener('click', () => showScreen('home'));
}

async function loadDataset() {
  try {
    const response = await fetch('questions.json', { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`questions.json ${response.status}`);
    }
    const data = await response.json();
    state.allQuestions = normalizeQuestions(data);
    el.datasetStatus.textContent = `डेटासेट तैयार: ${state.allQuestions.length} प्रश्न`;
  } catch (error) {
    console.error(error);
    el.datasetStatus.textContent = 'questions.json नहीं मिला';
    state.allQuestions = [];
  }
}

function normalizeQuestions(data) {
  const raw = Array.isArray(data) ? data : [];
  return raw
    .map((item, index) => ({
      id: item.id || `q_${index + 1}`,
      year: String(item.year || 'unknown'),
      question_no: Number(item.question_no || index + 1),
      subject: item.subject || 'unknown',
      question: cleanupText(item.question),
      options: normalizeOptions(item.options),
      correct_answer: typeof item.correct_answer === 'string' ? item.correct_answer.toLowerCase() : null,
      explanation: cleanupText(item.explanation),
      source_page: item.source_page || null,
    }))
    .filter((item) => item.question && Object.keys(item.options).length > 0);
}

function normalizeOptions(options) {
  const clean = {};
  for (const key of ['a', 'b', 'c', 'd']) {
    const value = cleanupText(options && options[key]);
    if (value) clean[key] = value;
  }
  return clean;
}

function cleanupText(value) {
  if (!value || typeof value !== 'string') return '';
  let text = value.replace(/\r/g, '');
  text = text.replace(/www\.[^\s]+/gi, '');
  text = text.replace(/SarkariTeachers\.com/gi, '');
  text = text.replace(/[|]{2,}/g, ' ');
  text = text.replace(/[ ]{2,}/g, ' ');
  text = text.replace(/\n{3,}/g, '\n\n');
  return text.trim();
}

function renderFilters() {
  const years = [...new Set(state.allQuestions.map((item) => item.year))].sort();
  const subjects = [...new Set(state.allQuestions.map((item) => item.subject))];

  renderPillGroup(el.yearPills, ['all', ...years], state.selectedYears, toggleYear, (value) => (
    value === 'all' ? 'सभी वर्ष' : value
  ));

  renderPillGroup(el.subjectPills, ['all', ...subjects], state.selectedSubjects, toggleSubject, (value) => (
    value === 'all' ? 'सभी विषय' : (SUBJECT_LABELS[value] || value)
  ));

  el.metricQuestions.textContent = state.allQuestions.length;
  el.metricYears.textContent = years.length;
  el.metricSubjects.textContent = subjects.length;
}

function renderPillGroup(container, values, selectedSet, handler, labelFn) {
  container.innerHTML = '';
  values.forEach((value) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `pill${selectedSet.has(value) ? ' active' : ''}`;
    button.textContent = labelFn(value);
    button.addEventListener('click', () => handler(value));
    container.appendChild(button);
  });
}

function toggleYear(value) {
  toggleSelection(state.selectedYears, value);
  renderFilters();
  updateSummary();
}

function toggleSubject(value) {
  toggleSelection(state.selectedSubjects, value);
  renderFilters();
  updateSummary();
}

function toggleSelection(set, value) {
  if (value === 'all') {
    set.clear();
    set.add('all');
    return;
  }

  set.delete('all');
  if (set.has(value)) set.delete(value);
  else set.add(value);
  if (set.size === 0) set.add('all');
}

function setOrder(order) {
  state.order = order;
  el.sequentialBtn.classList.toggle('active', order === 'sequential');
  el.randomBtn.classList.toggle('active', order === 'random');
}

function updateSummary() {
  const filtered = getFilteredQuestions();
  el.availableCount.textContent = String(filtered.length);
  el.startBtn.disabled = filtered.length === 0;
}

function getFilteredQuestions() {
  return state.allQuestions.filter((item) => {
    const yearOk = state.selectedYears.has('all') || state.selectedYears.has(item.year);
    const subjectOk = state.selectedSubjects.has('all') || state.selectedSubjects.has(item.subject);
    return yearOk && subjectOk;
  });
}

function startQuiz() {
  state.filteredQuestions = getFilteredQuestions().map((item) => ({ ...item }));
  if (state.order === 'random') shuffle(state.filteredQuestions);
  state.currentIndex = 0;
  state.correct = 0;
  state.wrong = 0;
  state.skipped = 0;
  state.answered = false;
  updateTopbar();
  showScreen('quiz');
  renderQuestion();
}

function renderQuestion() {
  const question = state.filteredQuestions[state.currentIndex];
  if (!question) {
    showResults();
    return;
  }

  state.answered = false;
  el.feedbackPanel.hidden = true;
  el.yearBadge.textContent = question.year;
  el.subjectBadge.textContent = SUBJECT_LABELS[question.subject] || question.subject;
  el.counterBadge.textContent = `${state.currentIndex + 1} / ${state.filteredQuestions.length}`;
  el.questionOrder.textContent = `प्रश्न ${question.question_no}`;
  el.questionText.textContent = question.question;
  el.progressFill.style.width = `${(state.currentIndex / state.filteredQuestions.length) * 100}%`;
  el.nextBtn.textContent = state.currentIndex === state.filteredQuestions.length - 1 ? 'परिणाम देखें' : 'अगला';

  el.optionsPanel.innerHTML = '';
  for (const key of ['a', 'b', 'c', 'd']) {
    const value = question.options[key];
    if (!value) continue;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'option-btn';
    button.innerHTML = `<span class="option-key">${key.toUpperCase()}</span><span>${value}</span>`;
    button.addEventListener('click', () => handleAnswer(key, button));
    el.optionsPanel.appendChild(button);
  }
}

function handleAnswer(choice, button) {
  if (state.answered) return;
  state.answered = true;

  const question = state.filteredQuestions[state.currentIndex];
  const correct = question.correct_answer;
  const buttons = [...el.optionsPanel.querySelectorAll('.option-btn')];
  buttons.forEach((item) => {
    item.disabled = true;
  });

  let title = 'उत्तर सेव नहीं है';
  let answerLine = 'इस प्रश्न के लिए सही उत्तर अभी उपलब्ध नहीं है।';

  if (correct) {
    if (choice === correct) {
      state.correct += 1;
      button.classList.add('correct');
      title = 'सही उत्तर';
      answerLine = `आपने सही विकल्प चुना: ${correct.toUpperCase()}`;
    } else {
      state.wrong += 1;
      button.classList.add('wrong');
      const correctButton = buttons.find((item) => item.querySelector('.option-key').textContent === correct.toUpperCase());
      if (correctButton) correctButton.classList.add('reveal');
      title = 'गलत उत्तर';
      answerLine = `सही विकल्प: ${correct.toUpperCase()}`;
    }
  } else {
    state.skipped += 1;
    button.classList.add('pending');
  }

  el.feedbackTitle.textContent = title;
  el.feedbackAnswer.textContent = answerLine;
  el.feedbackExplanation.textContent = question.explanation || 'व्याख्या उपलब्ध नहीं है।';
  el.feedbackPanel.hidden = false;
  updateTopbar();
}

function skipQuestion() {
  if (!state.answered) {
    state.skipped += 1;
    updateTopbar();
  }
  nextQuestion();
}

function nextQuestion() {
  state.currentIndex += 1;
  if (state.currentIndex >= state.filteredQuestions.length) {
    showResults();
    return;
  }
  renderQuestion();
}

function showResults() {
  const total = state.filteredQuestions.length || 1;
  const percent = Math.round((state.correct / total) * 100);
  el.progressFill.style.width = '100%';
  el.resultPercent.textContent = `${percent}%`;
  el.resultCorrect.textContent = String(state.correct);
  el.resultWrong.textContent = String(state.wrong);
  el.resultSkipped.textContent = String(state.skipped);
  el.resultMessage.textContent =
    percent >= 80 ? 'बहुत बढ़िया। इसी गति से आगे बढ़ें।' :
    percent >= 60 ? 'अच्छा स्कोर। गलत प्रश्न दोबारा देखें।' :
    'डेटासेट और अभ्यास दोनों पर और काम करने की जरूरत है।';
  showScreen('result');
}

function updateTopbar() {
  el.topbarStats.hidden = false;
  el.scorePill.textContent = `${state.correct} सही`;
  el.wrongPill.textContent = `${state.wrong} गलत`;
  el.progressPill.textContent = `${Math.min(state.currentIndex + 1, state.filteredQuestions.length)} / ${state.filteredQuestions.length}`;
}

function showScreen(name) {
  el.homeScreen.classList.toggle('active', name === 'home');
  el.quizScreen.classList.toggle('active', name === 'quiz');
  el.resultScreen.classList.toggle('active', name === 'result');
  if (name === 'home') {
    el.topbarStats.hidden = true;
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function shuffle(items) {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [items[index], items[swapIndex]] = [items[swapIndex], items[index]];
  }
}
