// 1. Simulation Constants & State
const TIME_END = 80;
const POINTS = 300;

let initialReading = 20;
let unit = '°C';
let savedStepA = 60;
let savedRampR = 2;

function getEl(id) {
  return document.getElementById(id);
}

// 2. First-Order Sensor Equations
// Step response change: y(t) - y(0) = K * A * (1 - e^(-t / tau))
function stepResponse(t, K, A, tau) {
  return K * A * (1 - Math.exp(-t / tau));
}

// Ramp response change: y(t) - y(0) = K * R * (t - tau + tau * e^(-t / tau))
function rampResponse(t, K, R, tau) {
  return K * R * (t - tau + tau * Math.exp(-t / tau));
}

// Log error fraction: ln(error) = -t / tau
function logError(t, tau) {
  return -t / tau;
}

// 3. Read Current Slider Controls
function getParams() {
  return {
    mode: document.querySelector('input[name="mode"]:checked').value,
    tau: Number(getEl('tau').value),
    K: Number(getEl('gain').value),
    input: Number(getEl('amount').value)
  };
}

// 4. Update Text Readouts & Measurements
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

// 5. Shared Plotly Layout (Pure White Background)
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

// 6. Draw Time Response Plot
function drawTimePlot(p) {
  const isStep = p.mode === 'step';
  const t = [];
  const ideal = [];
  const sensor = [];

  for (let i = 0; i <= POINTS; i++) {
    const time = (i * TIME_END) / POINTS;
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
      textposition: 'bottom right',
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
    const tRef = 65;
    const yLow = initialReading + slope * (tRef - p.tau);
    const yHigh = initialReading + slope * tRef;

    shapes = [
      // Vertical line showing steady-state error KR*tau
      { type: 'line', x0: tRef, y0: yLow, x1: tRef, y1: yHigh, line: { color: '#b91c1c', width: 2 } },
      // Horizontal line showing ramp time lag tau
      { type: 'line', x0: tRef - p.tau, y0: yLow, x1: tRef, y1: yLow, line: { color: '#111827', width: 2 } }
    ];

    annotations = [
      { x: tRef, y: (yLow + yHigh) / 2, text: 'Error = KRτ', showarrow: false, xanchor: 'left', xshift: 6, font: { color: '#b91c1c' } },
      { x: tRef - p.tau / 2, y: yLow, text: 'Lag = τ', showarrow: false, yshift: 12, font: { color: '#111827' } }
    ];

    getEl('timeNote').textContent = `In steady state, the sensor lags behind the ramp by τ = ${p.tau.toFixed(1)} s with vertical error KRτ = ${(slope * p.tau).toFixed(2)}.`;
  }

  const yMax = Math.max(ideal[ideal.length - 1] * 1.15, 2);

  Plotly.react('timePlot', traces, {
    ...baseLayout,
    shapes,
    annotations,
    xaxis: { ...axisStyle, title: 'Time (s)', range: [0, TIME_END] },
    yaxis: { ...axisStyle, title: 'Reading', range: [0, yMax] }
  }, { responsive: true, displayModeBar: false });
}

// 7. Draw Log Error-Fraction Plot
function drawLogPlot(p) {
  const t = [];
  const logVals = [];

  for (let i = 0; i <= POINTS; i++) {
    const time = (i * TIME_END) / POINTS;
    t.push(time);
    logVals.push(logError(time, p.tau));
  }

  const trace = {
    x: t,
    y: logVals,
    mode: 'lines',
    line: { color: '#0f766e', width: 3 }
  };

  // Show the full log-error line for the selected time constant
  Plotly.react('logPlot', [trace], {
    ...baseLayout,
    showlegend: false,
    xaxis: { ...axisStyle, title: 'Time (s)', range: [0, TIME_END] },
    yaxis: { ...axisStyle, title: 'ln(error fraction)', range: [-Math.max(5, TIME_END / p.tau), 0] }
  }, { responsive: true, displayModeBar: false });

  const slope = (-1 / p.tau).toFixed(4);
  getEl('slopeVal').textContent = `Slope = -1/τ = ${slope} s⁻¹`;
  getEl('logNote').textContent = 'The slope of ln(error fraction) vs. time is -1/τ. A larger τ produces a flatter slope.';
}

// 8. Run Validation Check 1
function runValidation(p) {
  const KA = p.K * savedStepA;
  const checks = [
    { row: 1, time: p.tau, expectedRatio: 0.6321 },
    { row: 2, time: 3 * p.tau, expectedRatio: 0.9502 }
  ];

  let passCount = 0;

  for (const c of checks) {
    const computedChange = stepResponse(c.time, p.K, savedStepA, p.tau);
    const computedRatio = computedChange / KA;
    const isPass = Math.abs(computedRatio - c.expectedRatio) < 0.001;
    if (isPass) passCount++;

    getEl('expected' + c.row).textContent = `${(c.expectedRatio * KA).toFixed(2)} (${(c.expectedRatio * 100).toFixed(1)}%)`;
    getEl('computed' + c.row).textContent = `${computedChange.toFixed(2)} (${(computedRatio * 100).toFixed(1)}%)`;
    getEl('result' + c.row).textContent = isPass ? 'PASS' : 'FAIL';
    getEl('result' + c.row).className = isPass ? 'mono bold pass' : 'mono bold fail';
  }

  getEl('checkSummary').textContent = `${passCount} / 2 Checks Passed`;
}

// 9. Predict, Then Check Logic
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

// 10. Mode Switching, Presets & Event Listeners
function updateAll() {
  const p = getParams();
  if (p.mode === 'step') savedStepA = p.input;
  else savedRampR = p.input;

  updateReadouts(p);
  drawTimePlot(p);
  drawLogPlot(p);
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
  document.querySelector('input[name="mode"][value="step"]').checked = true;
  switchMode();
}

document.querySelectorAll('input[type="range"]').forEach(slider => {
  slider.addEventListener('input', updateAll);
});

document.querySelectorAll('input[name="mode"]').forEach(radio => {
  radio.addEventListener('change', switchMode);
});

getEl('checkBtn').addEventListener('click', checkPrediction);
getEl('teaBtn').addEventListener('click', () => applyPreset(true));
getEl('unitBtn').addEventListener('click', () => applyPreset(false));

loadQuestion();
updateAll();