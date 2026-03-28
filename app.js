const displayEl = document.getElementById('display');
const expressionEl = document.getElementById('expression');
const angleToggle = document.getElementById('angleToggle');
const invToggle = document.getElementById('invToggle');
const memoryLamp = document.getElementById('memoryLamp');
const modeLabel = document.getElementById('modeLabel');
const historyList = document.getElementById('historyList');
const clearHistoryBtn = document.getElementById('clearHistory');

let expression = '';
let lastAnswer = 0;
let memoryValue = 0;
let isRadians = false;
let inverseMode = false;
let history = JSON.parse(localStorage.getItem('engcalc-history') || '[]');

function updateDisplay(value = null) {
  expressionEl.textContent = expression || '';
  displayEl.textContent = value ?? (expression || '0');
  modeLabel.textContent = `각도: ${isRadians ? 'RAD' : 'DEG'}`;
  memoryLamp.classList.toggle('off', memoryValue === 0);
}

function addToken(token) {
  if (displayEl.textContent === '오류') expression = '';
  expression += token;
  updateDisplay();
}

function clearAll() {
  expression = '';
  updateDisplay('0');
}

function clearEntry() {
  expression = '';
  updateDisplay('0');
}

function backspace() {
  expression = expression.slice(0, -1);
  updateDisplay();
}

function toggleSign() {
  if (!expression) {
    expression = '-';
  } else if (/^-/.test(expression)) {
    expression = expression.slice(1);
  } else {
    expression = '-' + expression;
  }
  updateDisplay();
}

function saveHistory(exp, result) {
  history.unshift({ exp, result });
  history = history.slice(0, 20);
  localStorage.setItem('engcalc-history', JSON.stringify(history));
  renderHistory();
}

function renderHistory() {
  if (!history.length) {
    historyList.innerHTML = '<div class="empty">최근 계산이 아직 없습니다.</div>';
    return;
  }
  historyList.innerHTML = history.map((item, index) => `
    <div class="history-item" data-history-index="${index}">
      <div class="history-exp">${escapeHtml(item.exp)}</div>
      <div class="history-result">${escapeHtml(String(item.result))}</div>
    </div>
  `).join('');
}

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, m => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[m]));
}

function toRad(x) { return isRadians ? x : x * Math.PI / 180; }
function fromRad(x) { return isRadians ? x : x * 180 / Math.PI; }
function factorial(n) {
  if (n < 0 || !Number.isInteger(n)) throw new Error('factorial');
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}
function formatNumber(num) {
  if (!Number.isFinite(num)) return '오류';
  const abs = Math.abs(num);
  if ((abs >= 1e9 || (abs > 0 && abs < 1e-6))) {
    return num.toExponential(8).replace('e+', 'e');
  }
  const rounded = Number.parseFloat(num.toFixed(12));
  return String(rounded);
}

function engineerFormat(value) {
  if (!Number.isFinite(value) || value === 0) return String(value);
  const exponent = Math.floor(Math.log10(Math.abs(value)) / 3) * 3;
  const mantissa = value / Math.pow(10, exponent);
  return `${Number(mantissa.toFixed(8))}e${exponent}`;
}

function scientificFormat(value) {
  if (!Number.isFinite(value)) return '오류';
  return value.toExponential(8).replace('e+', 'e');
}

function normalizeExpression(exp) {
  return exp
    .replace(/ANS/g, `(${lastAnswer})`)
    .replace(/pi/g, `(${Math.PI})`)
    .replace(/\be\b/g, `(${Math.E})`)
    .replace(/\^/g, '**');
}

function evaluateExpression() {
  try {
    if (!expression.trim()) return;
    const expForEval = normalizeExpression(expression);
    const scope = {
      sin: (x) => Math.sin(toRad(x)),
      cos: (x) => Math.cos(toRad(x)),
      tan: (x) => Math.tan(toRad(x)),
      asin: (x) => fromRad(Math.asin(x)),
      acos: (x) => fromRad(Math.acos(x)),
      atan: (x) => fromRad(Math.atan(x)),
      log: (x) => Math.log10(x),
      ln: (x) => Math.log(x),
      sqrt: (x) => Math.sqrt(x),
      cbrt: (x) => Math.cbrt(x),
      abs: (x) => Math.abs(x),
      pow10: (x) => Math.pow(10, x),
      exp: (x) => Math.exp(x),
      pow2: (x) => Math.pow(x, 2),
      pow3: (x) => Math.pow(x, 3),
      factorial,
    };
    const fn = new Function(...Object.keys(scope), `return ${expForEval};`);
    const result = fn(...Object.values(scope));
    const formatted = formatNumber(result);
    if (formatted === '오류') throw new Error('invalid');
    saveHistory(expression, formatted);
    lastAnswer = result;
    expression = formatted;
    updateDisplay(formatted);
  } catch (e) {
    updateDisplay('오류');
  }
}

function wrapFunction(name) {
  if (!expression || /[+\-*/^(]$/.test(expression)) {
    expression += `${name}(`;
  } else {
    expression = `${name}(${expression})`;
  }
  updateDisplay();
}

function handleAction(action) {
  switch (action) {
    case 'clear': clearAll(); break;
    case 'clear-entry': clearEntry(); break;
    case 'backspace': backspace(); break;
    case 'toggle-sign': toggleSign(); break;
    case 'equals': evaluateExpression(); break;
    case 'second': toggleInverseMode(); break;
    case 'ans': addToken('ANS'); break;
    case 'mc': memoryValue = 0; updateDisplay(); break;
    case 'mr': addToken(formatNumber(memoryValue)); break;
    case 'mplus': memoryValue += Number(lastAnswer || 0); updateDisplay(); break;
    case 'mminus': memoryValue -= Number(lastAnswer || 0); updateDisplay(); break;
  }
}

function applyNamedFunction(fnName) {
  if (fnName === 'engineer') {
    const value = Number(expression || lastAnswer || 0);
    const result = engineerFormat(value);
    expression = result;
    updateDisplay(result);
    return;
  }
  if (fnName === 'scientific') {
    const value = Number(expression || lastAnswer || 0);
    const result = scientificFormat(value);
    expression = result;
    updateDisplay(result);
    return;
  }
  if (['pow2','pow3','sqrt','cbrt','sin','cos','tan','asin','acos','atan','log','ln','pow10','exp','factorial'].includes(fnName)) {
    wrapFunction(fnName);
  }
}

function toggleAngleMode() {
  isRadians = !isRadians;
  angleToggle.textContent = isRadians ? 'RAD' : 'DEG';
  angleToggle.classList.toggle('active', true);
  updateDisplay();
}

function toggleInverseMode() {
  inverseMode = !inverseMode;
  invToggle.classList.toggle('active', inverseMode);
  document.querySelectorAll('.btn.inv').forEach(el => el.classList.toggle('hidden', !inverseMode));
  document.querySelectorAll('.function-grid > .btn.fn:not(.inv)').forEach(el => {
    const invCounterparts = ['sin','cos','tan','log','ln','sqrt'];
    if (invCounterparts.includes(el.dataset.fn)) el.classList.toggle('hidden', inverseMode);
  });
}

document.addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;
  if (btn.dataset.value) addToken(btn.dataset.value);
  if (btn.dataset.action) handleAction(btn.dataset.action);
  if (btn.dataset.fn) applyNamedFunction(btn.dataset.fn);
  if (btn.id === 'angleToggle') toggleAngleMode();
  if (btn.id === 'invToggle') toggleInverseMode();
});

historyList.addEventListener('click', (e) => {
  const item = e.target.closest('.history-item');
  if (!item) return;
  const index = Number(item.dataset.historyIndex);
  expression = history[index].result;
  updateDisplay();
});

clearHistoryBtn.addEventListener('click', () => {
  history = [];
  localStorage.removeItem('engcalc-history');
  renderHistory();
});

document.addEventListener('keydown', (e) => {
  if (/^[0-9+\-*/().]$/.test(e.key)) addToken(e.key);
  else if (e.key === 'Enter') evaluateExpression();
  else if (e.key === 'Backspace') backspace();
  else if (e.key === 'Escape') clearAll();
});

renderHistory();
updateDisplay('0');
