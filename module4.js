// Module 4: randomized sensor identification, noisy measurements and session scoring.
(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const TWO_PI = 2 * Math.PI;
  const session = { rounds: 0, earned: 0, perfect: 0 };
  let roundNumber = 0;
  let current = null;

  function randomBetween(min, max) {
    return min + (max - min) * Math.random();
  }
  function display(value, digits = 3) {
    return Number(value.toFixed(digits)).toString();
  }
  // The sum of uniform samples gives a small, zero-centered noise distribution.
  function noise(std) {
    return std * (Math.random() + Math.random() + Math.random() + Math.random() - 2) * Math.sqrt(3);
  }

  function makeSensor() {
    const choices = ['first-step', 'first-sine', 'second-step'];
    const kind = choices[Math.floor(Math.random() * choices.length)];
    const sensor = { kind, revealed: false, hintIndex: 0, t: [], trueY: [], noisyY: [], inputY: [] };

    if (kind === 'second-step') {
      sensor.zeta = randomBetween(0.15, 0.8);
      sensor.wn = randomBetween(1.2, 6.2);
      // Random padding keeps the window from encoding an exact hidden parameter.
      sensor.end = randomBetween(5, 8) / (sensor.zeta * sensor.wn);
    } else {
      sensor.K = randomBetween(0.65, 2.25);
      sensor.tau = kind === 'first-step' ? randomBetween(0.45, 3.6) : randomBetween(0.23, 1.8);
      if (kind === 'first-sine') {
        const minOmega = Math.max(1, 0.35 / sensor.tau);
        const maxOmega = Math.min(4.4, 2.5 / sensor.tau);
        sensor.omega = randomBetween(minOmega, maxOmega);
        sensor.end = 3.5 * TWO_PI / sensor.omega;
      } else {
        sensor.end = sensor.tau * randomBetween(5, 9);
      }
    }

    const count = 420;
    for (let i = 0; i <= count; i++) {
      const t = sensor.end * i / count;
      let y;
      if (kind === 'first-step') {
        y = sensor.K * (1 - Math.exp(-t / sensor.tau));
      } else if (kind === 'first-sine') {
        const ratio = 1 / Math.hypot(1, sensor.omega * sensor.tau);
        const phase = -Math.atan(sensor.omega * sensor.tau);
        y = sensor.K * ratio * Math.sin(sensor.omega * t + phase);
        sensor.inputY.push(Math.sin(sensor.omega * t));
      } else {
        // Same closed-form response as Module 3, evaluated at unit static gain.
        y = window.Module3.response(t, sensor.zeta, sensor.wn, 1).x;
      }
      const amplitude = kind === 'first-sine' ? sensor.K / Math.hypot(1, sensor.omega * sensor.tau) :
        kind === 'first-step' ? sensor.K : 1;
      const standardDeviation = amplitude * (kind === 'first-sine' ? 0.015 : 0.008);
      sensor.t.push(t);
      sensor.trueY.push(y);
      sensor.noisyY.push(y + noise(standardDeviation));
    }
    return sensor;
  }

  function newSensor() {
    current = makeSensor();
    roundNumber++;
    const sine = current.kind === 'first-sine';
    const second = current.kind === 'second-step';
    const mode = second ? 'SECOND-ORDER / STEP' : sine ? 'FIRST-ORDER / SINE' : 'FIRST-ORDER / STEP';
    $('challengeRoundTitle').textContent = mode;
    $('challengeRoundNumber').textContent = `ROUND ${String(roundNumber).padStart(2, '0')}`;
    $('challengeDescription').textContent = second
      ? 'Unknown damping ratio ζ and natural frequency ωₙ. The known input is a unit step.'
      : sine
        ? `Known input: sin(${display(current.omega, 2)}t), with ω = ${display(current.omega, 2)} rad/s. K is hidden; estimate τ from the phase lag relative to the dashed input.`
        : 'Estimate the time constant τ from a unit-step response. Use the final plateau to normalize the curve.';
    $('challengeFirstInputs').hidden = second;
    $('challengeSecondInputs').hidden = !second;
    for (const id of ['challengeTau', 'challengeZeta', 'challengeWn']) {
      $(id).value = '';
      $(id).disabled = false;
      $(id).removeAttribute('aria-invalid');
    }
    $('challengeCheck').disabled = false;
    $('challengeHintBtn').disabled = false;
    $('challengeFeedback').textContent = '';
    $('challengeFeedback').className = 'feedback';
    $('challengeHint').textContent = '';
    $('challengeReveal').hidden = true;
    $('challengePlotStatus').textContent = 'NOISY MEASUREMENT';
    updateScore();
    render();
  }

  function updateScore() {
    $('challengeSessionScore').textContent = `${session.earned} / ${session.rounds * 100}`;
    $('challengeSessionRounds').textContent = `${session.rounds} checked · ${session.perfect} full-mark rounds`;
  }

  function render() {
    if (!current || $('module-4').hidden) return;
    if (typeof Plotly === 'undefined') {
      $('challengePlot').textContent = 'Plotly is unavailable. Check plotly.min.js.';
      return;
    }
    const sensor = current;
    const traces = [];
    if (sensor.kind === 'first-sine') {
      traces.push({ x: sensor.t, y: sensor.inputY, name: 'Known input', mode: 'lines',
        line: { color: '#6b7280', dash: 'dash', width: 1.8 } });
    }
    traces.push({ x: sensor.t, y: sensor.noisyY, name: 'Measured (noisy)', mode: 'lines',
      line: { color: '#0f766e', width: 2 } });
    if (sensor.revealed) {
      traces.push({ x: sensor.t, y: sensor.guessY, name: 'Your estimate', mode: 'lines',
        line: { color: '#6352a3', dash: 'dash', width: 2.8 } });
      traces.push({ x: sensor.t, y: sensor.trueY, name: 'True model', mode: 'lines',
        line: { color: '#bd4d2c', width: 2.8 } });
    }
    const all = [...sensor.noisyY, ...sensor.inputY,
      ...(sensor.revealed ? [...sensor.guessY, ...sensor.trueY] : [])];
    const lowest = Math.min(0, ...all);
    const highest = Math.max(0, ...all);
    const pad = Math.max(0.15, (highest - lowest) * 0.12);
    Plotly.react('challengePlot', traces, {
      paper_bgcolor: '#fff', plot_bgcolor: '#fff',
      font: { family: 'system-ui, sans-serif', color: '#25342d', size: 12 },
      margin: { l: 55, r: 17, t: 44, b: 48 },
      legend: { orientation: 'h', x: 0, y: 1.02, yanchor: 'bottom' },
      xaxis: { title: { text: 'Time (s)' }, range: [0, sensor.end], gridcolor: '#e5eae7', zeroline: false, fixedrange: true },
      yaxis: { title: { text: 'Sensor reading' }, range: [lowest - pad, highest + pad], gridcolor: '#e5eae7', zeroline: false, fixedrange: true }
    }, { responsive: true, displayModeBar: false });
    $('challengePlotNote').textContent = sensor.revealed
      ? `Orange = true model. Purple dashed = your estimate${sensor.kind === 'second-step' ? '' : ' using the revealed true K'}. Teal = original noisy measurement.`
      : sensor.kind === 'first-sine'
        ? 'Teal = measured output. Dashed gray = known input phase reference. Identify lag to estimate τ.'
        : 'Teal = measured response to a unit step. Read the curve to estimate the hidden time constant or damping parameters.';
  }

  function showHint() {
    if (!current || current.revealed) return;
    const hints = current.kind === 'first-step'
      ? ['Estimate the final plateau first. At t = τ, the response has reached 63.2% of that final change.',
         'You can estimate τ from ln(1 − y/K): the line slope is −1/τ.']
      : current.kind === 'first-sine'
        ? ['The gray dashed curve is the known input. Compare its peak time with the noisy output peaks to estimate phase lag.',
           'Phase lag is |φ| = atan(ωτ), so τ = tan(|φ|)/ω. Convert peak delay Δt to phase using |φ| = ωΔt.']
        : ['Percentage overshoot depends only on ζ; the peak time depends on both ζ and ωₙ.',
           'Use %OS = 100 exp(−πζ/√(1−ζ²)), then tₚ = π/(ωₙ√(1−ζ²)).'];
    const index = Math.min(current.hintIndex, hints.length - 1);
    $('challengeHint').textContent = `Hint ${index + 1}: ${hints[index]}`;
    current.hintIndex++;
  }

  function validGuess(id, minimum, maximum) {
    const input = $(id);
    const raw = input.value.trim();
    const value = raw === '' ? NaN : Number(raw);
    const valid = Number.isFinite(value) && value >= minimum && value <= maximum;
    if (!valid) input.setAttribute('aria-invalid', 'true');
    else input.removeAttribute('aria-invalid');
    return valid ? value : null;
  }

  function checkGuess(event) {
    event.preventDefault();
    if (!current || current.revealed) return;
    const second = current.kind === 'second-step';
    const guesses = second
      ? [validGuess('challengeZeta', 0, 20), validGuess('challengeWn', 0.000001, 1000)]
      : [validGuess('challengeTau', 0.000001, 1000)];
    if (guesses.some(value => value === null)) {
      $('challengeFeedback').textContent = second
        ? 'Enter valid estimates: ζ between 0 and 20, and ωₙ greater than 0 (up to 1000 rad/s).'
        : 'Enter a valid positive time constant τ (up to 1000 seconds).';
      $('challengeFeedback').className = 'feedback wrong';
      return;
    }
    const actual = second ? [current.zeta, current.wn] : [current.tau];
    const errors = guesses.map((g, i) => Math.abs(g - actual[i]) / actual[i]);
    const worst = Math.max(...errors);
    const perfect = errors.every(error => error <= 0.1 + 1e-12);
    const points = perfect ? 100 : Math.min(99, Math.max(0, Math.round(100 * (1 - (worst - 0.1) / 0.9))));

    // Freeze the submitted guess and draw it over the same observation window.
    current.guessY = current.t.map(t => {
      if (second) return window.Module3.response(t, guesses[0], guesses[1], 1).x;
      if (current.kind === 'first-step') return current.K * (1 - Math.exp(-t / guesses[0]));
      const ratio = 1 / Math.hypot(1, current.omega * guesses[0]);
      const phase = -Math.atan(current.omega * guesses[0]);
      return current.K * ratio * Math.sin(current.omega * t + phase);
    });
    current.revealed = true;
    session.rounds++;
    session.earned += points;
    if (perfect) session.perfect++;
    const percent = error => `${display(error * 100, 2)}%`;
    $('challengeTruth').textContent = second
      ? `ζ = ${display(current.zeta, 4)} · ωₙ = ${display(current.wn, 4)} rad/s`
      : `τ = ${display(current.tau, 4)} s · K = ${display(current.K, 4)}${current.kind === 'first-sine' ? ` · ω = ${display(current.omega, 3)} rad/s` : ''}`;
    $('challengeAccuracy').textContent = second
      ? `Your estimate: ζ = ${display(guesses[0], 4)} (${percent(errors[0])} error), ωₙ = ${display(guesses[1], 4)} rad/s (${percent(errors[1])} error).`
      : `Your estimate: τ = ${display(guesses[0], 4)} s (${percent(errors[0])} error). K is revealed for reference and is not scored.`;
    $('challengePoints').textContent = `${points} / 100`;
    $('challengeReveal').hidden = false;
    $('challengeFeedback').textContent = perfect
      ? 'Full marks! Every estimated parameter is within 10% of its true value.'
      : 'Your estimated response and the true model are now overlaid. Compare the curves and try a new sensor.';
    $('challengeFeedback').className = 'feedback';
    $('challengeCheck').disabled = true;
    $('challengeHintBtn').disabled = true;
    for (const id of ['challengeTau', 'challengeZeta', 'challengeWn']) $(id).disabled = true;
    $('challengePlotStatus').textContent = 'TRUE + ESTIMATED RESPONSE';
    updateScore();
    render();
  }

  $('challengeNew').addEventListener('click', newSensor);
  $('challengeHintBtn').addEventListener('click', showHint);
  $('challengeGuessForm').addEventListener('submit', checkGuess);
  // Defer drawing until the router makes this module visible.
  newSensor();
  window.Module4 = { render };
})();
