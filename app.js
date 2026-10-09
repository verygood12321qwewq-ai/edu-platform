const toast = document.querySelector('.toast');
let toastTimer;
let currentPage = 'home';

function removePhysicalEducationData() {
  try {
    const profile = JSON.parse(localStorage.getItem('baewoom-profile') || 'null');
    if (profile) {
      profile.subjects = (profile.subjects || []).filter((subject) => subject !== '체육');
      ['goals', 'publishers', 'books', 'units'].forEach((key) => {
        if (profile[key]) delete profile[key]['체육'];
      });
      localStorage.setItem('baewoom-profile', JSON.stringify(profile));
    }

    ['baewoom-practice', 'baewoom-notes'].forEach((key) => {
      const entries = JSON.parse(localStorage.getItem(key) || '[]');
      const filtered = entries.filter((entry) => entry.subject !== '체육');
      if (filtered.length !== entries.length) localStorage.setItem(key, JSON.stringify(filtered));
    });

    const insight = JSON.parse(localStorage.getItem('baewoom-ai-insight') || 'null');
    if (insight?.analysis?.focusSubject === '체육') localStorage.removeItem('baewoom-ai-insight');
  } catch {
    // Ignore invalid or unavailable local storage; normal app initialization can continue.
  }
}

removePhysicalEducationData();

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('visible'), 2400);
}

document.querySelector('.icon-button').addEventListener('click', () => {
  const exams = JSON.parse(localStorage.getItem('baewoom-exams') || '[]');
  const next = exams.sort((a, b) => a.date.localeCompare(b.date))[0];
  showToast(next ? `다가오는 시험: ${next.name} (${next.date})` : '등록된 시험과 새 알림이 없어요.');
});

const examForm = document.querySelector('#examForm');
const examName = document.querySelector('#examName');
const examDate = document.querySelector('#examDate');
const examList = document.querySelector('#examList');
const today = new Date();
today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
examDate.min = today.toISOString().slice(0, 10);

function renderExams() {
  const exams = JSON.parse(localStorage.getItem('baewoom-exams') || '[]')
    .filter((exam) => exam.date >= today.toISOString().slice(0, 10))
    .sort((a, b) => a.date.localeCompare(b.date));
  localStorage.setItem('baewoom-exams', JSON.stringify(exams));
  examList.replaceChildren();
  exams.forEach((exam) => {
    const days = Math.ceil((new Date(`${exam.date}T00:00:00`) - new Date(`${today.toISOString().slice(0, 10)}T00:00:00`)) / 86400000);
    const row = document.createElement('div');
    row.className = 'exam-item';
    const details = document.createElement('span');
    details.className = 'exam-details';
    const name = document.createElement('strong');
    name.textContent = exam.name;
    const date = document.createElement('small');
    date.textContent = exam.date.replaceAll('-', '. ');
    details.append(name, date);
    const countdown = document.createElement('span');
    countdown.className = 'countdown';
    countdown.textContent = days === 0 ? '오늘' : `D-${days}`;
    row.append(details, countdown);
    examList.append(row);
  });
}

examForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const exams = JSON.parse(localStorage.getItem('baewoom-exams') || '[]');
  exams.push({ name: examName.value.trim(), date: examDate.value });
  localStorage.setItem('baewoom-exams', JSON.stringify(exams));
  examForm.reset();
  examDate.min = today.toISOString().slice(0, 10);
  renderExams();
  showToast('시험 날짜를 등록했어요.');
});

renderExams();

function getPractice() {
  return JSON.parse(localStorage.getItem('baewoom-practice') || '[]');
}

function getWeeklyPractice(referenceDate = new Date()) {
  const weekStart = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
  const daysSinceMonday = (weekStart.getDay() + 6) % 7;
  weekStart.setDate(weekStart.getDate() - daysSinceMonday);
  const nextWeekStart = new Date(weekStart);
  nextWeekStart.setDate(nextWeekStart.getDate() + 7);
  const previousWeekStart = new Date(weekStart);
  previousWeekStart.setDate(previousWeekStart.getDate() - 7);
  const attempts = getPractice().filter((item) => {
    const date = new Date(item.date);
    return item.date && !Number.isNaN(date.getTime());
  });
  const isBetween = (item, start, end) => {
    const date = new Date(item.date);
    return date >= start && date < end;
  };
  return {
    current: attempts.filter((item) => isBetween(item, weekStart, nextWeekStart)),
    previous: attempts.filter((item) => isBetween(item, previousWeekStart, weekStart))
  };
}

function getAccuracy(attempts) {
  return attempts.length ? Math.round(attempts.filter((item) => item.isCorrect).length / attempts.length * 100) : null;
}

function renderWeeklyAccuracy() {
  const { current, previous } = getWeeklyPractice();
  const accuracy = getAccuracy(current);
  const previousAccuracy = getAccuracy(previous);
  const value = document.querySelector('#weeklyAccuracyValue');
  const ringValue = document.querySelector('#weeklyAccuracyRingValue');
  const change = document.querySelector('#weeklyAccuracyChange');
  const ring = document.querySelector('#weeklyAccuracyRing');
  const card = document.querySelector('#weeklyAccuracyCard');
  if (!value || !ringValue || !change || !ring || !card) return;

  value.textContent = accuracy === null ? '—' : accuracy;
  ringValue.textContent = accuracy === null ? '—' : accuracy;
  ring.style.background = `conic-gradient(#efae88 0 ${accuracy || 0}%, #fff0e7 ${accuracy || 0}% 100%)`;
  if (accuracy === null) {
    change.textContent = '이번 주 풀이 기록이 없어요';
  } else if (previousAccuracy === null) {
    change.textContent = `이번 주 ${current.length}문제 풀었어요 · 지난주 기록 없음`;
  } else {
    const difference = accuracy - previousAccuracy;
    change.textContent = difference > 0
      ? `지난주보다 ${difference}%p 올랐어요`
      : difference < 0
        ? `지난주보다 ${Math.abs(difference)}%p 내려갔어요`
        : '지난주와 같은 정답률이에요';
  }
  change.classList.toggle('positive', accuracy !== null && previousAccuracy !== null && accuracy >= previousAccuracy);
  card.setAttribute('aria-label', accuracy === null ? '이번 주 정답률: 아직 풀이 기록이 없어요. 학습 리포트 보기' : `이번 주 정답률 ${accuracy}퍼센트, ${current.length}문제 풀이. 학습 리포트 보기`);
}

let aiAnalysisInProgress = false;
let aiAnalysisError = '';

function getSavedAIInsight() {
  try {
    return JSON.parse(localStorage.getItem('baewoom-ai-insight') || 'null');
  } catch {
    return null;
  }
}

function renderAIInsight() {
  const attempts = getPractice();
  const saved = getSavedAIInsight();
  const hasAnalysis = Boolean(saved?.analysis?.headline);
  const latestAttemptId = attempts.at(-1)?.id || null;
  const isCurrent = hasAnalysis && saved.attemptCount === attempts.length && (saved.lastAttemptId || null) === latestAttemptId;
  const label = document.querySelector('#aiInsightLabel');
  const title = document.querySelector('#aiInsightTitle');
  const summary = document.querySelector('#aiInsightSummary');
  const next = document.querySelector('#aiInsightNext');
  const meta = document.querySelector('#aiInsightMeta');
  const analyzeButton = document.querySelector('#runAiAnalysis');
  const practiceButton = document.querySelector('#aiAction');
  if (!label || !title || !summary || !next || !meta || !analyzeButton || !practiceButton) return;

  if (hasAnalysis) {
    label.textContent = isCurrent ? '실제 AI 분석 결과' : '새 풀이 기록이 있어요 · 이전 분석';
    title.textContent = saved.analysis.headline;
    summary.textContent = saved.analysis.summary;
    next.textContent = [
      saved.analysis.evidence,
      saved.analysis.nextStep,
      saved.analysis.exercise ? `추천 연습: ${saved.analysis.exercise}` : ''
    ].filter(Boolean).join(' ');
    next.hidden = !next.textContent;
    meta.textContent = [saved.analysis.focusSubject, saved.analysis.focusUnit].filter(Boolean).join(' · ') || `${saved.attemptCount}문제 분석`;
  } else {
    label.textContent = attempts.length ? `${attempts.length}개 풀이 기록 · 분석 준비 완료` : '학습 기록을 기다리고 있어요';
    title.textContent = attempts.length ? '실제 AI 분석을 시작해 보세요' : '학습 기록을 AI로 분석해요';
    summary.textContent = attempts.length
      ? '최근 문제 풀이를 바탕으로 자주 틀리는 과목과 단원을 분석합니다.'
      : '문제 풀이 결과가 쌓이면 과목과 단원별로 약점을 찾아드려요.';
    next.textContent = '';
    next.hidden = true;
    meta.textContent = attempts.length ? 'AI 서버에 연결하면 분석할 수 있어요.' : '문제를 풀면 분석을 시작할 수 있어요.';
  }
  if (aiAnalysisError) {
    label.textContent = 'AI 서버에 연결하지 못했어요';
    title.textContent = '분석 서버를 확인해 주세요';
    summary.textContent = aiAnalysisError;
    next.textContent = 'API 키는 웹페이지에 입력하지 말고 서버 환경변수에 설정해 주세요.';
    next.hidden = false;
  }
  analyzeButton.disabled = attempts.length === 0 || aiAnalysisInProgress;
  analyzeButton.textContent = aiAnalysisInProgress ? '분석 중…' : hasAnalysis ? '다시 분석하기 ✦' : 'AI 분석 시작 ✦';
  practiceButton.disabled = attempts.length === 0;
}

async function requestAIAnalysis() {
  const attempts = getPractice();
  if (!attempts.length || aiAnalysisInProgress) return;
  const profile = JSON.parse(localStorage.getItem('baewoom-profile') || 'null');
  aiAnalysisInProgress = true;
  aiAnalysisError = '';
  renderAIInsight();
  try {
    const endpoint = location.protocol === 'file:'
      ? 'http://127.0.0.1:8787/api/weakness-analysis'
      : '/api/weakness-analysis';
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        level: profile?.level || '',
        grade: profile?.grade || '',
        attempts: attempts.slice(-60).map((item) => ({
          subject: item.subject,
          unit: item.unit || '',
          question: item.question || '',
          selectedAnswer: item.selectedAnswer || '',
          correctAnswer: item.correctAnswer || '',
          explanation: item.explanation || '',
          concept: item.concept || '',
          isCorrect: Boolean(item.isCorrect),
          date: item.date || ''
        }))
      })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'AI 분석 서버에 연결할 수 없어요.');
    if (!result.analysis?.headline || !result.analysis?.summary) throw new Error('AI 분석 결과를 읽지 못했어요. 다시 시도해 주세요.');
    localStorage.setItem('baewoom-ai-insight', JSON.stringify({ attemptCount: attempts.length, lastAttemptId: attempts.at(-1)?.id || null, createdAt: Date.now(), analysis: result.analysis }));
    showToast('실제 학습 기록으로 AI 약점 분석을 마쳤어요.');
  } catch (error) {
    aiAnalysisError = error instanceof TypeError
      ? 'AI 서버가 실행 중인지 확인해 주세요. 먼저 프로젝트 폴더에서 node server.mjs를 실행해 주세요.'
      : error.message || '서버가 실행 중인지 확인해 주세요.';
  } finally {
    aiAnalysisInProgress = false;
    renderAIInsight();
  }
}

function renderReport() {
  const attempts = getPractice();
  const correct = attempts.filter((item) => item.isCorrect).length;
  const notes = JSON.parse(localStorage.getItem('baewoom-notes') || '[]');
  const notedAttemptIds = new Set(notes.map((note) => note.attemptId).filter(Boolean));
  const unnotedWrong = attempts.filter((item) => !item.isCorrect && !notedAttemptIds.has(item.id)).length;
  const wrong = notes.length + unnotedWrong;
  const accuracy = attempts.length ? Math.round(correct / attempts.length * 100) : 0;
  const subjectCounts = new Map();
  attempts.filter((item) => !item.isCorrect).forEach((item) => subjectCounts.set(item.subject, (subjectCounts.get(item.subject) || 0) + 1));
  const weakness = [...subjectCounts.entries()].sort((a, b) => b[1] - a[1])[0];
  const host = document.querySelector('#reportSummary');
  host.replaceChildren();
  const items = [
    ['푼 문제', `${attempts.length}개`],
    ['정답', `${correct}개`],
    ['정답률', `${accuracy}%`],
    ['다시 볼 문제', weakness ? `${weakness[0]} ${weakness[1]}개` : '아직 없어요']
  ];
  items.forEach(([label, value]) => {
    const card = document.createElement('div');
    card.className = 'report-stat';
    const caption = document.createElement('span');
    caption.textContent = label;
    const number = document.createElement('strong');
    number.textContent = value;
    card.append(caption, number);
    host.append(card);
  });
  const navCount = document.querySelector('#wrongCount');
  navCount.textContent = wrong;

  const weeklyReport = document.querySelector('#weeklyReport');
  const { current, previous } = getWeeklyPractice();
  const weeklyAccuracy = getAccuracy(current);
  const previousAccuracy = getAccuracy(previous);
  weeklyReport.replaceChildren();
  const heading = document.createElement('div');
  heading.className = 'weekly-report-heading';
  const title = document.createElement('h3');
  title.textContent = '이번 주 과목별 정답률';
  const period = document.createElement('span');
  period.textContent = `${current.length}문제 풀이`;
  heading.append(title, period);
  weeklyReport.append(heading);

  if (!current.length) {
    const empty = document.createElement('p');
    empty.className = 'weekly-report-empty';
    empty.textContent = '이번 주 학습 기록이 없어요. 문제를 풀면 과목별 결과가 여기에 표시돼요.';
    weeklyReport.append(empty);
    return;
  }

  const total = document.createElement('p');
  total.className = 'weekly-report-total';
  total.textContent = previousAccuracy === null
    ? `이번 주 전체 정답률 ${weeklyAccuracy}% · 지난주와 비교하려면 지난주에도 문제를 풀어 주세요.`
    : weeklyAccuracy === previousAccuracy
      ? `이번 주 전체 정답률 ${weeklyAccuracy}% · 지난주와 같은 정답률이에요.`
      : `이번 주 전체 정답률 ${weeklyAccuracy}% · 지난주보다 ${Math.abs(weeklyAccuracy - previousAccuracy)}%p ${weeklyAccuracy > previousAccuracy ? '높아요' : '낮아요'}.`;
  weeklyReport.append(total);

  const bySubject = new Map();
  current.forEach((item) => {
    const subject = item.subject || '과목 미지정';
    const itemsForSubject = bySubject.get(subject) || [];
    itemsForSubject.push(item);
    bySubject.set(subject, itemsForSubject);
  });
  const rows = document.createElement('div');
  rows.className = 'weekly-subject-list';
  [...bySubject.entries()].sort((a, b) => a[0].localeCompare(b[0], 'ko')).forEach(([subject, itemsForSubject]) => {
    const row = document.createElement('div');
    row.className = 'weekly-subject-row';
    const info = document.createElement('div');
    info.className = 'weekly-subject-info';
    const name = document.createElement('strong');
    name.textContent = subject;
    const count = document.createElement('small');
    count.textContent = `${itemsForSubject.filter((item) => item.isCorrect).length}/${itemsForSubject.length} 정답`;
    info.append(name, count);
    const track = document.createElement('span');
    track.className = 'weekly-subject-track';
    track.setAttribute('role', 'img');
    const subjectAccuracy = getAccuracy(itemsForSubject);
    track.setAttribute('aria-label', `${subject} 정답률 ${subjectAccuracy}%`);
    const fill = document.createElement('i');
    fill.style.width = `${subjectAccuracy}%`;
    track.append(fill);
    const percent = document.createElement('strong');
    percent.className = 'weekly-subject-percent';
    percent.textContent = `${subjectAccuracy}%`;
    row.append(info, track, percent);
    rows.append(row);
  });
  weeklyReport.append(rows);
}

function navigateTo(page) {
  const map = {
    home: ['오늘의 학습', '#home'],
    subjects: ['과목 둘러보기', '#subjects'],
    notes: ['나의 오답노트', '#notes'],
    report: ['학습 리포트', '#reportPanel']
  };
  const [label, target] = map[page] || map.home;
  currentPage = page;
  document.querySelector('#subjectPage').hidden = page !== 'subjects';
  document.querySelector('#notesPage').hidden = page !== 'notes';
  document.querySelector('.main-content').hidden = page === 'subjects' || page === 'notes';
  document.querySelector('.app-shell').hidden = page === 'subjects' || page === 'notes';
  document.querySelector('#breadcrumbCurrent').textContent = label;
  document.querySelectorAll('.nav-item').forEach((item) => item.classList.toggle('active', item.dataset.page === page || (!item.dataset.page && page === 'home')));
  document.querySelector('#reportPanel').hidden = page !== 'report';
  if (page === 'notes') {
    renderNotesPage();
    history.pushState({ page: 'notes' }, '', `${location.pathname}#notes`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }
  if (page === 'report') renderReport();
  if (page === 'subjects') {
    renderSubjectPage();
    history.pushState({ page: 'subjects' }, '', `${location.pathname}#subjects`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }
  document.querySelector('#notesPage').hidden = true;
  document.querySelector('.app-shell').hidden = false;
  const destination = document.querySelector(target);
  destination?.scrollIntoView({ behavior: 'smooth', block: page === 'report' ? 'center' : 'start' });
  history.replaceState(null, '', page === 'home' ? location.pathname : `${location.pathname}${target}`);
}

function renderSubjectPage(selectedSubject = '') {
  const profile = JSON.parse(localStorage.getItem('baewoom-profile') || 'null');
  const pageGrid = document.querySelector('#subjectPageGrid');
  pageGrid.replaceChildren();
  const subjects = profile?.subjects?.length ? profile.subjects : ['국어', '수학', '영어', '사회', '과학'];
  const search = document.querySelector('#subjectSearch').value.trim().toLocaleLowerCase('ko');
  document.querySelector('#subjectPageSubtitle').textContent = profile
    ? `${profile.level} ${profile.grade} · 선택한 과목 ${subjects.length}개`
    : '과목을 골라 개념과 문제 풀이를 시작해 보세요.';
  subjects.forEach((subject) => {
    if (search && !subject.toLocaleLowerCase('ko').includes(search)) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'subject-page-card';
    button.classList.toggle('selected', subject === selectedSubject);
    const icon = document.createElement('span');
    icon.className = 'subject-icon math';
    icon.textContent = subject === '수학' ? '∑' : subject === '영어' ? 'Aa' : '✳';
    const name = document.createElement('strong');
    name.textContent = subject;
    const meta = document.createElement('small');
    meta.textContent = profile ? `${profile.level} ${profile.grade} · 목표 ${profile.goals[subject] || 90}점` : '과목 선택 후 프로필 설정 가능';
    const arrow = document.createElement('span');
    arrow.className = 'row-arrow';
    arrow.textContent = '→';
    button.append(icon, name, meta, arrow);
    button.addEventListener('click', () => renderSubjectPage(subject));
    pageGrid.append(button);
  });
  const detail = document.querySelector('#subjectDetail');
  detail.replaceChildren();
  if (!selectedSubject) {
    const eyebrow = document.createElement('p');
    eyebrow.className = 'eyebrow';
    eyebrow.textContent = 'CHOOSE A SUBJECT';
    const title = document.createElement('h2');
    title.textContent = '공부할 과목을 선택해 주세요';
    const text = document.createElement('p');
    text.textContent = '과목을 선택하면 추천 단원과 학습을 시작할 수 있어요.';
    detail.append(eyebrow, title, text);
    renderSubjectControls(subjects);
    return;
  }
  const catalog = getTextbookCatalog(profile, selectedSubject);
  const savedUnit = profile?.units?.[selectedSubject] || '';
  const lesson = catalog?.units.find((unit) => unit.title === savedUnit) || catalog?.units[0] || { title: savedUnit || '교과서 맞춤 자료 연결 준비', concept: '' };
  const eyebrow = document.createElement('p');
  eyebrow.className = 'eyebrow';
  eyebrow.textContent = catalog ? 'PUBLISHER TEXTBOOK · VERIFIED UNIT' : 'TEXTBOOK UNIT';
  const title = document.createElement('h2');
  title.textContent = lesson.title;
  const text = document.createElement('p');
  text.textContent = catalog ? lesson.concept : '선택한 교재의 출판사별 단원 자료가 아직 연결되지 않았어요. 교과서에서 현재 단원명을 입력하면 학습 기록과 연습에 사용할 수 있어요.';
  const publisherInfo = document.createElement('p');
  publisherInfo.className = 'publisher-detail';
  publisherInfo.textContent = `선택한 교과서: ${[profile?.publishers?.[selectedSubject], profile?.books?.[selectedSubject]].filter(Boolean).join(' · ') || '출판사와 교재명을 아직 입력하지 않았어요'}`;
  const unitLabel = document.createElement('label');
  unitLabel.className = 'textbook-unit-label';
  unitLabel.textContent = catalog ? '학습할 교과서 단원' : '교과서에 적힌 현재 단원';
  const unitControl = catalog ? document.createElement('select') : document.createElement('input');
  unitControl.className = 'textbook-unit-control';
  unitControl.setAttribute('aria-label', `${selectedSubject} 교과서 단원`);
  if (catalog) {
    catalog.units.forEach((unit) => unitControl.append(new Option(unit.title, unit.title)));
    unitControl.value = catalog.units.some((unit) => unit.title === savedUnit) ? savedUnit : catalog.units[0].title;
    if (unitControl.value !== savedUnit) {
      profile.units ||= {};
      profile.units[selectedSubject] = unitControl.value;
      localStorage.setItem('baewoom-profile', JSON.stringify(profile));
    }
    unitControl.addEventListener('change', () => {
      const updated = JSON.parse(localStorage.getItem('baewoom-profile') || 'null');
      updated.units ||= {};
      updated.units[selectedSubject] = unitControl.value;
      localStorage.setItem('baewoom-profile', JSON.stringify(updated));
      renderSubjectPage(selectedSubject);
    });
  } else {
    unitControl.type = 'text';
    unitControl.maxLength = 80;
    unitControl.placeholder = '예: 교과서에 적힌 단원명';
    unitControl.value = savedUnit;
  }
  unitLabel.append(unitControl);
  let saveUnit = null;
  if (!catalog) {
    saveUnit = document.createElement('button');
    saveUnit.type = 'button';
    saveUnit.className = 'unit-save';
    saveUnit.textContent = '단원 저장';
    saveUnit.addEventListener('click', () => {
      const title = unitControl.value.trim();
      if (!title) return showToast('교과서에 적힌 단원명을 입력해 주세요.');
      const updated = JSON.parse(localStorage.getItem('baewoom-profile') || 'null');
      updated.units ||= {};
      updated.units[selectedSubject] = title;
      localStorage.setItem('baewoom-profile', JSON.stringify(updated));
      showToast('단원을 저장했어요. 교재별 학습 자료는 확인 후 연결할게요.');
      renderSubjectPage(selectedSubject);
    });
  }
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'primary-button';
  button.textContent = '이 단원 학습하기 →';
  button.addEventListener('click', () => openLesson(selectedSubject));
  const goalLabel = document.createElement('label');
  goalLabel.className = 'goal-edit';
  goalLabel.textContent = '목표 점수';
  const goalInput = document.createElement('input');
  goalInput.type = 'number';
  goalInput.min = '0';
  goalInput.max = '100';
  goalInput.value = profile?.goals?.[selectedSubject] || 90;
  goalInput.setAttribute('aria-label', `${selectedSubject} 목표 점수`);
  const goalSave = document.createElement('button');
  goalSave.type = 'button';
  goalSave.className = 'goal-save';
  goalSave.textContent = '저장';
  goalSave.addEventListener('click', () => {
    const updated = JSON.parse(localStorage.getItem('baewoom-profile') || 'null') || { level: '중학교', grade: '1학년', subjects: [], goals: {} };
    updated.goals ||= {};
    updated.goals[selectedSubject] = Math.max(0, Math.min(100, Number(goalInput.value) || 0));
    localStorage.setItem('baewoom-profile', JSON.stringify(updated));
    showToast(`${selectedSubject} 목표 점수를 저장했어요.`);
    renderSubjectPage(selectedSubject);
  });
  goalLabel.append(goalInput, document.createTextNode('점'), goalSave);
  const publisherSearch = document.createElement('a');
  publisherSearch.className = 'publisher-detail-search';
  const query = `${profile?.school || ''} ${profile?.level || ''} ${profile?.grade || ''} ${selectedSubject} ${profile?.publishers?.[selectedSubject] || ''} ${profile?.books?.[selectedSubject] || ''} 교과서 목차`;
  publisherSearch.href = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
  publisherSearch.target = '_blank';
  publisherSearch.rel = 'noopener';
  publisherSearch.textContent = catalog ? '공식 교과서 목차 확인 ↗' : '출판사·교재 정보 인터넷에서 찾기 ↗';
  if (catalog) publisherSearch.href = catalog.source;
  detail.append(eyebrow, title, text, publisherInfo, unitLabel);
  if (saveUnit) detail.append(saveUnit);
  detail.append(publisherSearch, goalLabel, button);
  renderSubjectControls(subjects);
}

function renderSubjectControls(subjects) {
  const profile = JSON.parse(localStorage.getItem('baewoom-profile') || 'null');
  const selector = document.querySelector('#addSubjectSelect');
  const all = profile && levels[profile.level] ? levels[profile.level].subjects : ['국어', '수학', '영어', '사회', '역사', '도덕', '과학', '기술·가정', '정보', '음악', '미술'];
  selector.replaceChildren(new Option('과목 추가하기', ''));
  all.filter((item) => !subjects.includes(item)).forEach((item) => selector.append(new Option(item, item)));
}

function renderNotesPage() {
  const profile = JSON.parse(localStorage.getItem('baewoom-profile') || 'null');
  const subjects = profile?.subjects?.length ? profile.subjects : ['국어', '수학', '영어', '과학'];
  const selector = document.querySelector('#noteSubject');
  selector.replaceChildren(...subjects.map((subject) => new Option(subject, subject)));
  const entries = JSON.parse(localStorage.getItem('baewoom-notes') || '[]').sort((a, b) => b.createdAt - a.createdAt);
  const list = document.querySelector('#notesList');
  list.replaceChildren();
  document.querySelector('#noteTotal').textContent = `${entries.length}개`;
  if (!entries.length) {
    const empty = document.createElement('div');
    empty.className = 'notes-empty';
    empty.textContent = '아직 저장한 오답이 없어요. 왼쪽에서 첫 메모를 추가해 보세요.';
    list.append(empty);
    return;
  }
  entries.forEach((entry) => {
    const card = document.createElement('article');
    card.className = 'note-entry';
    const meta = document.createElement('div');
    meta.className = 'note-entry-meta';
    const subject = document.createElement('span');
    subject.textContent = entry.source === 'auto' ? `${entry.subject} · 자동 기록` : entry.subject;
    if (entry.source === 'auto') subject.classList.add('auto-note-tag');
    const date = document.createElement('time');
    date.textContent = new Date(entry.createdAt).toLocaleDateString('ko-KR');
    meta.append(subject, date);
    const title = document.createElement('h3');
    title.textContent = entry.title;
    const body = document.createElement('p');
    body.textContent = entry.body;
    const remove = document.createElement('button');
    remove.className = 'delete-note';
    remove.type = 'button';
    remove.textContent = '삭제';
    remove.addEventListener('click', () => {
      const current = JSON.parse(localStorage.getItem('baewoom-notes') || '[]').filter((item) => item.id !== entry.id);
      localStorage.setItem('baewoom-notes', JSON.stringify(current));
      renderNotesPage();
    });
    card.append(meta, title, body, remove);
    list.append(card);
  });
}

document.querySelectorAll('.nav-item').forEach((item) => {
  item.addEventListener('click', (event) => {
    event.preventDefault();
    navigateTo(item.dataset.page || 'home');
  });
});
document.querySelector('#subjectBack').addEventListener('click', () => navigateTo('home'));
document.querySelector('.text-link[href="#subjects"]').addEventListener('click', (event) => {
  event.preventDefault();
  navigateTo('subjects');
});
window.addEventListener('popstate', () => {
  const page = location.hash === '#subjects' ? 'subjects' : location.hash === '#notes' ? 'notes' : ['#reportPanel', '#progress'].includes(location.hash) ? 'report' : 'home';
  currentPage = page;
  document.querySelector('#subjectPage').hidden = page !== 'subjects';
  document.querySelector('#notesPage').hidden = page !== 'notes';
  document.querySelector('.main-content').hidden = page === 'subjects' || page === 'notes';
  document.querySelector('.app-shell').hidden = page === 'subjects' || page === 'notes';
  document.querySelector('#reportPanel').hidden = page !== 'report';
  document.querySelectorAll('.nav-item').forEach((item) => item.classList.toggle('active', item.dataset.page === page));
  document.querySelector('#breadcrumbCurrent').textContent = page === 'subjects' ? '과목 둘러보기' : page === 'notes' ? '나의 오답노트' : page === 'report' ? '학습 리포트' : '오늘의 학습';
  if (page === 'subjects') renderSubjectPage();
  if (page === 'notes') renderNotesPage();
  if (page === 'report') renderReport();
});
document.querySelector('.brand').addEventListener('click', (event) => {
  event.preventDefault();
  navigateTo('home');
});
document.querySelector('#helpCard').addEventListener('click', (event) => {
  event.preventDefault();
  event.stopPropagation();
  const profile = JSON.parse(localStorage.getItem('baewoom-profile') || 'null');
  openLesson(profile?.subjects?.[0] || '수학');
});
document.querySelector('#helpCard').addEventListener('keydown', (event) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    const profile = JSON.parse(localStorage.getItem('baewoom-profile') || 'null');
    openLesson(profile?.subjects?.[0] || '수학');
  }
});
document.querySelector('#helpLink').addEventListener('click', (event) => {
  event.preventDefault();
  event.stopPropagation();
  const profile = JSON.parse(localStorage.getItem('baewoom-profile') || 'null');
  openLesson(profile?.subjects?.[0] || '수학');
});
document.querySelector('#weeklyAccuracyCard').addEventListener('click', () => navigateTo('report'));
renderWeeklyAccuracy();
renderReport();

const onboarding = document.querySelector('#onboarding');
const appShell = document.querySelector('.app-shell');
const profileForm = document.querySelector('#profileForm');
const gradeSelect = document.querySelector('#gradeSelect');
const subjectChoices = document.querySelector('#subjectChoices');
const goalScoreFields = document.querySelector('#goalScoreFields');
const levels = {
  '초등학교': { grades: ['1학년', '2학년', '3학년', '4학년', '5학년', '6학년'], subjects: ['국어', '수학', '사회', '과학', '영어', '도덕', '실과', '음악', '미술'] },
  '중학교': { grades: ['1학년', '2학년', '3학년'], subjects: ['국어', '수학', '영어', '사회', '역사', '도덕', '과학', '기술·가정', '정보', '음악', '미술'] },
  '고등학교': { grades: ['1학년', '2학년', '3학년'], subjects: ['국어', '수학', '영어', '한국사', '통합사회', '통합과학', '물리학', '화학', '생명과학', '지구과학', '정보'] }
};
const publisherChoices = ['교학사', '금성출판사', '다락원', '동아출판', '디딤돌교육', '미진사', '미래엔', '비상교육', '삼양미디어', '서울교과서', '씨마스', '아이스크림미디어', '엔이능률', '와이비엠(YBM)', '지학사', '천재교육', '천재교과서', '한국과학창의재단', '해냄에듀', '기타/직접 입력'];
const schoolNameInput = document.querySelector('#schoolName');
const schoolVerifyButton = document.querySelector('#verifySchool');
const schoolVerifyStatus = document.querySelector('#schoolVerifyStatus');
const schoolVerifyResults = document.querySelector('#schoolVerifyResults');
let verifiedSchool = null;

function clearSchoolVerification(message = '학교 이름을 입력하고 실제 학교인지 확인해 보세요.') {
  verifiedSchool = null;
  schoolVerifyResults.replaceChildren();
  schoolVerifyStatus.textContent = message;
  schoolVerifyStatus.classList.remove('verified', 'not-found', 'error');
}

function getSchoolLookupEndpoint() {
  return location.protocol === 'file:'
    ? 'http://127.0.0.1:8787/api/school-lookup'
    : '/api/school-lookup';
}

schoolVerifyButton.addEventListener('click', async () => {
  const name = schoolNameInput.value.trim();
  if (name.length < 2) {
    clearSchoolVerification('학교 이름을 두 글자 이상 입력해 주세요.');
    return;
  }

  schoolVerifyButton.disabled = true;
  schoolVerifyStatus.textContent = '나이스(NEIS) 학교 정보에서 확인하고 있어요…';
  schoolVerifyStatus.classList.remove('verified', 'not-found', 'error');
  schoolVerifyResults.replaceChildren();
  try {
    const level = profileForm.querySelector('input[name="level"]:checked')?.value || '';
    const params = new URLSearchParams({ name, level });
    const response = await fetch(`${getSchoolLookupEndpoint()}?${params}`);
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || '학교 정보를 확인하지 못했어요.');

    if (!result.matches?.length) {
      schoolVerifyStatus.textContent = '등록된 학교를 찾지 못했어요. 학교 이름이나 학교급을 다시 확인해 주세요.';
      schoolVerifyStatus.classList.add('not-found');
      return;
    }

    schoolVerifyStatus.textContent = result.matches.some((school) => school.exact)
      ? '공식 학교 정보에서 이름이 일치하는 학교를 찾았어요. 지역을 골라 주세요.'
      : '비슷한 학교 이름을 찾았어요. 정확히 일치하는 학교가 있는지 확인해 주세요.';
    schoolVerifyStatus.classList.add(result.matches.some((school) => school.exact) ? 'verified' : 'not-found');
    result.matches.forEach((school) => {
      const item = document.createElement('div');
      item.className = 'school-match';
      const details = document.createElement('span');
      details.textContent = [school.name, school.level, school.address].filter(Boolean).join(' · ');
      const choose = document.createElement('button');
      choose.type = 'button';
      choose.textContent = '이 학교 선택';
      choose.disabled = !school.exact;
      choose.title = school.exact ? '이 학교 이름으로 프로필을 설정합니다.' : '학교 이름이 정확히 일치하는 결과만 선택할 수 있어요.';
      choose.addEventListener('click', () => {
        verifiedSchool = school;
        schoolNameInput.value = school.name;
        schoolVerifyStatus.textContent = `확인 완료 · ${school.name} (${school.level})`;
        schoolVerifyStatus.classList.remove('not-found', 'error');
        schoolVerifyStatus.classList.add('verified');
        schoolVerifyResults.replaceChildren();
      });
      item.append(details, choose);
      schoolVerifyResults.append(item);
    });
  } catch (error) {
    schoolVerifyStatus.textContent = error instanceof TypeError
      ? '학교 확인 서버에 연결하지 못했어요. node server.mjs와 NEIS_API_KEY 설정을 확인해 주세요.'
      : error.message || '학교 정보를 확인하지 못했어요.';
    schoolVerifyStatus.classList.add('error');
  } finally {
    schoolVerifyButton.disabled = false;
  }
});

schoolNameInput.addEventListener('input', () => clearSchoolVerification());

function makeOption(value, label) {
  const option = document.createElement('option');
  option.value = value;
  option.textContent = label;
  return option;
}

function updateGradeOptions(level, selectedGrade = '') {
  gradeSelect.replaceChildren(makeOption('', '학년 선택'));
  if (!level || !levels[level]) return;
  levels[level].grades.forEach((grade) => gradeSelect.append(makeOption(grade, grade)));
  gradeSelect.value = selectedGrade;
  updateSubjects(level, selectedGrade);
}

function updateSubjects(level, grade, selected = [], savedPublishers = {}, savedBooks = {}, savedConfirmations = {}) {
  subjectChoices.replaceChildren();
  goalScoreFields.replaceChildren();
  if (!level || !grade) {
    const hint = document.createElement('span');
    hint.className = 'choice-hint';
    hint.textContent = '학교급과 학년을 선택하면 과목이 표시돼요.';
    subjectChoices.append(hint);
    goalScoreFields.innerHTML = '<span class="choice-hint">과목을 고르면 목표 점수를 설정할 수 있어요.</span>';
    renderPublisherFields([]);
    return;
  }
  levels[level].subjects.forEach((subject) => {
    const label = document.createElement('label');
    label.className = 'subject-choice';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.name = 'subjects';
    checkbox.value = subject;
    checkbox.checked = selected.includes(subject);
    const text = document.createElement('span');
    text.textContent = subject;
    label.append(checkbox, text);
    subjectChoices.append(label);
  });
  updateGoalFields(selected);
  renderPublisherFields(selected, savedPublishers, savedBooks, savedConfirmations);
}

function renderPublisherFields(subjects, savedPublishers = {}, savedBooks = {}, savedConfirmations = {}) {
  const host = document.querySelector('#publisherFields');
  host.replaceChildren();
  if (!subjects.length) {
    const hint = document.createElement('span');
    hint.className = 'choice-hint';
    hint.textContent = '과목을 고르면 출판사를 선택할 수 있어요.';
    host.append(hint);
    return;
  }
  subjects.forEach((subject) => {
    const row = document.createElement('div');
    row.className = 'publisher-row';
    row.dataset.confirmed = savedConfirmations[subject] ? 'true' : 'false';
    const name = document.createElement('strong');
    name.textContent = subject;
    const select = document.createElement('select');
    select.name = `publisher-${subject}`;
    select.setAttribute('aria-label', `${subject} 교과서 출판사`);
    select.append(new Option('출판사 선택 (선택 사항)', ''));
    publisherChoices.forEach((publisher) => select.append(new Option(publisher, publisher)));
    const saved = savedPublishers[subject] || '';
    if (saved && !publisherChoices.includes(saved)) select.value = '기타/직접 입력';
    else select.value = saved;
    const custom = document.createElement('input');
    custom.className = 'custom-publisher';
    custom.name = `customPublisher-${subject}`;
    custom.placeholder = '출판사 이름 입력';
    custom.value = saved && !publisherChoices.includes(saved) ? saved : '';
    custom.hidden = true;
    const book = document.createElement('input');
    book.className = 'textbook-name';
    book.name = `textbook-${subject}`;
    book.placeholder = '교과서 이름·저자 (예: 수학2 권오남)';
    book.value = savedBooks[subject] || '';
    book.setAttribute('aria-label', `${subject} 교과서 이름과 저자`);
    book.hidden = true;
    const pickerButton = document.createElement('button');
    pickerButton.type = 'button';
    pickerButton.className = 'publisher-picker-button';
    pickerButton.dataset.subject = subject;
    pickerButton.textContent = saved
      ? `${saved}${book.value ? ` · ${book.value}` : ''} ${row.dataset.confirmed === 'true' ? '확인 완료 ✓' : '내 교과서 확인하기 ↗'}`
      : '내 교과서 확인하기 ↗';
    pickerButton.setAttribute('aria-label', `${subject} 교과서 출판사와 책 고르기`);
    pickerButton.addEventListener('click', () => openTextbookBrowser(subject));
    row.append(name, select, custom, book, pickerButton);
    host.append(row);
  });
}

function readPublisherFormValues() {
  const publishers = {};
  const books = {};
  const confirmations = {};
  document.querySelectorAll('#publisherFields .publisher-row').forEach((row) => {
    const select = row.querySelector('select');
    const custom = row.querySelector('.custom-publisher');
    const subject = select.name.replace('publisher-', '');
    const publisher = select.value === '기타/직접 입력' ? custom.value.trim() : select.value;
    const book = row.querySelector('.textbook-name')?.value.trim() || '';
    if (publisher) publishers[subject] = publisher;
    if (book) books[subject] = book;
    if (row.dataset.confirmed === 'true' && publisher && book) confirmations[subject] = true;
  });
  return { publishers, books, confirmations };
}

const publisherShowcaseBooks = [
  { level: '초등학교', grade: '3학년', subject: '수학', semester: '1학기', publisher: '동아출판', title: '수학 3-1', author: '나귀수', source: 'https://www.aidtshow.kr/', sourceLabel: '웹전시본 보기 ↗' },
  { level: '초등학교', grade: '3학년', subject: '수학', semester: '1학기', publisher: '디딤돌교육', title: '수학 3-1', author: '최수일', source: 'https://www.aidtshow.kr/', sourceLabel: '웹전시본 보기 ↗' },
  { level: '초등학교', grade: '3학년', subject: '수학', semester: '1학기', publisher: '비상교육', title: '수학 3-1', author: '방정숙', source: 'https://www.aidtshow.kr/', sourceLabel: '웹전시본 보기 ↗' },
  { level: '초등학교', grade: '3학년', subject: '수학', semester: '1학기', publisher: '아이스크림미디어', title: '수학 3-1', author: '김성여', source: 'https://www.aidtshow.kr/', sourceLabel: '웹전시본 보기 ↗' },
  { level: '초등학교', grade: '3학년', subject: '수학', semester: '1학기', publisher: '와이비엠(YBM)', title: '수학 3-1', author: '류희찬', source: 'https://www.aidtshow.kr/', sourceLabel: '웹전시본 보기 ↗' },
  { level: '초등학교', grade: '3학년', subject: '수학', semester: '1학기', publisher: '지학사', title: '수학 3-1', author: '강문봉', source: 'https://www.aidtshow.kr/', sourceLabel: '웹전시본 보기 ↗' },
  { level: '초등학교', grade: '3학년', subject: '수학', semester: '1학기', publisher: '천재교과서', title: '수학 3-1 (박)', author: '박만구', source: 'https://www.aidtshow.kr/', sourceLabel: '웹전시본 보기 ↗' },
  { level: '초등학교', grade: '3학년', subject: '수학', semester: '1학기', publisher: '천재교과서', title: '수학 3-1 (한)', author: '한대희', source: 'https://www.aidtshow.kr/', sourceLabel: '웹전시본 보기 ↗' },
  { level: '초등학교', grade: '3학년', subject: '수학', semester: '2학기', publisher: '동아출판', title: '수학 3-2', author: '나귀수', source: 'https://www.aidtshow.kr/', sourceLabel: '웹전시본 보기 ↗' },
  { level: '초등학교', grade: '3학년', subject: '수학', semester: '2학기', publisher: '디딤돌교육', title: '수학 3-2', author: '최수일', source: 'https://www.aidtshow.kr/', sourceLabel: '웹전시본 보기 ↗' },
  { level: '초등학교', grade: '3학년', subject: '수학', semester: '2학기', publisher: '비상교육', title: '수학 3-2', author: '방정숙', source: 'https://www.aidtshow.kr/', sourceLabel: '웹전시본 보기 ↗' },
  { level: '초등학교', grade: '3학년', subject: '수학', semester: '2학기', publisher: '아이스크림미디어', title: '수학 3-2', author: '김성여', source: 'https://www.aidtshow.kr/', sourceLabel: '웹전시본 보기 ↗' },
  { level: '중학교', grade: '2학년', subject: '수학', semester: '전학기', publisher: '엔이능률', title: '수학2', author: '권오남 저', source: 'https://m.neteacher.co.kr/math/pages/plus/view.asp?DISPLAYYN=Y&page=1&seq=5231&types=1146', sourceLabel: '공식 교과서 정보 보기 ↗' }
];

let textbookPicker = null;
let textbookPickerFilters = null;

function openTextbookBrowser(subject) {
  const pickedLevel = profileForm.querySelector('input[name="level"]:checked')?.value || '중학교';
  const pickedGrade = gradeSelect.value || '1학년';
  const saved = readPublisherFormValues();
  const subjectInputs = [...profileForm.querySelectorAll('input[name="subjects"]:checked')].map((input) => input.value);
  textbookPicker = { level: pickedLevel, grade: pickedGrade, subject, subjects: subjectInputs.length ? subjectInputs : [subject], currentPublishers: { ...saved.publishers }, manualTitles: { ...saved.books }, manualPublisher: '' };
  textbookPickerFilters = { level: pickedLevel, grade: pickedGrade, subject, semester: '전체', publisher: 'ALL', search: '' };
  document.querySelector('#pickerSearch').value = '';
  document.querySelector('#pickerManualTitle').value = saved.books[subject] || '';
  document.querySelector('#onboarding').hidden = true;
  document.querySelector('#textbookBrowser').hidden = false;
  document.querySelector('.app-shell').hidden = true;
  history.pushState({ page: 'textbook-picker' }, '', `${location.pathname}#textbooks`);
  renderTextbookBrowser();
}

function closeTextbookBrowser() {
  document.querySelector('#textbookBrowser').hidden = true;
  document.querySelector('#onboarding').hidden = false;
  textbookPicker = null;
  textbookPickerFilters = null;
  history.replaceState({ page: 'profile' }, '', `${location.pathname}#profile`);
}

function saveTextbookPickerSelection(publisher, bookName = '') {
  if (!publisher || publisher === 'ALL') return showToast('왼쪽에서 출판사를 선택해 주세요.');
  if (textbookPickerFilters.level !== textbookPicker.level || textbookPickerFilters.grade !== textbookPicker.grade) {
    return showToast('현재 학습 프로필과 다른 학년 자료예요. 학교급과 학년을 먼저 바꿔 주세요.');
  }
  const row = [...document.querySelectorAll('#publisherFields .publisher-row')].find((item) => item.querySelector('select')?.name === `publisher-${CSS.escape(textbookPickerFilters.subject)}`);
  if (!row) return showToast('먼저 학습 정보에서 해당 과목을 선택해 주세요.');
  const select = row.querySelector('select');
  const custom = row.querySelector('.custom-publisher');
  const book = row.querySelector('.textbook-name');
  const pickerButton = row.querySelector('.publisher-picker-button');
  if (publisherChoices.includes(publisher)) {
    select.value = publisher;
    custom.value = '';
  } else {
    select.value = '기타/직접 입력';
    custom.value = publisher;
  }
  book.value = bookName;
  row.dataset.confirmed = bookName ? 'true' : 'false';
  pickerButton.textContent = bookName
    ? `${publisher} · ${bookName} 확인 완료 ✓`
    : `${publisher} 내 교과서 확인하기 ↗`;
  closeTextbookBrowser();
  showToast(bookName ? `${publisher} ${bookName} 교과서를 확인했어요.` : `${publisher} 출판사를 골랐어요. 책 이름까지 확인해 주세요.`);
}

function renderTextbookBrowser() {
  if (!textbookPicker || !textbookPickerFilters) return;
  const filters = textbookPickerFilters;
  const levelTabs = document.querySelector('#pickerLevelTabs');
  levelTabs.replaceChildren();
  [['초등학교', '초등학생'], ['중학교', '중학생'], ['고등학교', '고등학생']].forEach(([value, label], index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `browser-level-tab${filters.level === value ? ' active' : ''}`;
    button.innerHTML = `<span>${['🌱', '🌿', '🌳'][index]}</span><small>${['기초 지식', '문제 해결', '심화 학습'][index]}</small><strong>${label}</strong>`;
    button.addEventListener('click', () => {
      filters.level = value;
      filters.grade = levels[value].grades[0];
      const available = textbookPicker.subjects.filter((subject) => levels[value].subjects.includes(subject));
      filters.subject = available[0] || levels[value].subjects[0];
      renderTextbookBrowser();
    });
    levelTabs.append(button);
  });
  const subjects = textbookPicker.subjects.filter((subject) => levels[filters.level].subjects.includes(subject));
  if (!subjects.includes(filters.subject)) filters.subject = subjects[0] || levels[filters.level].subjects[0];
  const subjectTabs = document.querySelector('#pickerSubjectTabs');
  subjectTabs.replaceChildren();
  subjects.forEach((subject) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `picker-chip${filters.subject === subject ? ' active' : ''}`;
    button.textContent = subject;
    button.addEventListener('click', () => { filters.subject = subject; renderTextbookBrowser(); });
    subjectTabs.append(button);
  });
  const gradeTabs = document.querySelector('#pickerGradeTabs');
  gradeTabs.replaceChildren();
  levels[filters.level].grades.forEach((grade) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `picker-chip${filters.grade === grade ? ' active' : ''}`;
    button.textContent = grade;
    button.addEventListener('click', () => { filters.grade = grade; renderTextbookBrowser(); });
    gradeTabs.append(button);
  });
  const semesterHost = document.querySelector('#pickerSemesterFilters');
  semesterHost.replaceChildren();
  ['전체', '1학기', '2학기', '전학기'].forEach((semester) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `picker-list-option${filters.semester === semester ? ' active' : ''}`;
    button.textContent = semester;
    button.addEventListener('click', () => { filters.semester = semester; renderTextbookBrowser(); });
    semesterHost.append(button);
  });
  const publisherHost = document.querySelector('#pickerPublisherFilters');
  publisherHost.replaceChildren();
  const addPublisherOption = (publisher, label, isAll = false) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `picker-publisher-option${filters.publisher === publisher ? ' active' : ''}`;
    const mark = document.createElement('span');
    mark.className = `publisher-logo${isAll ? ' all' : ''}`;
    mark.textContent = isAll ? 'ALL' : publisher.slice(0, 1);
    const name = document.createElement('span');
    name.textContent = label;
    button.append(mark, name);
    button.addEventListener('click', () => {
      if (publisher !== 'ALL' && filters.publisher !== publisher && textbookPicker.currentPublishers[filters.subject] && textbookPicker.currentPublishers[filters.subject] !== publisher) textbookPicker.manualTitles[filters.subject] = '';
      filters.publisher = publisher;
      renderTextbookBrowser();
    });
    publisherHost.append(button);
  };
  addPublisherOption('ALL', '전체');
  publisherChoices.filter((publisher) => publisher !== '기타/직접 입력').forEach((publisher) => addPublisherOption(publisher, publisher));
  addPublisherOption('직접 입력', '직접 입력');
  document.querySelector('#textbookBrowserTitle').textContent = `${filters.subject} 교과서 자료 찾기`;
  document.querySelector('#pickerResultsTitle').textContent = `${filters.grade} ${filters.subject}`;
  document.querySelector('#pickerProfileNote').textContent = `현재 학습 프로필: ${textbookPicker.level} ${textbookPicker.grade} · ${textbookPicker.subject} · 다른 조건은 둘러볼 수 있지만, 저장은 현재 프로필의 학교급과 학년에 맞는 교재만 가능해요.`;
  document.querySelector('#pickerActiveFilters').textContent = [filters.semester === '전체' ? '' : filters.semester, filters.publisher === 'ALL' ? '전체 출판사' : filters.publisher].filter(Boolean).join(' · ');
  const normalizedSearch = filters.search.trim().toLocaleLowerCase('ko');
  const books = publisherShowcaseBooks.filter((book) => book.level === filters.level && book.grade === filters.grade && book.subject === filters.subject && (filters.semester === '전체' || book.semester === filters.semester || book.semester === '전학기') && (filters.publisher === 'ALL' || book.publisher === filters.publisher) && (!normalizedSearch || `${book.title} ${book.author} ${book.publisher}`.toLocaleLowerCase('ko').includes(normalizedSearch)));
  textbookPicker.matchingBooks = books;
  document.querySelector('#pickerCount').textContent = `검색 결과 ${books.length}권`;
  const cards = document.querySelector('#pickerBookCards');
  cards.replaceChildren();
  const bookSelect = document.querySelector('#pickerBookSelect');
  const bookSelectWrap = document.querySelector('#pickerBookSelectWrap');
  bookSelect.replaceChildren(new Option(books.length ? '교재 이름을 선택해 주세요' : '선택할 수 있는 교재가 없어요', ''));
  books.forEach((book, index) => bookSelect.append(new Option(`${book.publisher} · ${book.title} (${book.author})`, String(index))));
  if (filters.publisher !== 'ALL') bookSelect.append(new Option('목록에 없어요 · 책 이름 직접 입력', '__manual__'));
  bookSelectWrap.hidden = filters.publisher === 'ALL';
  document.querySelector('#pickerBookChoose').disabled = true;
  document.querySelector('#pickerBookChoose').textContent = '교재 선택 →';
  books.forEach((book, index) => {
    const card = document.createElement('article');
    card.className = 'picker-book-card';
    const info = document.createElement('div');
    info.className = 'picker-book-info';
    const publisher = document.createElement('p');
    publisher.className = 'picker-book-publisher';
    publisher.textContent = book.publisher;
    const title = document.createElement('h3');
    title.textContent = book.title;
    const author = document.createElement('p');
    author.className = 'picker-book-author';
    author.textContent = `저자 ${book.author}`;
    const tags = document.createElement('span');
    tags.className = 'picker-book-tag';
    tags.textContent = book.level === '중학교' ? '2022 개정' : '디지털 교육자료';
    const actions = document.createElement('div');
    actions.className = 'picker-book-actions';
    const choose = document.createElement('button');
    choose.type = 'button';
    choose.textContent = '내 교과서로 선택 →';
    choose.addEventListener('click', () => saveTextbookPickerSelection(book.publisher, `${book.title} (${book.author})`));
    const preview = document.createElement('a');
    preview.href = book.source;
    preview.target = '_blank';
    preview.rel = 'noopener';
    preview.textContent = book.source.includes('aidtshow.kr') ? '웹전시관에서 확인 ↗' : book.sourceLabel;
    actions.append(choose, preview);
    info.append(publisher, title, author, tags, actions);
    const cover = document.createElement('div');
    cover.className = `picker-book-cover cover-${index % 6}`;
    const coverMark = document.createElement('span');
    coverMark.textContent = '밤티 교과서 자료';
    const coverTitle = document.createElement('strong');
    coverTitle.textContent = `${filters.subject}\n${book.title.replace(filters.subject, '').trim()}`;
    const coverSub = document.createElement('small');
    coverSub.textContent = '학습 자료';
    cover.append(coverMark, coverTitle, coverSub);
    card.append(info, cover);
    cards.append(card);
  });
  if (!books.length) {
    const empty = document.createElement('div');
    empty.className = 'picker-empty';
    empty.innerHTML = '<span>▦</span><h3>이 조건에 표시할 교재가 아직 없어요</h3><p>출판사를 고르고 교과서 이름을 직접 입력하거나, 공식 웹전시관에서 자료를 확인해 주세요.</p>';
    const official = document.createElement('a');
    official.href = 'https://www.aidtshow.kr/';
    official.target = '_blank';
    official.rel = 'noopener';
    official.textContent = '공식 웹전시관 열기 ↗';
    empty.append(official);
    const publisherSearch = document.createElement('a');
    const school = document.querySelector('#schoolName').value.trim();
    const publisher = filters.publisher === 'ALL' || filters.publisher === '직접 입력' ? '' : filters.publisher;
    const query = `${school} ${filters.level} ${filters.grade} ${filters.subject} ${publisher} 교과서 저자`;
    publisherSearch.href = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    publisherSearch.target = '_blank';
    publisherSearch.rel = 'noopener';
    publisherSearch.textContent = '이 조건의 교과서 검색 ↗';
    empty.append(publisherSearch);
    cards.append(empty);
  }
  document.querySelector('#pickerManual').hidden = filters.publisher === 'ALL';
  const customPublisher = document.querySelector('#pickerCustomPublisher');
  customPublisher.hidden = filters.publisher !== '직접 입력';
  customPublisher.value = textbookPicker.manualPublisher;
  const manualTitle = document.querySelector('#pickerManualTitle');
  manualTitle.value = textbookPicker.manualTitles[filters.subject] || '';
}

document.querySelector('#closeTextbookBrowser').addEventListener('click', closeTextbookBrowser);
window.addEventListener('popstate', () => {
  if (!document.querySelector('#textbookBrowser').hidden) closeTextbookBrowser();
});
document.querySelector('#pickerSearch').addEventListener('input', (event) => {
  if (!textbookPickerFilters) return;
  textbookPickerFilters.search = event.currentTarget.value;
  renderTextbookBrowser();
  const search = document.querySelector('#pickerSearch');
  search.focus();
  search.setSelectionRange(search.value.length, search.value.length);
});
document.querySelector('#pickerManualTitle').addEventListener('input', (event) => {
  if (textbookPicker && textbookPickerFilters) textbookPicker.manualTitles[textbookPickerFilters.subject] = event.currentTarget.value;
});
document.querySelector('#pickerBookSelect').addEventListener('change', (event) => {
  const chooseButton = document.querySelector('#pickerBookChoose');
  chooseButton.disabled = !event.currentTarget.value;
  chooseButton.textContent = event.currentTarget.value === '__manual__' ? '책 이름 입력하기 →' : '교재 선택 →';
});
document.querySelector('#pickerBookChoose').addEventListener('click', () => {
  const selection = document.querySelector('#pickerBookSelect').value;
  if (selection === '__manual__') {
    const manualTitle = document.querySelector('#pickerManualTitle');
    manualTitle.focus();
    manualTitle.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return showToast('교과서에 적힌 책 이름을 입력해 주세요.');
  }
  if (selection === '') return showToast('먼저 교재 이름을 골라 주세요.');
  const selectedIndex = Number(selection);
  const book = textbookPicker?.matchingBooks?.[selectedIndex];
  if (!book) return showToast('먼저 교재 이름을 골라 주세요.');
  saveTextbookPickerSelection(book.publisher, `${book.title} (${book.author})`);
});
document.querySelector('#pickerCustomPublisher').addEventListener('input', (event) => {
  if (textbookPicker) textbookPicker.manualPublisher = event.currentTarget.value;
});
document.querySelector('#pickerManualSave').addEventListener('click', () => {
  let publisher = textbookPickerFilters?.publisher;
  if (publisher === 'ALL') return showToast('왼쪽에서 출판사를 먼저 골라 주세요.');
  if (publisher === '직접 입력') {
    publisher = textbookPicker?.manualPublisher?.trim() || '';
    if (!publisher) return showToast('출판사 이름을 입력해 주세요.');
  }
  saveTextbookPickerSelection(publisher, textbookPicker?.manualTitles?.[textbookPickerFilters.subject]?.trim() || '');
});

function updateGoalFields(subjects, scores = {}) {
  goalScoreFields.replaceChildren();
  if (!subjects.length) {
    const hint = document.createElement('span');
    hint.className = 'choice-hint';
    hint.textContent = '과목을 고르면 목표 점수를 설정할 수 있어요.';
    goalScoreFields.append(hint);
    return;
  }
  subjects.forEach((subject) => {
    const label = document.createElement('label');
    label.className = 'goal-score-field';
    const subjectName = document.createElement('span');
    subjectName.textContent = subject;
    const input = document.createElement('input');
    input.type = 'number';
    input.name = `goal-${subject}`;
    input.min = '0';
    input.max = '100';
    input.value = scores[subject] || '90';
    input.setAttribute('aria-label', `${subject} 목표 점수`);
    const unit = document.createElement('small');
    unit.textContent = '점';
    label.append(subjectName, input, unit);
    goalScoreFields.append(label);
  });
}

function showOnboarding(profile = null) {
  appShell.hidden = true;
  onboarding.hidden = false;
  history.replaceState({ page: 'profile' }, '', `${location.pathname}#profile`);
  profileForm.reset();
  clearSchoolVerification();
  if (profile) {
    const radio = profileForm.querySelector(`input[name="level"][value="${CSS.escape(profile.level)}"]`);
    if (radio) radio.checked = true;
    document.querySelector('#schoolName').value = profile.school || '';
    if (profile.schoolInfo) {
      verifiedSchool = profile.schoolInfo;
      schoolVerifyStatus.textContent = `확인된 학교 · ${profile.schoolInfo.name || profile.school} (${profile.schoolInfo.level || profile.level})`;
      schoolVerifyStatus.classList.add('verified');
    }
    updateGradeOptions(profile.level, profile.grade);
    profile.subjects.forEach((subject) => {
      const checkbox = [...profileForm.querySelectorAll('input[name="subjects"]')].find((item) => item.value === subject);
      if (checkbox) checkbox.checked = true;
    });
    updateGoalFields(profile.subjects, profile.goals);
    renderPublisherFields(profile.subjects, profile.publishers || {}, profile.books || {}, profile.confirmedTextbooks || {});
  } else {
    updateGradeOptions('');
  }
}

function applyProfile(profile) {
  document.querySelector('#welcomeName').textContent = profile.name || profile.grade.replace('학년', '') + '학년';
  document.querySelector('#profileAvatar').textContent = (profile.school || profile.level).slice(0, 1);
  document.querySelector('#profileName').textContent = profile.school || '학생';
  document.querySelector('#profileSchool').textContent = `${profile.level} ${profile.grade}`;
  const rows = [...document.querySelectorAll('.subject-row')];
  const subjectList = document.querySelector('.subject-list');
  rows.forEach((row) => { if (!profile.subjects.includes(row.dataset.subject)) row.remove(); });
  subjectList.querySelectorAll('.profile-subject').forEach((row) => row.remove());
  profile.subjects.forEach((subject) => {
    const existing = subjectList.querySelector(`[data-subject="${CSS.escape(subject)}"]`);
    if (existing) {
      const details = existing.querySelector('.subject-info small');
      if (details) details.textContent = `${profile.level} ${profile.grade} · ${profile.confirmedTextbooks?.[subject] ? '교과서 확인 완료' : '교과서 확인 필요'}${profile.publishers?.[subject] ? ` · ${profile.publishers[subject]}` : ''}${profile.books?.[subject] ? ` · ${profile.books[subject]}` : ''} · 목표 ${profile.goals?.[subject] || 90}점`;
      return;
    }
    const row = document.createElement('button');
    row.className = 'subject-row profile-subject';
    row.dataset.subject = subject;
    const icon = document.createElement('span');
    icon.className = `subject-icon ${subject === '수학' ? 'math' : subject === '영어' ? 'english' : 'science'}`;
    icon.textContent = subject === '수학' ? '∑' : subject === '영어' ? 'Aa' : '✳';
    const info = document.createElement('span');
    info.className = 'subject-info';
    const name = document.createElement('strong');
    name.textContent = subject;
    const details = document.createElement('small');
    details.textContent = `${profile.level} ${profile.grade} · ${profile.confirmedTextbooks?.[subject] ? '교과서 확인 완료' : '교과서 확인 필요'}${profile.publishers?.[subject] ? ` · ${profile.publishers[subject]}` : ''}${profile.books?.[subject] ? ` · ${profile.books[subject]}` : ''} · 목표 ${profile.goals[subject] || 90}점`;
    info.append(name, details);
    const progress = document.createElement('span');
    progress.className = 'subject-progress';
    progress.innerHTML = '<span><i style="width:0%"></i></span><small>0%</small>';
    const arrow = document.createElement('span');
    arrow.className = 'row-arrow';
    arrow.textContent = '→';
    row.append(icon, info, progress, arrow);
    subjectList.append(row);
    row.addEventListener('click', () => openLesson(row.dataset.subject));
  });
  const focusSubject = profile.subjects.includes('수학') ? '수학' : (profile.subjects[0] || '과목');
  document.querySelector('#heroLesson').textContent = `${focusSubject} · 맞춤 학습 · 목표 ${profile.goals[focusSubject] || 90}점`;
  renderAIInsight();
  onboarding.hidden = true;
  appShell.hidden = false;
}

document.querySelectorAll('input[name="level"]').forEach((radio) => {
  radio.addEventListener('change', () => {
    if (verifiedSchool && verifiedSchool.level !== radio.value) clearSchoolVerification('학교급이 바뀌어 학교 이름을 다시 확인해 주세요.');
    updateGradeOptions(radio.value);
  });
});
document.querySelector('#schoolName').addEventListener('input', () => {
  const level = profileForm.querySelector('input[name="level"]:checked')?.value || '';
  const grade = gradeSelect.value || '';
  document.querySelectorAll('#publisherFields .publisher-search-link').forEach((link) => {
    const book = document.querySelector(`[name="textbook-${CSS.escape(link.dataset.subject)}"]`)?.value || '';
    const row = link.closest('.publisher-row');
    const select = row?.querySelector('select');
    const custom = row?.querySelector('.custom-publisher');
    const publisher = select?.value === '기타/직접 입력' ? custom?.value || '' : select?.value || '';
    link.href = `https://www.google.com/search?q=${encodeURIComponent(`${document.querySelector('#schoolName').value.trim()} ${level} ${grade} ${link.dataset.subject} ${publisher} ${book} 교과서`)}`;
  });
});
gradeSelect.addEventListener('change', () => {
  const selected = [...profileForm.querySelectorAll('input[name="subjects"]:checked')].map((input) => input.value);
  const publishers = readPublisherFormValues();
  updateSubjects(profileForm.querySelector('input[name="level"]:checked')?.value, gradeSelect.value, selected, publishers.publishers, publishers.books, publishers.confirmations);
});
subjectChoices.addEventListener('change', () => {
  const selected = [...profileForm.querySelectorAll('input[name="subjects"]:checked')].map((input) => input.value);
  const scores = Object.fromEntries([...goalScoreFields.querySelectorAll('input')].map((input) => [input.name.replace('goal-', ''), input.value]));
  updateGoalFields(selected, scores);
  const saved = readPublisherFormValues();
  renderPublisherFields(selected, saved.publishers, saved.books, saved.confirmations);
});
profileForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const level = profileForm.querySelector('input[name="level"]:checked')?.value;
  const grade = gradeSelect.value;
  const subjects = [...profileForm.querySelectorAll('input[name="subjects"]:checked')].map((input) => input.value);
  if (!subjects.length) {
    showToast('공부할 과목을 하나 이상 골라 주세요.');
    return;
  }
  const goals = Object.fromEntries([...goalScoreFields.querySelectorAll('input')].map((input) => [input.name.replace('goal-', ''), Number(input.value)]));
  const saved = readPublisherFormValues();
  const publishers = Object.fromEntries(Object.entries(saved.publishers).filter(([, publisher]) => publisher));
  const books = Object.fromEntries(Object.entries(saved.books).filter(([, book]) => book));
  const confirmedTextbooks = Object.fromEntries(Object.entries(saved.confirmations).filter(([subject, confirmed]) => confirmed && publishers[subject] && books[subject]));
  const previous = JSON.parse(localStorage.getItem('baewoom-profile') || 'null');
  const units = { ...(previous?.units || {}) };
  Object.keys(units).forEach((subject) => {
    if (!subjects.includes(subject) || previous?.level !== level || previous?.grade !== grade || previous?.publishers?.[subject] !== publishers[subject] || previous?.books?.[subject] !== books[subject]) delete units[subject];
  });
  const school = schoolNameInput.value.trim();
  const schoolInfo = verifiedSchool || (previous?.school === school && previous?.schoolInfo?.level === level ? previous.schoolInfo : null);
  const profile = { ...previous, level, grade, school, schoolInfo, subjects, goals, publishers, books, confirmedTextbooks, units };
  localStorage.setItem('baewoom-profile', JSON.stringify(profile));
  applyProfile(profile);
  history.replaceState(null, '', location.pathname);
  showToast('나에게 맞는 학습 공간을 만들었어요.');
});
document.querySelector('#editProfile').addEventListener('click', () => showOnboarding(JSON.parse(localStorage.getItem('baewoom-profile') || 'null')));
const savedProfile = JSON.parse(localStorage.getItem('baewoom-profile') || 'null');
const loginScreen = document.querySelector('#loginScreen');
const loginForm = document.querySelector('#loginForm');
function restoreRequestedPage() {
  const profile = JSON.parse(localStorage.getItem('baewoom-profile') || 'null');
  const pageByHash = { '#subjects': 'subjects', '#notes': 'notes', '#progress': 'report', '#reportPanel': 'report' };
  if (location.hash === '#profile') {
    showOnboarding(profile);
    return;
  }
  if (location.hash === '#textbooks') {
    if (profile) {
      showOnboarding(profile);
      openTextbookBrowser(profile.subjects?.[0] || '수학');
    }
    return;
  }
  const page = pageByHash[location.hash];
  if (profile && page) navigateTo(page);
}
function enterDemoMode() {
  sessionStorage.setItem('baewoom-session', 'demo');
  loginForm.reset();
  document.querySelector('#loginNotice').textContent = '실제 계정 인증은 아직 연결되지 않았어요. 입력한 정보는 저장하거나 전송하지 않습니다.';
  loginScreen.hidden = true;
  if (savedProfile?.subjects?.length) {
    applyProfile(savedProfile);
    restoreRequestedPage();
  }
  else showOnboarding(savedProfile);
}
loginForm.addEventListener('submit', (event) => {
  event.preventDefault();
  document.querySelector('#loginNotice').textContent = '실제 계정 로그인을 사용하려면 인증 서버 연결이 필요해요. 비밀번호는 저장하거나 전송하지 않았어요. 아래 체험 모드로 계속할 수 있습니다.';
  document.querySelector('#loginPassword').value = '';
});
document.querySelector('#demoLogin').addEventListener('click', enterDemoMode);
document.querySelector('#logoutButton').addEventListener('click', () => {
  sessionStorage.removeItem('baewoom-session');
  document.querySelector('#loginForm').reset();
  document.querySelector('#loginNotice').textContent = '실제 계정 인증은 아직 연결되지 않았어요. 입력한 정보는 저장하거나 전송하지 않습니다.';
  appShell.hidden = true;
  onboarding.hidden = true;
  document.querySelector('#loginScreen').hidden = false;
  window.scrollTo({ top: 0, behavior: 'smooth' });
});
if (sessionStorage.getItem('baewoom-session') === 'demo') {
  loginScreen.hidden = true;
  if (savedProfile?.subjects?.length) {
    applyProfile(savedProfile);
    restoreRequestedPage();
  }
  else showOnboarding(savedProfile);
} else {
  appShell.hidden = true;
  onboarding.hidden = true;
  loginScreen.hidden = false;
}

const lessonModal = document.querySelector('#learningModal');
const lessonContent = document.querySelector('#learningContent');
let activeLesson = null;
let quizIndex = 0;
let correctAnswers = 0;
const lessonData = {
  '수학': { title: '일차함수의 그래프', concept: '일차함수 y = ax + b에서 a는 그래프의 기울기, b는 y절편이에요. x가 1만큼 변할 때 y가 a만큼 변하고, 그래프는 y축을 (0, b)에서 만나요.', question: 'y = 3x + 2의 y절편은 얼마일까요?', choices: ['3', '2', '5'], answer: 1, explain: 'y = ax + b에서 y절편은 b예요. 따라서 y절편은 2입니다.' },
  '영어': { title: '영어 문장 속 동사 찾기', concept: '영어 문장의 동사는 주어가 하는 행동이나 상태를 나타내요. 주어 다음에 오는 동사를 찾아 문장의 뼈대를 확인해 보세요.', question: '“She reads a book.”에서 동사는 무엇일까요?', choices: ['She', 'reads', 'book'], answer: 1, explain: 'reads는 주어 She가 하는 행동을 나타내는 동사예요.' },
  '과학': { title: '물질의 상태 변화', concept: '물질은 온도에 따라 고체, 액체, 기체로 상태가 바뀔 수 있어요. 고체가 액체로 변하는 현상을 융해라고 합니다.', question: '얼음이 물로 변하는 현상은 무엇일까요?', choices: ['응고', '융해', '기화'], answer: 1, explain: '고체인 얼음이 액체인 물로 변하므로 융해예요.' },
  '국어': { title: '글의 중심 내용 찾기', concept: '글의 중심 내용은 글쓴이가 가장 중요하게 전하려는 생각이에요. 반복되는 낱말과 문단의 첫 문장, 마지막 문장을 단서로 찾아보세요.', question: '중심 내용을 찾을 때 가장 도움이 되는 것은 무엇일까요?', choices: ['반복되는 핵심 낱말', '글자 수', '페이지 번호'], answer: 0, explain: '반복되는 핵심 낱말은 글의 중심 내용을 짐작하는 단서가 돼요.' }
};

const publisherTextbooks = [{
  publisher: '엔이능률',
  level: '중학교',
  grade: '2학년',
  subject: '수학',
  book: '수학2 (권오남 저)',
  source: 'https://m.neteacher.co.kr/math/pages/plus/view.asp?DISPLAYYN=Y&page=1&seq=5231&types=1146',
  units: [
    { title: 'I-1. 유리수와 순환소수', concept: '유한소수와 순환소수는 분수의 분모를 소인수분해해 구분할 수 있어요. 순환마디가 반복되는 소수는 분수로 나타낼 수 있습니다.', question: '0.272727…을 분수로 나타내면 무엇일까요?', choices: ['3/11', '2/7', '27/100'], answer: 0, explain: '0.272727… = 27/99이고, 분자와 분모를 9로 나누면 3/11이에요.' },
    { title: 'I-2. 식의 계산', concept: '다항식의 괄호 앞에 곱셈이 있으면 분배법칙을 적용하고, 같은 문자끼리 동류항을 정리해요.', question: '2(3x - 1) - x를 간단히 하면 무엇일까요?', choices: ['5x - 2', '6x - 2', '5x + 2'], answer: 0, explain: '괄호를 풀면 6x - 2 - x이고, 동류항을 모으면 5x - 2예요.' },
    { title: 'II-1. 일차부등식', concept: '일차부등식은 양변에 같은 수를 더하거나 빼도 부등호 방향이 유지돼요. 음수를 곱하거나 나누면 부등호 방향이 바뀝니다.', question: '3x + 2 < 11을 풀면 무엇일까요?', choices: ['x < 3', 'x > 3', 'x < 9'], answer: 0, explain: '양변에서 2를 빼고 3으로 나누면 x < 3이에요.' },
    { title: 'II-2. 연립일차방정식', concept: '두 일차방정식을 동시에 만족하는 값을 찾을 때 한 식을 다른 식에 대입하거나 두 식을 더하고 빼어 미지수를 없앨 수 있어요.', question: 'x + y = 7, x - y = 1일 때 x는 얼마일까요?', choices: ['3', '4', '6'], answer: 1, explain: '두 식을 더하면 2x = 8이므로 x = 4예요.' },
    { title: 'III-1. 일차함수와 그 그래프', concept: '일차함수 y = ax + b의 그래프는 직선이에요. a는 기울기, b는 y절편을 나타냅니다.', question: 'y = -2x + 4의 기울기는 얼마일까요?', choices: ['4', '-2', '2'], answer: 1, explain: 'y = ax + b에서 x의 계수 a가 기울기이므로 -2예요.' },
    { title: 'III-2. 일차함수와 일차방정식의 관계', concept: '일차함수의 그래프가 x축과 만나는 점에서는 y = 0이에요. 따라서 일차방정식의 해를 그래프의 x절편으로 확인할 수 있습니다.', question: 'y = 2x + 1 그래프의 x절편은 얼마일까요?', choices: ['-1/2', '1/2', '-2'], answer: 0, explain: 'x축에서는 y = 0이므로 2x + 1 = 0, x = -1/2예요.' },
    { title: 'IV-1. 삼각형의 성질', concept: '삼각형의 한 외각의 크기는 그 외각과 이웃하지 않는 두 내각의 크기의 합과 같아요.', question: '두 내각이 40°, 65°인 삼각형에서 나머지 한 외각은 몇 도일까요?', choices: ['25°', '105°', '115°'], answer: 1, explain: '외각은 이웃하지 않는 두 내각의 합이므로 40° + 65° = 105°예요.' },
    { title: 'IV-2. 사각형의 성질', concept: '평행사변형은 두 쌍의 마주 보는 변이 각각 평행해요. 마주 보는 각의 크기도 서로 같습니다.', question: '평행사변형의 한 각이 70°라면 마주 보는 각은 몇 도일까요?', choices: ['70°', '110°', '180°'], answer: 0, explain: '평행사변형에서 마주 보는 각은 크기가 같으므로 70°예요.' },
    { title: 'V-1. 도형의 닮음', concept: '닮은 도형은 대응각의 크기가 같고 대응변의 길이의 비가 일정해요. 대응변의 비를 이용해 모르는 길이를 구할 수 있습니다.', question: '닮은 두 도형의 대응변 비가 2:3이고 작은 도형의 변이 4라면 대응하는 큰 도형의 변은 얼마일까요?', choices: ['6', '8', '12'], answer: 0, explain: '작은 도형에서 큰 도형으로의 비율은 3/2이므로 4 × 3/2 = 6이에요.' },
    { title: 'V-2. 피타고라스 정리', concept: '직각삼각형에서 빗변의 제곱은 나머지 두 변의 제곱의 합과 같아요. 이를 이용해 한 변의 길이를 계산합니다.', question: '직각삼각형의 두 직각변이 6, 8일 때 빗변은 얼마일까요?', choices: ['10', '12', '14'], answer: 0, explain: '빗변의 길이를 c라 하면 c² = 6² + 8² = 100이므로 c = 10이에요.' },
    { title: 'VI-1. 경우의 수와 확률', concept: '확률은 어떤 사건이 일어나는 경우의 수를 전체 경우의 수로 나눈 값이에요. 모든 경우가 같은 가능성으로 일어날 때 적용할 수 있습니다.', question: '빨간 공 3개와 파란 공 2개 중 하나를 뽑을 때 빨간 공을 뽑을 확률은 얼마일까요?', choices: ['2/5', '3/5', '1/2'], answer: 1, explain: '전체 5개 중 빨간 공이 3개이므로 확률은 3/5예요.' }
  ]
}];

function getTextbookCatalog(profile, subject) {
  if (!profile) return null;
  if (!profile.confirmedTextbooks?.[subject]) return null;
  const publisher = profile.publishers?.[subject] || '';
  const book = profile.books?.[subject] || '';
  return publisherTextbooks.find((item) => item.publisher === publisher && item.level === profile.level && item.grade === profile.grade && item.subject === subject && /권오남/.test(book)) || null;
}

function getUnmappedLesson(profile, subject) {
  const unit = profile?.units?.[subject] || '';
  const book = profile?.books?.[subject] || '교재명 미입력';
  return {
    title: unit || `${subject} 교과서 연결 준비`,
    concept: `${profile?.publishers?.[subject] || '선택한 출판사'} · ${book}의 출판사별 단원 내용은 아직 확인되지 않았어요. 이 화면은 교과서 내용을 대신하지 않으며, 공개 목차 확인 뒤 자체 설명과 새 연습문제를 연결할 예정이에요.`,
    question: '교과서에 맞는 학습 자료를 연결할 때 필요한 정보는 무엇일까요?',
    choices: ['출판사와 교과서 저자·단원', '학생의 별명만', '페이지 색깔'],
    answer: 0,
    explain: '같은 출판사에서도 책과 저자에 따라 단원 구성과 순서가 다를 수 있어요.'
  };
}

function openLesson(subject, quizOnly = false) {
  const profile = JSON.parse(localStorage.getItem('baewoom-profile') || 'null');
  const catalog = getTextbookCatalog(profile, subject);
  const selectedUnit = profile?.units?.[subject];
  const textbookLesson = catalog?.units.find((unit) => unit.title === selectedUnit) || (catalog ? catalog.units[0] : null);
  const data = textbookLesson || (profile?.subjects?.includes(subject) ? getUnmappedLesson(profile, subject) : null) || lessonData[subject] || {
    title: `${subject} 기초 개념`,
    concept: `${subject} 학습은 핵심 용어를 먼저 확인하고, 예시와 문제를 통해 이해를 점검하면 좋아요. 개념을 읽은 뒤 간단한 확인 문제를 풀어보세요.`,
    question: `${subject} 공부를 마친 뒤 가장 좋은 복습 방법은 무엇일까요?`,
    choices: ['핵심 개념을 내 말로 설명하기', '답만 외우기', '복습하지 않기'],
    answer: 0,
    explain: '핵심 개념을 내 말로 설명해 보면 실제로 이해했는지 확인할 수 있어요.'
  };
  activeLesson = { subject, ...data, source: catalog?.source || '', bookLabel: catalog?.book || '' };
  quizIndex = 0;
  correctAnswers = 0;
  document.querySelector('#learningKicker').textContent = catalog ? `NE능률 · ${catalog.book}` : quizOnly ? 'PERSONALIZED PRACTICE' : `${subject.toUpperCase()} · TODAY'S LESSON`;
  document.querySelector('#learningTitle').textContent = quizOnly ? `${subject} 맞춤 연습` : data.title;
  lessonModal.hidden = false;
  renderLessonStep(quizOnly ? 'quiz' : 'concept');
}

function renderLessonStep(step, feedback = '') {
  lessonContent.replaceChildren();
  if (step === 'concept') {
    const label = document.createElement('span');
    label.className = 'lesson-step-label';
    label.textContent = '핵심 개념';
    const paragraph = document.createElement('p');
    paragraph.className = 'lesson-concept';
    paragraph.textContent = activeLesson.concept;
    lessonContent.append(label, paragraph);
    if (activeLesson.source) {
      const source = document.createElement('p');
      source.className = 'lesson-source';
      source.textContent = '공식 교과서 목차를 참고해 설명과 문제를 새로 구성했어요.';
      const link = document.createElement('a');
      link.href = activeLesson.source;
      link.target = '_blank';
      link.rel = 'noopener';
      link.textContent = '공식 교과서 자료 보기 ↗';
      source.append(' ', link);
      lessonContent.append(source);
    }
    document.querySelector('#lessonContinue').textContent = '확인 문제 풀기 →';
    document.querySelector('#lessonContinue').onclick = () => renderLessonStep('quiz');
    return;
  }
  if (step === 'result') {
    const score = document.createElement('div');
    score.className = 'quiz-result';
    score.textContent = `정답 ${correctAnswers}개 · 학습 내용을 확인했어요!`;
    const note = document.createElement('p');
    note.className = 'lesson-concept';
    note.textContent = `이번 연습에서 ${activeLesson.subject} · ${activeLesson.title} 학습 기록을 저장했어요. 다음 학습에서 이어서 확인해요.`;
    lessonContent.append(score, note);
    document.querySelector('#lessonContinue').textContent = '완료';
    document.querySelector('#lessonContinue').onclick = closeLesson;
    return;
  }
  const label = document.createElement('span');
  label.className = 'lesson-step-label';
  label.textContent = `확인 문제 ${quizIndex + 1} / 1`;
  const question = document.createElement('h3');
  question.className = 'lesson-question';
  question.textContent = activeLesson.question;
  const choices = document.createElement('div');
  choices.className = 'quiz-choices';
  activeLesson.choices.forEach((choice, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'quiz-choice';
    button.textContent = `${index + 1}. ${choice}`;
    button.addEventListener('click', () => {
      choices.querySelectorAll('button').forEach((item) => { item.disabled = true; });
      const isCorrect = index === activeLesson.answer;
      if (isCorrect) correctAnswers += 1;
      button.classList.add(isCorrect ? 'correct' : 'incorrect');
      const explanation = document.createElement('p');
      explanation.className = `quiz-feedback ${isCorrect ? 'correct-text' : 'incorrect-text'}`;
      explanation.textContent = `${isCorrect ? '정답이에요! ' : '아쉬워요. '} ${activeLesson.explain}`;
      lessonContent.append(explanation);
      savePractice(activeLesson.subject, isCorrect, activeLesson.title, {
        question: activeLesson.question,
        selectedAnswer: activeLesson.choices[index],
        correctAnswer: activeLesson.choices[activeLesson.answer],
        explanation: activeLesson.explain,
        concept: activeLesson.concept
      });
      document.querySelector('#lessonContinue').textContent = '결과 보기 →';
      document.querySelector('#lessonContinue').onclick = () => renderLessonStep('result');
    });
    choices.append(button);
  });
  lessonContent.append(label, question, choices);
  if (feedback) lessonContent.insertAdjacentHTML('beforeend', feedback);
  document.querySelector('#lessonContinue').textContent = '선택지를 골라 주세요';
  document.querySelector('#lessonContinue').onclick = () => showToast('답을 하나 선택해 주세요.');
}

function savePractice(subject, isCorrect, unit = '', response = {}) {
  const attempts = JSON.parse(localStorage.getItem('baewoom-practice') || '[]');
  const profile = JSON.parse(localStorage.getItem('baewoom-profile') || 'null');
  const attemptId = `practice-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const attempt = { id: attemptId, subject, unit, publisher: profile?.publishers?.[subject] || '', book: profile?.books?.[subject] || '', ...response, isCorrect, date: new Date().toISOString() };
  attempts.push(attempt);
  localStorage.setItem('baewoom-practice', JSON.stringify(attempts.slice(-100)));
  if (!isCorrect) {
    const notes = JSON.parse(localStorage.getItem('baewoom-notes') || '[]');
    const body = [
      `문제: ${response.question || unit}`,
      `내가 고른 답: ${response.selectedAnswer || '기록 없음'}`,
      `정답: ${response.correctAnswer || '확인 필요'}`,
      response.concept ? `헷갈린 개념: ${response.concept}` : '',
      response.explanation ? `다시 기억할 점: ${response.explanation}` : ''
    ].filter(Boolean).join('\n');
    notes.push({
      id: `auto-${attemptId}`,
      attemptId,
      source: 'auto',
      subject,
      title: `${unit || '문제'} · 오답 복습`,
      body,
      createdAt: Date.now()
    });
    localStorage.setItem('baewoom-notes', JSON.stringify(notes.slice(-200)));
  }
  renderWeeklyAccuracy();
  renderAIInsight();
  renderReport();
  if (currentPage === 'notes') renderNotesPage();
  if (!isCorrect) showToast(`${subject} 오답을 오답노트에 자동 저장했어요.`);
}

function closeLesson() {
  lessonModal.hidden = true;
}

document.querySelector('#startLearning').addEventListener('click', () => {
  const profile = JSON.parse(localStorage.getItem('baewoom-profile') || 'null');
  openLesson(profile?.subjects?.[0] || '수학');
});
document.querySelector('#aiAction').addEventListener('click', () => {
  const profile = JSON.parse(localStorage.getItem('baewoom-profile') || 'null');
  const attempts = getPractice();
  const analysis = getSavedAIInsight()?.analysis;
  const subjectScores = new Map();
  attempts.forEach((attempt) => {
    const score = subjectScores.get(attempt.subject) || { wrong: 0, total: 0 };
    score.total += 1;
    if (!attempt.isCorrect) score.wrong += 1;
    subjectScores.set(attempt.subject, score);
  });
  const weakestSubject = [...subjectScores.entries()].sort((a, b) => b[1].wrong / b[1].total - a[1].wrong / a[1].total || b[1].wrong - a[1].wrong)[0]?.[0];
  const suggested = analysis?.focusSubject;
  const subject = profile?.subjects?.includes(suggested) ? suggested : weakestSubject || profile?.subjects?.[0] || '수학';
  if (analysis?.focusUnit && profile?.subjects?.includes(subject)) {
    const catalog = getTextbookCatalog(profile, subject);
    if (catalog?.units.some((unit) => unit.title === analysis.focusUnit)) {
      profile.units ||= {};
      profile.units[subject] = analysis.focusUnit;
      localStorage.setItem('baewoom-profile', JSON.stringify(profile));
    }
  }
  openLesson(subject, true);
});
document.querySelector('#runAiAnalysis').addEventListener('click', requestAIAnalysis);
renderAIInsight();
document.querySelectorAll('.subject-row').forEach((row) => {
  row.addEventListener('click', () => openLesson(row.dataset.subject));
});
document.querySelector('#reviewBtn').addEventListener('click', () => {
  const missed = JSON.parse(localStorage.getItem('baewoom-practice') || '[]').filter((attempt) => !attempt.isCorrect);
  const lastMiss = missed.at(-1);
  const subject = lastMiss?.subject || '수학';
  const profile = JSON.parse(localStorage.getItem('baewoom-profile') || 'null');
  if (lastMiss?.unit && profile?.subjects?.includes(subject)) {
    profile.units ||= {};
    profile.units[subject] = lastMiss.unit;
    localStorage.setItem('baewoom-profile', JSON.stringify(profile));
  }
  openLesson(subject, true);
});
document.querySelector('#closeLearning').addEventListener('click', closeLesson);
lessonModal.addEventListener('click', (event) => { if (event.target === lessonModal) closeLesson(); });
document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && !lessonModal.hidden) closeLesson(); });

document.querySelector('#subjectSearch').addEventListener('input', () => renderSubjectPage());
document.querySelector('#addSubjectButton').addEventListener('click', () => {
  const subject = document.querySelector('#addSubjectSelect').value;
  if (!subject) {
    showToast('추가할 과목을 먼저 선택해 주세요.');
    return;
  }
  const profile = JSON.parse(localStorage.getItem('baewoom-profile') || 'null');
  const updated = profile || { level: '중학교', grade: '1학년', school: '', subjects: [], goals: {} };
  updated.subjects ||= [];
  updated.goals ||= {};
  if (!updated.subjects.includes(subject)) updated.subjects.push(subject);
  updated.goals[subject] ||= 90;
  localStorage.setItem('baewoom-profile', JSON.stringify(updated));
  applyProfile(updated);
  renderSubjectPage(subject);
  showToast(`${subject} 과목을 추가했어요.`);
});
document.querySelector('#notesBack').addEventListener('click', () => navigateTo('home'));
document.querySelector('#noteForm').addEventListener('submit', (event) => {
  event.preventDefault();
  const notes = JSON.parse(localStorage.getItem('baewoom-notes') || '[]');
  notes.push({
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    subject: document.querySelector('#noteSubject').value,
    title: document.querySelector('#noteTitle').value.trim(),
    body: document.querySelector('#noteBody').value.trim(),
    createdAt: Date.now()
  });
  localStorage.setItem('baewoom-notes', JSON.stringify(notes));
  event.currentTarget.reset();
  renderNotesPage();
  showToast('오답 메모를 저장했어요.');
});
