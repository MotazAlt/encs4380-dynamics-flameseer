/* Homework 2 / P3 + P4 — uses the same ToolkitCharts and control-panel conventions as P1/P2. */
(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const clamp = (value, limit) => Math.max(-limit, Math.min(limit, value));
  const fmt = (value, digits = 2) => Number(value.toFixed(digits)).toString();
  const valueOrDash = (value, unit = '') => value === null ? 'Not confirmed' : value.toFixed(2) + unit;
  const sampleFields = ['ts', 'kp', 'ki', 'kd', 'limit', 'duration', 'gain', 'tau'];
  const tuningFields = ['kp', 'ki', 'kd'];
  const defaultDigital = { ts: 0.02, kp: 2, ki: 3, kd: 0, limit: 12, duration: 12,
    gain: 1, tau: 1, target: 1, antiWindup: true };
  const session = { earned: 0, tested: 0, perfect: 0 };
  let challenge = null;
  let roundNumber = 0;
  let paintFrame = 0;

  function drawPlot(id, series, yLabel, limit = null) {
    ToolkitCharts.draw(id, series, {
      margin: { l: 54, r: 15, t: 34, b: 45 },
      hovermode: 'x unified',
      xaxis: { title: { text: 'Time (s)' } },
      yaxis: { title: { text: yLabel }, zeroline: true,
        ...(limit === null ? {} : { range: [-1.12 * limit, 1.12 * limit] }) }
    });
  }

  const trace = (x, y, name, line) => ({ x, y, name, mode: 'lines', line });
  const lineLimits = (duration, limit) => trace(
    [0, duration, null, 0, duration],
    [limit, limit, null, -limit, -limit],
    'Actuator limit', ToolkitCharts.line.limit
  );
  const referenceLine = (duration, target = 1) =>
    trace([0, duration], [target, target], 'Setpoint r', ToolkitCharts.line.setpoint);

  /* Digital position-form PID. The plant advances between samples using RK4; u[k] is held. */
  function simulateDigital(p) {
    const result = { t: [0], y: [0], sampleT: [], sampleU: [], clipped: 0 };
    let plant = 0;
    let integratedError = 0;
    let previousError = 0;
    let currentTime = 0;
    let lastCommand = 0;

    while (currentTime < p.duration - 1e-10) {
      const error = p.target - plant;
      const derivative = (error - previousError) / p.ts;
      const candidateIntegral = integratedError + error * p.ts;
      const candidateCommand = p.kp * error + p.ki * candidateIntegral + p.kd * derivative;
      // Conditional anti-windup: suppress integration only if error pushes deeper into clipping.
      const pushesHigh = candidateCommand > p.limit && error > 0;
      const pushesLow = candidateCommand < -p.limit && error < 0;
      if (!p.antiWindup || !(pushesHigh || pushesLow)) integratedError = candidateIntegral;
      // Apply the attempted command (clipped) even if the accumulator is frozen.
      // This keeps an integral-only controller capable of driving a saturated actuator.
      lastCommand = clamp(candidateCommand, p.limit);
      if (Math.abs(lastCommand) >= p.limit - 1e-9) result.clipped++;
      previousError = error;
      result.sampleT.push(currentTime);
      result.sampleU.push(lastCommand);

      const remaining = Math.min(p.ts, p.duration - currentTime);
      const segments = Math.ceil(remaining / 0.01);
      const dt = remaining / segments;
      const rate = value => (p.gain * lastCommand - value) / p.tau;
      for (let j = 0; j < segments; j++) {
        const a = rate(plant);
        const b = rate(plant + 0.5 * dt * a);
        const c = rate(plant + 0.5 * dt * b);
        const d = rate(plant + dt * c);
        plant += dt * (a + 2 * b + 2 * c + d) / 6;
        currentTime = Math.min(p.duration, currentTime + dt);
        result.t.push(currentTime);
        result.y.push(plant);
      }
    }
    result.sampleT.push(p.duration);
    result.sampleU.push(lastCommand);
    return result;
  }

  function crossing(t, y, level) {
    for (let i = 1; i < y.length; i++) {
      if (y[i - 1] < level && y[i] >= level) {
        const fraction = (level - y[i - 1]) / (y[i] - y[i - 1]);
        return t[i - 1] + fraction * (t[i] - t[i - 1]);
      }
    }
    return null;
  }

  function evaluate(target, data, duration) {
    const { t, y } = data;
    const ten = crossing(t, y, target * 0.1);
    const ninety = crossing(t, y, target * 0.9);
    const maxY = y.reduce((a, b) => Math.max(a, b), -Infinity);
    const overshoot = 100 * Math.max(0, (maxY - target) / Math.abs(target));
    const error = 100 * Math.abs(target - y.at(-1)) / Math.abs(target);
    let lastOutside = -1;
    for (let i = 0; i < y.length; i++) {
      if (Math.abs(target - y[i]) > 0.02 * Math.abs(target)) lastOutside = i;
    }
    // Require 0.5s of confirmed in-band behavior, rather than calling a last-sample crossing settled.
    const candidate = lastOutside < 0 ? 0 : (t[lastOutside + 1] ?? duration);
    const settling = duration - candidate >= 0.5 && lastOutside < y.length - 1 ? candidate : null;
    return { rise: ten === null || ninety === null ? null : ninety - ten,
      overshoot, settling, error };
  }

  function readDigital() {
    const p = { ...defaultDigital };
    for (const field of sampleFields) p[field] = Number($('p3-' + field).value);
    p.antiWindup = $('p3-antiwindup').checked;
    return p;
  }

  function updateDigitalLabels(p) {
    for (const field of sampleFields) {
      const unit = ['ts', 'duration', 'tau'].includes(field) ? ' s' : '';
      $('p3-' + field + '-value').textContent = fmt(p[field], 3) + unit;
    }
    $('p3-antiwindup').nextElementSibling.querySelector('strong').textContent =
      'Anti-windup ' + (p.antiWindup ? 'ON' : 'OFF');
  }

  function digitalCode(p) {
    const ms = Math.round(p.ts * 1000);
    return `// ENCS4380 — Digital PID (position form, sample-and-hold)
// Example Arduino UNO connections: A0 sensor, D9 PWM, D8 direction.
// Map the sensor reading and actuator command to your real hardware.
const int SENSOR_PIN = A0;
const int PWM_PIN = 9;
const int DIR_PIN = 8;
const unsigned long SAMPLE_MS = ${ms}UL;
const float Ts = ${p.ts.toFixed(3)}f;           // seconds
const float Kp = ${p.kp.toFixed(3)}f;
const float Ki = ${p.ki.toFixed(3)}f;
const float Kd = ${p.kd.toFixed(3)}f;
const float SETPOINT = 1.000f;
const float UMAX = ${p.limit.toFixed(3)}f;
const bool ANTI_WINDUP = ${p.antiWindup ? 'true' : 'false'};

float errorSum = 0.0f;     // integral of error, in error-seconds
float previousError = 0.0f;
unsigned long previousSample = 0;

void setup() {
  pinMode(PWM_PIN, OUTPUT);
  pinMode(DIR_PIN, OUTPUT);
  previousSample = millis() - SAMPLE_MS; // first update immediately
}

void loop() {
  unsigned long now = millis();
  if (now - previousSample < SAMPLE_MS) return;
  previousSample = now;

  float measurement = analogRead(SENSOR_PIN) / 1023.0f;
  float error = SETPOINT - measurement;
  float dError = (error - previousError) / Ts;
  float nextSum = errorSum + error * Ts;
  float proposed = Kp * error + Ki * nextSum + Kd * dError;

  // Match the simulator: block integration only if it worsens saturation.
  bool pushesFurther = (proposed > UMAX && error > 0.0f) ||
                       (proposed < -UMAX && error < 0.0f);
  if (!ANTI_WINDUP || !pushesFurther) errorSum = nextSum;

  // Apply the proposed command, even when anti-windup freezes the accumulator.
  float command = constrain(proposed, -UMAX, UMAX);
  previousError = error;

  digitalWrite(DIR_PIN, command >= 0.0f ? HIGH : LOW);
  int duty = (int)(255.0f * fabs(command) / UMAX + 0.5f);
  analogWrite(PWM_PIN, constrain(duty, 0, 255));
  // Actuator holds this PWM duty until the next loop update.
}
`;
  }

  function renderP3() {
    if ($('control-p3').hidden) return;
    const p = readDigital();
    updateDigitalLabels(p);
    const sampled = simulateDigital(p);
    const fast = p.ts === 0.02 ? sampled : simulateDigital({ ...p, ts: 0.02 });
    const m = evaluate(p.target, sampled, p.duration);
    const mf = evaluate(p.target, fast, p.duration);
    const ref = trace(fast.t, fast.y, 'Fast reference (0.02s)',
      { ...ToolkitCharts.line.controller, width: 2, dash: 'dot' });
    drawPlot('p3-response-plot', [
      trace(sampled.t, sampled.y, 'Digital PID output', ToolkitCharts.line.process),
      ...(p.ts !== 0.02 ? [ref] : []), referenceLine(p.duration)
    ], 'Plant output');
    drawPlot('p3-command-plot', [
      { ...trace(sampled.sampleT, sampled.sampleU, 'Held command u[k]', ToolkitCharts.line.controller),
        line: { ...ToolkitCharts.line.controller, width: 2.7, dash: 'solid', shape: 'hv' } },
      lineLimits(p.duration, p.limit)
    ], 'Controller command', p.limit);
    ToolkitCharts.renderMetrics('p3-metrics', [
      ['Rise time (10–90%)', valueOrDash(m.rise, ' s')],
      ['Overshoot (%OS)', valueOrDash(m.overshoot, '%')],
      ['Settling time (±2%)', valueOrDash(m.settling, ' s')],
      ['End-window |error|', valueOrDash(m.error, '%')],
      ['Fast-reference settling', valueOrDash(mf.settling, ' s')]
    ]);
    $('p3-metrics-note').textContent =
      `${sampled.sampleT.length - 1} controller updates over ${p.duration}s; ` +
      `${sampled.clipped} command samples touch a limit. ` +
      'Rise, overshoot and settling are measured against the unit setpoint. ' +
      (m.settling === null ? 'A ±2% settling time was not confirmed in this window.' :
        'Decrease Ts to compare with the fine-sampling reference.');
    $('p3-code').textContent = digitalCode(p);
    $('p3-copy-status').textContent = '';
  }

  /* P4: the same first-/second-order dynamics and filtered derivative used by P1. */
  function simulateTuning(plant, gains) {
    const duration = 16;
    const steps = Math.ceil(duration / 0.002);
    const dt = duration / steps;
    const x = [0, 0, 0, 0]; // output, velocity, integral, filtered output
    const stage = x.slice();
    const ks = [x.slice(), x.slice(), x.slice(), x.slice()];
    const t = new Array(steps + 1);
    const y = new Array(steps + 1);
    const u = new Array(steps + 1);
    const filter = 0.05;
    const limit = 12;
    const command = state => clamp(gains.kp * (1 - state[0]) + gains.ki * state[2] -
      gains.kd * (state[0] - state[3]) / filter, limit);
    function derivative(state, out) {
      const cmd = command(state);
      const difference = plant.gain * cmd - state[0];
      out[0] = plant.type === 'first' ? difference / plant.tau : state[1];
      out[1] = plant.type === 'second' ? plant.wn ** 2 * difference -
        2 * plant.zeta * plant.wn * state[1] : 0;
      out[2] = 1 - state[0];
      out[3] = (state[0] - state[3]) / filter;
    }
    for (let i = 0; i <= steps; i++) {
      t[i] = i * dt;
      y[i] = x[0];
      u[i] = command(x);
      if (i === steps) break;
      const [a, b, c, d] = ks;
      derivative(x, a);
      for (let j = 0; j < 4; j++) stage[j] = x[j] + dt * a[j] * 0.5;
      derivative(stage, b);
      for (let j = 0; j < 4; j++) stage[j] = x[j] + dt * b[j] * 0.5;
      derivative(stage, c);
      for (let j = 0; j < 4; j++) stage[j] = x[j] + dt * c[j];
      derivative(stage, d);
      for (let j = 0; j < 4; j++) x[j] += dt * (a[j] + 2 * b[j] + 2 * c[j] + d[j]) / 6;
    }
    return { t, y, u };
  }

  function randomBetween(min, max) { return min + (max - min) * Math.random(); }
  function createPlant() {
    const type = Math.random() < 0.5 ? 'first' : 'second';
    return {
      type, gain: randomBetween(0.8, 1.25),
      ...(type === 'first' ? { tau: randomBetween(0.65, 1.5) } :
        { zeta: randomBetween(0.34, 0.78), wn: randomBetween(1.4, 3.1) }),
      specOS: Math.round(randomBetween(8, 13)),
      specSettling: Number((type === 'first' ? randomBetween(3.5, 5.5) :
        randomBetween(3.5, 5.5)).toFixed(1))
    };
  }
  function readTuning() { return Object.fromEntries(tuningFields.map(key => [key, Number($('p4-' + key).value)])); }
  function updateTuningLabels() {
    const gains = readTuning();
    for (const field of tuningFields) $('p4-' + field + '-value').textContent = fmt(gains[field]);
    return gains;
  }
  function updateScore() {
    $('p4-score').textContent = `${session.earned} / ${session.tested * 100}`;
    $('p4-score-detail').textContent = `${session.tested} tested · ${session.perfect} perfect rounds`;
  }
  function newPlant() {
    challenge = { plant: createPlant(), best: 0, tested: false, locked: false, latest: null };
    // Begin every challenge with the same P-only baseline; the user must add I/D if needed.
    for (const [field, value] of [['kp', 2], ['ki', 0], ['kd', 0]]) $('p4-' + field).value = value;
    updateTuningLabels();
    roundNumber++;
    $('p4-round-number').textContent = `ROUND ${String(roundNumber).padStart(2, '0')}`;
    $('p4-plant-type').textContent = 'HIDDEN MODEL';
    $('p4-round-description').textContent = 'Unknown model parameters; a unit-step reference and ±12 actuator limit are fixed.';
    $('p4-reveal').disabled = true;
    $('p4-test').disabled = false;
    for (const field of tuningFields) $('p4-' + field).disabled = false;
    $('p4-reveal-note').hidden = true;
    $('p4-reveal-note').textContent = '';
    $('p4-result-summary').textContent = '';
    $('p4-result-summary').className = 'feedback';
    $('p4-results').innerHTML = '<tr><td colspan="4" class="muted">Tune the gains, then press Test Tuning.</td></tr>';
    $('p4-test-note').textContent = 'Test your tuning to score this hidden plant.';
    ToolkitCharts.renderMetrics('p4-specs', [
      ['Maximum overshoot', `≤ ${challenge.plant.specOS}%`],
      ['Settling time (±2%)', `≤ ${challenge.plant.specSettling.toFixed(1)} s`],
      ['End-window error', '≤ 1% (≈ zero)']
    ]);
    updateScore();
    renderP4();
  }

  function downsample(data) {
    const stride = Math.max(1, Math.ceil((data.t.length - 1) / 1100));
    const ids = [];
    for (let i = 0; i < data.t.length - 1; i += stride) ids.push(i);
    ids.push(data.t.length - 1);
    return {
      t: ids.map(i => data.t[i]), y: ids.map(i => data.y[i]),
      u: ids.map(i => data.u[i])
    };
  }

  function drawTuning(data) {
    const reduced = downsample(data);
    drawPlot('p4-response-plot', [
      trace(reduced.t, reduced.y, 'Plant output y', ToolkitCharts.line.process),
      referenceLine(16)
    ], 'Plant output');
    drawPlot('p4-command-plot', [
      trace(reduced.t, reduced.u, 'PID command u(t)', ToolkitCharts.line.controller),
      lineLimits(16, 12)
    ], 'Controller command', 12);
  }

  function renderP4() {
    if ($('control-p4').hidden || !challenge) return;
    const gains = updateTuningLabels();
    const data = challenge.latest ? challenge.latest.data : simulateTuning(challenge.plant, gains);
    drawTuning(data);
  }

  function testTuning() {
    if (!challenge || challenge.locked) return;
    const gains = updateTuningLabels();
    const data = simulateTuning(challenge.plant, gains);
    const result = evaluate(1, data, 16);
    const entries = [
      { label: 'Peak overshoot', limit: `≤ ${challenge.plant.specOS}%`, measured: valueOrDash(result.overshoot, '%'),
        pass: result.overshoot <= challenge.plant.specOS },
      { label: 'Settling time (±2%)', limit: `≤ ${challenge.plant.specSettling.toFixed(1)} s`,
        measured: valueOrDash(result.settling, ' s'),
        pass: result.settling !== null && result.settling <= challenge.plant.specSettling },
      { label: 'Steady-state error (numeric)', limit: '≤ 1%', measured: valueOrDash(result.error, '%'),
        pass: result.error <= 1 }
    ];
    const points = entries.reduce((sum, entry, i) => sum + (entry.pass ? [34, 33, 33][i] : 0), 0);
    if (!challenge.tested) {
      session.tested++;
      challenge.tested = true;
    }
    if (points > challenge.best) {
      if (challenge.best < 100 && points === 100) session.perfect++;
      session.earned += points - challenge.best;
      challenge.best = points;
    }
    challenge.latest = { data, result, gains, entries };
    $('p4-results').innerHTML = entries.map(entry =>
      `<tr><th scope="row">${entry.label}</th><td>${entry.limit}</td><td class="mono">${entry.measured}</td>` +
        `<td><span class="validation-result ${entry.pass ? 'pass' : 'fail'}">${entry.pass ? 'PASS' : 'FAIL'}</span></td></tr>`
    ).join('');
    const passed = entries.filter(entry => entry.pass).length;
    const message = `${passed} / 3 specifications passed · this attempt ${points}/100 · ` +
      `best this round ${challenge.best}/100.`;
    $('p4-result-summary').textContent = message;
    $('p4-result-summary').classList.toggle('wrong', passed !== 3);
    $('p4-test-note').textContent = passed === 3 ? 'All targets met. Try a new plant, or reveal this one.' :
      'Change your gains and test again; only your best result is scored.';
    $('p4-reveal').disabled = false;
    updateScore();
    drawTuning(data);
  }

  function revealPlant() {
    if (!challenge || !challenge.tested || challenge.locked) return;
    challenge.locked = true;
    const p = challenge.plant;
    $('p4-reveal-note').hidden = false;
    $('p4-reveal-note').textContent = p.type === 'first' ?
      `Revealed: first-order K = ${fmt(p.gain, 3)}, τ = ${fmt(p.tau, 3)} s. Model G(s) = K/(τs+1).` :
      `Revealed: second-order K = ${fmt(p.gain, 3)}, ζ = ${fmt(p.zeta, 3)}, ωn = ${fmt(p.wn, 3)} rad/s.`;
    $('p4-plant-type').textContent = p.type === 'first' ? 'FIRST-ORDER PLANT' : 'SECOND-ORDER PLANT';
    $('p4-test').disabled = true;
    $('p4-reveal').disabled = true;
    $('p4-test-note').textContent = 'This round is finished. Select New Plant to continue.';
    for (const field of tuningFields) $('p4-' + field).disabled = true;
  }

  function prediction(prefix, explanation) {
    const value = $(prefix + '-prediction').value;
    const message = $(prefix + '-prediction-feedback');
    message.classList.toggle('wrong', value !== 'correct');
    message.textContent = !value ? 'Choose a prediction first.' :
      value === 'correct' ? `Correct. ${explanation}` : `Try again. ${explanation}`;
  }

  function queueP3() {
    cancelAnimationFrame(paintFrame);
    paintFrame = requestAnimationFrame(renderP3);
  }

  for (const field of sampleFields) $('p3-' + field).addEventListener('input', queueP3);
  $('p3-antiwindup').addEventListener('change', queueP3);
  for (const button of $('control-p3').querySelectorAll('[data-p3-preset]')) {
    button.addEventListener('click', () => {
      $('p3-ts').value = { fast: 0.02, medium: 0.3, slow: 1.22 }[button.dataset.p3Preset];
      queueP3();
    });
  }
  $('p3-copy-plant').addEventListener('click', () => {
    for (const [field, source] of [['gain', 'gain'], ['tau', 'tau']]) {
      const slider = $('p3-' + field);
      const value = Number($(source).value);
      if (value < Number(slider.min)) slider.min = value;
      if (value > Number(slider.max)) slider.max = value;
      slider.value = value;
      const bounds = slider.nextElementSibling.children;
      const suffix = field === 'tau' ? ' s' : '';
      bounds[0].textContent = fmt(Number(slider.min)) + suffix;
      bounds[1].textContent = fmt(Number(slider.max)) + suffix;
    }
    queueP3();
  });
  $('p3-copy-code').addEventListener('click', async () => {
    const content = $('p3-code').textContent;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(content);
      } else {
        const helper = document.createElement('textarea');
        helper.value = content;
        helper.style.position = 'fixed';
        helper.style.opacity = '0';
        document.body.appendChild(helper);
        helper.focus();
        helper.select();
        if (!document.execCommand('copy')) throw new Error('Copy blocked');
        helper.remove();
      }
      $('p3-copy-status').textContent = 'Arduino code copied.';
      $('p3-copy-status').classList.remove('wrong');
    } catch (error) {
      $('p3-copy-status').textContent = 'Clipboard blocked. Select and copy the code manually.';
      $('p3-copy-status').classList.add('wrong');
    }
  });
  $('p3-check-prediction').addEventListener('click', () => prediction('p3',
    'Longer sampling intervals leave the plant running on an older command between measurements.'));
  $('p4-check-prediction').addEventListener('click', () => prediction('p4',
    'An integral term accumulates residual error and drives it toward zero for a stable reachable step.'));
  for (const field of tuningFields) $('p4-' + field).addEventListener('input', () => {
    updateTuningLabels();
    if (challenge && challenge.tested && !challenge.locked)
      $('p4-test-note').textContent = 'Gains changed — press Test Tuning to update results.';
  });
  $('control-p4').querySelectorAll('[data-p4-preset]').forEach(button => {
    button.addEventListener('click', () => {
      if (challenge && challenge.locked) return;
      const presets = { p: [3, 0, 0], pi: [2, 2, 0], pid: [2, 2, 0.5] };
      const preset = presets[button.dataset.p4Preset];
      tuningFields.forEach((field, i) => $('p4-' + field).value = preset[i]);
      updateTuningLabels();
      if (challenge && challenge.tested) $('p4-test-note').textContent = 'Preset selected — test again to score.';
    });
  });
  $('p4-new-round').addEventListener('click', newPlant);
  $('p4-test').addEventListener('click', testTuning);
  $('p4-reveal').addEventListener('click', revealPlant);

  newPlant();
  window.PIDExtras = {
    render(route) { if (route === 'control-p3') renderP3(); else if (route === 'control-p4') renderP4(); },
    // Exposed for simple local verification without affecting P1/P2.
    simulateDigital, simulateTuning, evaluate
  };
})();
