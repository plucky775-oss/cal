const $ = (id) => document.getElementById(id);
const displayEl = $('display');
const expressionEl = $('expression');
const angleToggle = $('angleToggle');
const invToggle = $('invToggle');
const memoryLamp = $('memoryLamp');
const modeLabel = $('modeLabel');
const historyList = $('historyList');
const clearHistoryBtn = $('clearHistory');
const graphCanvas = $('graphCanvas');
const analysisCanvas = $('analysisCanvas');
const graphMeta = $('graphMeta');
const analysisCards = $('analysisCards');

let expression = '';
let lastAnswer = 0;
let memoryValue = 0;
let isRadians = false;
let inverseMode = false;
let history = JSON.parse(localStorage.getItem('super-engcalc-history') || '[]');
let derivativeOverlay = false;

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

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

function clearAll() { expression = ''; updateDisplay('0'); }
function clearEntry() { expression = ''; updateDisplay('0'); }
function backspace() { expression = expression.slice(0, -1); updateDisplay(); }

function toggleSign() {
  if (!expression) expression = '-';
  else if (/^-/.test(expression)) expression = expression.slice(1);
  else expression = '-' + expression;
  updateDisplay();
}

function saveHistory(exp, result) {
  history.unshift({ exp, result });
  history = history.slice(0, 24);
  localStorage.setItem('super-engcalc-history', JSON.stringify(history));
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
  if ((abs >= 1e9 || (abs > 0 && abs < 1e-6))) return num.toExponential(8).replace('e+', 'e');
  return String(Number.parseFloat(num.toFixed(10)));
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

function buildScope(xValue = 0) {
  return {
    x: xValue,
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
    exp: (x) => Math.exp(x),
    pow10: (x) => Math.pow(10, x),
    pow2: (x) => Math.pow(x, 2),
    pow3: (x) => Math.pow(x, 3),
    factorial,
    floor: Math.floor,
    ceil: Math.ceil,
    round: Math.round,
    min: Math.min,
    max: Math.max,
  };
}

function evaluateRaw(exp, xValue = 0) {
  const expForEval = normalizeExpression(exp);
  const scope = buildScope(xValue);
  const fn = new Function(...Object.keys(scope), `return ${expForEval};`);
  return fn(...Object.values(scope));
}

function safeEval(exp, xValue = 0) {
  try {
    const value = evaluateRaw(exp, xValue);
    if (!Number.isFinite(value)) return null;
    return value;
  } catch {
    return null;
  }
}

function evaluateExpression() {
  try {
    if (!expression.trim()) return;
    const result = evaluateRaw(expression, 0);
    const formatted = formatNumber(result);
    if (formatted === '오류') throw new Error('invalid');
    saveHistory(expression, formatted);
    lastAnswer = result;
    expression = formatted;
    updateDisplay(formatted);
  } catch {
    updateDisplay('오류');
  }
}

function wrapFunction(name) {
  if (!expression || /[+\-*/^(]$/.test(expression)) expression += `${name}(`;
  else expression = `${name}(${expression})`;
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
    expression = engineerFormat(value);
    updateDisplay(expression);
    return;
  }
  if (fnName === 'scientific') {
    const value = Number(expression || lastAnswer || 0);
    expression = scientificFormat(value);
    updateDisplay(expression);
    return;
  }
  if (['pow2','pow3','sqrt','cbrt','sin','cos','tan','asin','acos','atan','log','ln','pow10','exp','factorial'].includes(fnName)) {
    wrapFunction(fnName);
  }
}

function toggleAngleMode() {
  isRadians = !isRadians;
  angleToggle.textContent = isRadians ? 'RAD' : 'DEG';
  updateDisplay();
}

function toggleInverseMode() {
  inverseMode = !inverseMode;
  invToggle.classList.toggle('active', inverseMode);
  document.querySelectorAll('.btn.inv').forEach(el => el.classList.toggle('hidden', !inverseMode));
  document.querySelectorAll('.function-grid > .btn.fn:not(.inv)').forEach(el => {
    const base = ['sin','cos','tan','log','ln','sqrt'];
    if (base.includes(el.dataset.fn)) el.classList.toggle('hidden', inverseMode);
  });
}

function numericalDerivative(exp, x, h = 1e-4) {
  const f1 = safeEval(exp, x + h);
  const f2 = safeEval(exp, x - h);
  if (f1 == null || f2 == null) return null;
  return (f1 - f2) / (2 * h);
}

function secondDerivative(exp, x, h = 1e-3) {
  const f1 = safeEval(exp, x + h);
  const f0 = safeEval(exp, x);
  const f2 = safeEval(exp, x - h);
  if (f1 == null || f0 == null || f2 == null) return null;
  return (f1 - 2 * f0 + f2) / (h * h);
}

function simpsonIntegral(exp, a, b, n = 400) {
  if (a === b) return 0;
  if (n % 2 !== 0) n += 1;
  const sign = a < b ? 1 : -1;
  let start = Math.min(a, b);
  let end = Math.max(a, b);
  const h = (end - start) / n;
  let sum = 0;
  for (let i = 0; i <= n; i++) {
    const x = start + h * i;
    const y = safeEval(exp, x);
    if (y == null) return null;
    if (i === 0 || i === n) sum += y;
    else if (i % 2 === 0) sum += 2 * y;
    else sum += 4 * y;
  }
  return sign * (h / 3) * sum;
}

function sampleFunction(exp, xMin, xMax, samples = 800) {
  const pts = [];
  const step = (xMax - xMin) / samples;
  for (let i = 0; i <= samples; i++) {
    const x = xMin + step * i;
    const y = safeEval(exp, x);
    pts.push({ x, y });
  }
  return pts;
}

function getYBounds(points) {
  const valid = points.filter(p => p.y != null && Math.abs(p.y) < 1e6);
  if (!valid.length) return { yMin: -1, yMax: 1 };
  let yMin = Math.min(...valid.map(p => p.y));
  let yMax = Math.max(...valid.map(p => p.y));
  if (yMin === yMax) {
    yMin -= 1;
    yMax += 1;
  }
  const pad = (yMax - yMin) * 0.12;
  return { yMin: yMin - pad, yMax: yMax + pad };
}

function drawAxes(ctx, width, height, xMin, xMax, yMin, yMax) {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#07111d';
  ctx.fillRect(0, 0, width, height);

  const toPx = (x, y) => ({
    x: ((x - xMin) / (xMax - xMin)) * width,
    y: height - ((y - yMin) / (yMax - yMin)) * height,
  });

  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 10; i++) {
    const gx = (width / 10) * i;
    const gy = (height / 10) * i;
    ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, height); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(width, gy); ctx.stroke();
  }

  const xAxis = toPx(0, 0).y;
  const yAxis = toPx(0, 0).x;
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 1.4;
  if (xAxis >= 0 && xAxis <= height) {
    ctx.beginPath(); ctx.moveTo(0, xAxis); ctx.lineTo(width, xAxis); ctx.stroke();
  }
  if (yAxis >= 0 && yAxis <= width) {
    ctx.beginPath(); ctx.moveTo(yAxis, 0); ctx.lineTo(yAxis, height); ctx.stroke();
  }

  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.font = '12px JetBrains Mono';
  ctx.fillText(`x:[${formatNumber(xMin)}, ${formatNumber(xMax)}]`, 16, 22);
  ctx.fillText(`y:[${formatNumber(yMin)}, ${formatNumber(yMax)}]`, 16, 40);

  return toPx;
}

function drawFunctionPlot(canvas, exp, options = {}) {
  const ctx = canvas.getContext('2d');
  const xMin = Number(options.xMin);
  const xMax = Number(options.xMax);
  const samples = Number(options.samples) || 800;
  const points = sampleFunction(exp, xMin, xMax, samples);
  const derivativePoints = derivativeOverlay ? points.map(p => ({ x: p.x, y: numericalDerivative(exp, p.x) })) : [];
  const bounds = getYBounds(points.concat(derivativePoints));
  const toPx = drawAxes(ctx, canvas.width, canvas.height, xMin, xMax, bounds.yMin, bounds.yMax);

  function strokeSeries(series, color, lineWidth = 2.5) {
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    let started = false;
    for (const p of series) {
      if (p.y == null || !Number.isFinite(p.y) || Math.abs(p.y) > 1e6) { started = false; continue; }
      const px = toPx(p.x, p.y);
      if (!started) { ctx.moveTo(px.x, px.y); started = true; }
      else ctx.lineTo(px.x, px.y);
    }
    ctx.stroke();
  }

  strokeSeries(points, '#49f2ff', 2.8);
  if (derivativeOverlay) strokeSeries(derivativePoints, '#ff73d6', 2);

  const valid = points.filter(p => p.y != null);
  const yValues = valid.map(p => p.y);
  const peak = valid.reduce((best, cur) => !best || cur.y > best.y ? cur : best, null);
  const low = valid.reduce((best, cur) => !best || cur.y < best.y ? cur : best, null);

  graphMeta.innerHTML = [
    { label: '표본 점 수', value: samples },
    { label: '최대값 근사', value: peak ? `x=${formatNumber(peak.x)}, y=${formatNumber(peak.y)}` : '-' },
    { label: '최소값 근사', value: low ? `x=${formatNumber(low.x)}, y=${formatNumber(low.y)}` : '-' },
  ].map(item => `
    <div class="insight-card">
      <span>${escapeHtml(item.label)}</span>
      <strong>${escapeHtml(String(item.value))}</strong>
    </div>
  `).join('');
}

function drawCalculusAnalysis() {
  const exp = $('calcExpr').value.trim();
  const x0 = Number($('pointX').value);
  const a = Number($('intA').value);
  const b = Number($('intB').value);
  const fx = safeEval(exp, x0);
  const slope = numericalDerivative(exp, x0);
  const area = simpsonIntegral(exp, a, b, 500);

  $('fxValue').textContent = fx == null ? '-' : formatNumber(fx);
  $('derivativeValue').textContent = slope == null ? '-' : formatNumber(slope);
  $('integralValue').textContent = area == null ? '-' : formatNumber(area);
  $('tangentValue').textContent = (fx == null || slope == null)
    ? '-'
    : `y = ${formatNumber(slope)}(x - ${formatNumber(x0)}) + ${formatNumber(fx)}`;

  const ctx = analysisCanvas.getContext('2d');
  const xMin = Math.min(a, b, x0) - 3;
  const xMax = Math.max(a, b, x0) + 3;
  const points = sampleFunction(exp, xMin, xMax, 700);
  const tangentPoints = slope == null || fx == null ? [] : points.map(p => ({ x: p.x, y: slope * (p.x - x0) + fx }));
  const bounds = getYBounds(points.concat(tangentPoints));
  const toPx = drawAxes(ctx, analysisCanvas.width, analysisCanvas.height, xMin, xMax, bounds.yMin, bounds.yMax);

  ctx.strokeStyle = '#49f2ff';
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  let started = false;
  for (const p of points) {
    if (p.y == null || Math.abs(p.y) > 1e6) { started = false; continue; }
    const px = toPx(p.x, p.y);
    if (!started) { ctx.moveTo(px.x, px.y); started = true; }
    else ctx.lineTo(px.x, px.y);
  }
  ctx.stroke();

  if (fx != null && slope != null) {
    ctx.strokeStyle = '#ff73d6';
    ctx.lineWidth = 2;
    ctx.beginPath();
    tangentPoints.forEach((p, i) => {
      const px = toPx(p.x, p.y);
      if (i === 0) ctx.moveTo(px.x, px.y);
      else ctx.lineTo(px.x, px.y);
    });
    ctx.stroke();

    const point = toPx(x0, fx);
    ctx.fillStyle = '#72ffa9';
    ctx.beginPath(); ctx.arc(point.x, point.y, 5, 0, Math.PI * 2); ctx.fill();
  }

  if (area != null) {
    const start = Math.min(a, b);
    const end = Math.max(a, b);
    const areaPts = sampleFunction(exp, start, end, 240).filter(p => p.y != null);
    ctx.fillStyle = 'rgba(76,240,255,0.14)';
    ctx.beginPath();
    const first = toPx(start, 0);
    ctx.moveTo(first.x, first.y);
    areaPts.forEach(p => {
      const px = toPx(p.x, p.y);
      ctx.lineTo(px.x, px.y);
    });
    const last = toPx(end, 0);
    ctx.lineTo(last.x, last.y);
    ctx.closePath();
    ctx.fill();
  }
}

function uniqueApprox(values, epsilon = 1e-3) {
  const sorted = values.filter(v => Number.isFinite(v)).sort((a, b) => a - b);
  const out = [];
  for (const v of sorted) if (!out.length || Math.abs(v - out[out.length - 1]) > epsilon) out.push(v);
  return out;
}

function bisect(exp, a, b, fnType = 'value', maxIter = 40) {
  let left = a;
  let right = b;
  const f = (x) => fnType === 'value' ? safeEval(exp, x) : fnType === 'derivative' ? numericalDerivative(exp, x) : secondDerivative(exp, x);
  let fa = f(left);
  let fb = f(right);
  if (fa == null || fb == null || fa * fb > 0) return null;
  for (let i = 0; i < maxIter; i++) {
    const mid = (left + right) / 2;
    const fm = f(mid);
    if (fm == null) return null;
    if (Math.abs(fm) < 1e-7) return mid;
    if (fa * fm <= 0) { right = mid; fb = fm; }
    else { left = mid; fa = fm; }
  }
  return (left + right) / 2;
}

function scanIntervals(exp, type = 'value', xMin = -20, xMax = 20, steps = 600) {
  const roots = [];
  const f = (x) => type === 'value' ? safeEval(exp, x) : type === 'derivative' ? numericalDerivative(exp, x) : secondDerivative(exp, x);
  let prevX = xMin;
  let prevY = f(prevX);
  const step = (xMax - xMin) / steps;
  for (let i = 1; i <= steps; i++) {
    const x = xMin + step * i;
    const y = f(x);
    if (prevY != null && y != null) {
      if (prevY === 0) roots.push(prevX);
      else if (y === 0 || prevY * y < 0) {
        const root = bisect(exp, prevX, x, type);
        if (root != null) roots.push(root);
      }
    }
    prevX = x;
    prevY = y;
  }
  return uniqueApprox(roots, 1e-2);
}

function renderAnalysisCards() {
  const exp = $('calcExpr').value.trim();
  const roots = scanIntervals(exp, 'value');
  const criticals = scanIntervals(exp, 'derivative');
  const inflections = scanIntervals(exp, 'second');
  analysisCards.innerHTML = [
    { title: '실근 후보', desc: roots.length ? roots.map(formatNumber).join(', ') : '찾지 못함' },
    { title: '극값 후보 x', desc: criticals.length ? criticals.map(formatNumber).join(', ') : '찾지 못함' },
    { title: '변곡 후보 x', desc: inflections.length ? inflections.map(formatNumber).join(', ') : '찾지 못함' },
  ].map(item => `
    <div class="lab-item">
      <span>${escapeHtml(item.title)}</span>
      <strong>${escapeHtml(item.desc)}</strong>
    </div>
  `).join('');
}

function syncMainToGraph() {
  if (!expression.trim()) return;
  $('graphExpr').value = expression;
}
function syncGraphToCalc() { $('calcExpr').value = $('graphExpr').value; }

function copyDisplay() {
  navigator.clipboard?.writeText(displayEl.textContent || '').catch(() => {});
}

function activateTab(name) {
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.tab === name));
  document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.toggle('active', panel.dataset.panel === name));
}

document.addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;
  if (btn.dataset.value) addToken(btn.dataset.value);
  if (btn.dataset.action) handleAction(btn.dataset.action);
  if (btn.dataset.fn) applyNamedFunction(btn.dataset.fn);
  if (btn.id === 'angleToggle') toggleAngleMode();
  if (btn.id === 'invToggle') toggleInverseMode();
  if (btn.id === 'copyDisplay') copyDisplay();
});

document.querySelectorAll('.helper-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    expression = btn.dataset.fill;
    updateDisplay();
  });
});

document.querySelectorAll('.tab-btn').forEach(btn => btn.addEventListener('click', () => activateTab(btn.dataset.tab)));

historyList.addEventListener('click', (e) => {
  const item = e.target.closest('.history-item');
  if (!item) return;
  const index = Number(item.dataset.historyIndex);
  expression = history[index].result;
  updateDisplay();
});

clearHistoryBtn.addEventListener('click', () => {
  history = [];
  localStorage.removeItem('super-engcalc-history');
  renderHistory();
});

$('plotBtn').addEventListener('click', () => {
  drawFunctionPlot(graphCanvas, $('graphExpr').value.trim(), {
    xMin: $('xMin').value,
    xMax: $('xMax').value,
    samples: $('samples').value,
  });
});

$('plotDerivativeBtn').addEventListener('click', () => {
  derivativeOverlay = !derivativeOverlay;
  $('plotDerivativeBtn').textContent = derivativeOverlay ? '도함수 숨기기' : '도함수 겹치기';
  $('plotBtn').click();
});
$('useMainExprBtn').addEventListener('click', () => { syncMainToGraph(); $('plotBtn').click(); });
$('syncCalcBtn').addEventListener('click', () => { syncGraphToCalc(); drawCalculusAnalysis(); renderAnalysisCards(); });
$('analyzeBtn').addEventListener('click', () => { drawCalculusAnalysis(); renderAnalysisCards(); });
$('findRootsBtn').addEventListener('click', renderAnalysisCards);
$('criticalBtn').addEventListener('click', renderAnalysisCards);
$('inflectionBtn').addEventListener('click', renderAnalysisCards);

document.addEventListener('keydown', (e) => {
  if (/^[0-9+\-*/().]$/.test(e.key)) addToken(e.key);
  else if (e.key === 'Enter') evaluateExpression();
  else if (e.key === 'Backspace') backspace();
  else if (e.key === 'Escape') clearAll();
});

renderHistory();
updateDisplay('0');
drawFunctionPlot(graphCanvas, $('graphExpr').value.trim(), { xMin: $('xMin').value, xMax: $('xMax').value, samples: $('samples').value });
drawCalculusAnalysis();
renderAnalysisCards();
