// Module 1: First-Order Sensor Time Response
const POINTS = 300;

let initialReading = 20;
let unit = '°C';
let savedStepA = 60;
let savedRampR = 2;

function getEl(id) {
  return document.getElementById(id);
}

// Step response change: y(t) - y(0) = K * A * (1 - e^(-t / tau))
function stepResponse(t, K, A, tau) {
  return K * A * (1 - Math.exp(-t / tau));
}

// Ramp response change: y(t) - y(0) = K * R * (t - tau + tau * e^(-t / tau))
function rampResponse(t, K, R, tau) {
  return K * R * (t - tau + tau * Math.exp(-t / tau));
}

function getParams() {
  return {
    mode: document.querySelector('#module-1 input[name="mode"]:checked').value,
    tau: Number(getEl('tau').value),
    K: Number(getEl('gain').value),
    input: Number(getEl('amount').value)
  };
}

function updateReadouts(p) {
  const isStep = p.mode === 'step';

  getEl('tauVal').textContent = p.tau.toFixed(1) + ' s';
  getEl('gainVal').textContent = p.K.toFixed(1);
  getEl('amountVal').textContent = isStep ? p.input.toFixed(0) : p.input.toFixed(1) + '/s';
  getEl('amountLabel').textContent = isStep ? 'Step magnitude (A)' : 'Ramp slope (R)';
  getEl('scenarioNote').textContent = 'Initial sensor reading y(0): ' + initialReading + (unit ? ' ' + unit : '');

  const items = isStep
    ? [
        ['63.2% Time (τ)', p.tau.toFixed(1) + ' s'],
        ['95.0% Time (3τ)', (3 * p.tau).toFixed(1) + ' s'],
        ['Steady-State Reading', (initialReading + p.K * p.input).toFixed(2) + (unit ? ' ' + unit : '')]
      ]
    : [
        ['Ramp Time Lag (τ)', p.tau.toFixed(1) + ' s'],
        ['Steady-State Error (KRτ)', (p.K * p.input * p.tau).toFixed(2) + (unit ? ' ' + unit : '')],
        ['Steady-State Slope (KR)', (p.K * p.input).toFixed(2) + '/s']
      ];

  getEl('metricsGrid').innerHTML = items.map(([label, val]) => `
    <div class="metric-item">
      <div class="metric-label">${label}</div>
      <div class="metric-value mono">${val}</div>
    </div>
  `).join('');
}

const baseLayout = {
  paper_bgcolor: '#ffffff',
  plot_bgcolor: '#ffffff',
  font: { family: 'system-ui, sans-serif', color: '#111827', size: 13 },
  margin: { l: 52, r: 16, t: 32, b: 44 },
  legend: { orientation: 'h', x: 0, y: 1.12 }
};

const axisStyle = {
  gridcolor: '#e5e7eb',
  linecolor: '#9ca3af',
  zeroline: false,
  fixedrange: true
};

function drawTimePlot(p) {
  const isStep = p.mode === 'step';
  const timeEnd = 8 * p.tau;
  const t = [];
  const ideal = [];
  const sensor = [];

  for (let i = 0; i <= POINTS; i++) {
    const time = (i * timeEnd) / POINTS;
    t.push(time);

    if (isStep) {
      ideal.push(initialReading + p.K * p.input);
      sensor.push(initialReading + stepResponse(time, p.K, p.input, p.tau));
    } else {
      ideal.push(initialReading + p.K * p.input * time);
      sensor.push(initialReading + rampResponse(time, p.K, p.input, p.tau));
    }
  }

  const traces = [
    { x: t, y: ideal, name: 'Ideal (Kx)', mode: 'lines', line: { color: '#374151', width: 2, dash: 'dash' } },
    { x: t, y: sensor, name: 'Sensor y(t)', mode: 'lines', line: { color: '#0f766e', width: 3 } }
  ];

  let shapes = [];
  let annotations = [];

  if (isStep) {
    const t1 = p.tau;
    const t3 = 3 * p.tau;
    const y1 = initialReading + stepResponse(t1, p.K, p.input, p.tau);
    const y3 = initialReading + stepResponse(t3, p.K, p.input, p.tau);

    traces.push({
      x: [t1, t3],
      y: [y1, y3],
      text: ['63.2% (τ)', '95.0% (3τ)'],
      mode: 'markers+text',
      textposition: ['top right', 'bottom left'],
      hovertext: ['τ: 63.2% of the final change', '3τ: 95.0% of the final change'],
      hoverinfo: 'text+x+y',
      showlegend: false,
      marker: { size: 9, color: '#b91c1c' }
    });

    shapes = [
      { type: 'line', x0: t1, y0: initialReading, x1: t1, y1: y1, line: { color: '#9ca3af', dash: 'dot', width: 1.5 } },
      { type: 'line', x0: 0, y0: y1, x1: t1, y1: y1, line: { color: '#9ca3af', dash: 'dot', width: 1.5 } },
      { type: 'line', x0: t3, y0: initialReading, x1: t3, y1: y3, line: { color: '#9ca3af', dash: 'dot', width: 1.5 } },
      { type: 'line', x0: 0, y0: y3, x1: t3, y1: y3, line: { color: '#9ca3af', dash: 'dot', width: 1.5 } }
    ];

    getEl('timeNote').textContent = `At t = τ (${t1.toFixed(1)} s), reading = ${y1.toFixed(2)}. At t = 3τ (${t3.toFixed(1)} s), reading = ${y3.toFixed(2)}.`;
  } else {
    const slope = p.K * p.input;
    traces.push({
      x: t,
      y: t.map(time => time < p.tau ? null : initialReading + slope * (time - p.tau)),
      name: 'Steady-state asymptote',
      mode: 'lines',
      line: { color: '#926c46', width: 1.8, dash: 'dot' }
    });
    const tRef = 0.8 * timeEnd;
    const yLow = initialReading + slope * (tRef - p.tau);
    const yHigh = initialReading + slope * tRef;

    shapes = [
      { type: 'line', x0: tRef, y0: yLow, x1: tRef, y1: yHigh, line: { color: '#b91c1c', width: 2 } },
      { type: 'line', x0: tRef - p.tau, y0: yLow, x1: tRef, y1: yLow, line: { color: '#111827', width: 2 } }
    ];

    annotations = [
      { x: tRef, y: (yLow + yHigh) / 2, text: 'Asymptotic error = KRτ', showarrow: false, xanchor: 'left', xshift: 6, font: { color: '#b91c1c' } },
      { x: tRef - p.tau / 2, y: yLow, text: 'Lag = τ', showarrow: false, yshift: 12, font: { color: '#111827' } }
    ];

    getEl('timeNote').textContent = `The dotted line is the steady-state asymptote: time lag τ = ${p.tau.toFixed(1)} s, limiting error KRτ = ${(slope * p.tau).toFixed(2)}.`;
  }

  const yMax = Math.max(ideal[ideal.length - 1] * 1.15, 2);

  Plotly.react('timePlot', traces, {
    ...baseLayout,
    shapes,
    annotations,
    xaxis: { ...axisStyle, title: { text: 'Time (s)' }, range: [0, timeEnd] },
    yaxis: { ...axisStyle, title: { text: 'Reading' }, range: [0, yMax] }
  }, { responsive: true, displayModeBar: false });
  return { t, ideal, sensor };
}

function drawLogPlot(p, samples) {
  const { t, ideal, sensor } = samples;
  const timeEnd = t[t.length - 1];
  const fractions = sensor.map((y, i) => p.mode === 'step'
    ? (ideal[i] - y) / (p.K * p.input)
    : 1 - (ideal[i] - y) / (p.K * p.input * p.tau));

  const trace = {
    x: t,
    y: fractions,
    customdata: fractions.map(Math.log),
    hovertemplate: 't = %{x:.3g} s<br>Error fraction = %{y:.4g}<br>ln(fraction) = %{customdata:.4f}<extra></extra>',
    mode: 'lines',
    line: { color: '#0f766e', width: 3 }
  };

  Plotly.react('logPlot', [trace], {
    ...baseLayout,
    showlegend: false,
    xaxis: { ...axisStyle, title: { text: 'Time (s)' }, range: [0, timeEnd] },
    yaxis: { ...axisStyle, type: 'log', title: { text: 'Error fraction (log scale)' } }
  }, { responsive: true, displayModeBar: false });

  const slope = ((Math.log(fractions[fractions.length - 1]) - Math.log(fractions[0])) / timeEnd).toFixed(4);
  getEl('slopeVal').textContent = `ln-slope = -1/τ = ${slope} s⁻¹`;
  getEl('logNote').textContent = p.mode === 'step'
    ? 'Step error fraction (y∞ − y(t)) / (KA) on a log axis. The slope of ln(error fraction) is −1/τ.'
    : 'Ramp transient error fraction 1 − (ideal − y) / (KRτ) on a log axis. The slope of ln(error fraction) is −1/τ.';
}

function stepBenchmarks(p) {
  const A = p.mode === 'step' ? p.input : savedStepA;
  const KA = p.K * A;
  return [
    { row: 1, label: '1 / Step at τ', time: p.tau, expectedRatio: 0.6321 },
    { row: 2, label: '1 / Step at 3τ', time: 3 * p.tau, expectedRatio: 0.9502 }
  ].map(c => {
    const actual = stepResponse(c.time, p.K, A, p.tau);
    const ratio = actual / KA;
    return {
      ...c,
      expected: `${(KA * c.expectedRatio).toFixed(2)} (${(c.expectedRatio * 100).toFixed(1)}%)`,
      computed: `${actual.toFixed(2)} (${(ratio * 100).toFixed(1)}%)`,
      result: Math.abs(ratio - c.expectedRatio) < 0.001 ? 'PASS' : 'FAIL'
    };
  });
}

function runValidation(p) {
  const checks = stepBenchmarks(p);
  for (const c of checks) {
    getEl('expected' + c.row).textContent = c.expected;
    getEl('computed' + c.row).textContent = c.computed;
    getEl('result' + c.row).textContent = c.result;
    getEl('result' + c.row).className = c.result === 'PASS' ? 'mono bold pass' : 'mono bold fail';
  }
  const passed = checks.filter(c => c.result === 'PASS').length;
  getEl('checkSummary').textContent = `${passed} / 2 Checks Passed`;
  getEl('checkSummary').className = passed === 2 ? 'mono bold pass' : 'mono bold fail';
}

function validationRows() {
  return stepBenchmarks(getParams()).map(c => [c.label, c.expected, c.computed, c.result]);
}

const questions = {
  step: {
    prompt: 'Before moving the τ slider: If you double τ, what happens to the 63.2% response time and the log-error slope?',
    options: [
      '63.2% time doubles, and the log-error slope becomes half as steep',
      '63.2% time halves, and the log-error slope doubles',
      'Neither changes because static gain K is constant'
    ],
    correctIndex: 0,
    explanation: 'Correct! The 63.2% point occurs at t = τ (so doubling τ doubles the time), and the log-error slope is -1/τ (so doubling τ halves the steepness).'
  },
  ramp: {
    prompt: 'Before moving the τ slider: In Ramp mode, if you double τ, what happens to the steady-state time lag and output slope?',
    options: [
      'Time lag doubles, while the steady-state output slope remains K·R',
      'Both the time lag and the output slope double',
      'Time lag stays the same, but the output slope halves'
    ],
    correctIndex: 0,
    explanation: 'Correct! Once the transient dies out, the sensor follows the same slope (K·R) but lags behind in time by τ, creating a steady-state error of K·R·τ.'
  }
};

function loadQuestion() {
  const mode = getParams().mode;
  const q = questions[mode];
  getEl('questionText').textContent = q.prompt;
  getEl('answerSelect').innerHTML =
    '<option value="">-- Choose your prediction --</option>' +
    q.options.map((opt, idx) => `<option value="${idx}">${opt}</option>`).join('');
  getEl('feedbackText').textContent = '';
}

function checkPrediction() {
  const selected = getEl('answerSelect').value;
  const feedback = getEl('feedbackText');

  if (selected === '') {
    feedback.textContent = 'Please select an option first.';
    feedback.className = 'feedback wrong';
    return;
  }

  const q = questions[getParams().mode];
  if (Number(selected) === q.correctIndex) {
    feedback.textContent = q.explanation;
    feedback.className = 'feedback';
  } else {
    feedback.textContent = 'Not quite. Try moving the τ slider to observe the curve and check again.';
    feedback.className = 'feedback wrong';
  }
}

function updateAll() {
  const p = getParams();
  if (p.mode === 'step') savedStepA = p.input;
  else savedRampR = p.input;

  updateReadouts(p);
  const samples = drawTimePlot(p);
  drawLogPlot(p, samples);
  runValidation(p);
}

function switchMode() {
  const isRamp = getParams().mode === 'ramp';
  const amountSlider = getEl('amount');

  amountSlider.min = isRamp ? '0.5' : '1';
  amountSlider.max = isRamp ? '10' : '100';
  amountSlider.step = isRamp ? '0.5' : '1';
  amountSlider.value = isRamp ? savedRampR : savedStepA;

  getEl('amountMin').textContent = isRamp ? '0.5/s' : '1';
  getEl('amountMax').textContent = isRamp ? '10/s' : '100';

  loadQuestion();
  updateAll();
}

function applyPreset(isTea) {
  initialReading = isTea ? 20 : 0;
  unit = isTea ? '°C' : '';
  savedStepA = isTea ? 60 : 1;

  getEl('tau').value = isTea ? 10 : 5;
  getEl('gain').value = 1;
  document.querySelector('#module-1 input[name="mode"][value="step"]').checked = true;
  switchMode();
}

document.querySelectorAll('#module-1 input[type="range"]').forEach(slider => {
  slider.addEventListener('input', updateAll);
});

document.querySelectorAll('#module-1 input[name="mode"]').forEach(radio => {
  radio.addEventListener('change', switchMode);
});

getEl('checkBtn').addEventListener('click', checkPrediction);
getEl('teaBtn').addEventListener('click', () => applyPreset(true));
getEl('unitBtn').addEventListener('click', () => applyPreset(false));

loadQuestion();
updateAll();
window.Module1 = { updateAll, validationRows };
