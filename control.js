(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const derivativeTau = 0.05;
  const defaults = {
    plant: 'first', gain: 1, tau: 1, wn: 2, zeta: 0.5,
    kp: 9, ki: 0, kd: 0, target: 1, limit: 12, duration: 8
  };
  const sensorDefaults = { ...defaults, kp: 5, ki: 12, sensorTau: 0.02, duration: 12 };
  const clamp = (value, limit) => Math.max(-limit, Math.min(limit, value));

  function simulate(p) {
    const hasSensor = p.sensorTau > 0;
    const secondOrder = p.plant === 'second';
    const feedbackGain = p.gain * (p.kp + p.kd / derivativeTau);
    const plantRate = secondOrder
      ? p.wn * (2 * p.zeta + Math.sqrt(1 + feedbackGain))
      : (1 + feedbackGain) / p.tau;
    const dtMax = Math.min(0.002, 1 / (plantRate + 1 / derivativeTau),
      hasSensor ? p.sensorTau / 10 : Infinity);
    const steps = Math.ceil(p.duration / dtMax);
    const dt = p.duration / steps;
    const t = new Float64Array(steps + 1);
    const y = new Float64Array(steps + 1);
    const measured = new Float64Array(steps + 1);
    const u = new Float64Array(steps + 1);

    const x = [0, 0, 0, 0, 0];
    const stage = x.slice();
    const rates = Array.from({ length: 4 }, () => x.slice());
    function command(state, signal) {
      const error = p.target - signal;
      const slope = (signal - state[3]) / derivativeTau;
      return clamp(p.kp * error + p.ki * state[2] - p.kd * slope, p.limit);
    }
    function derivative(state, result) {
      const [output, velocity, , filtered, sensor] = state;
      const signal = hasSensor ? sensor : output;
      const inputDifference = p.gain * command(state, signal) - output;
      result[0] = secondOrder ? velocity : inputDifference / p.tau;
      result[1] = secondOrder ? p.wn ** 2 * inputDifference - 2 * p.zeta * p.wn * velocity : 0;
      result[2] = p.target - signal;
      result[3] = (signal - filtered) / derivativeTau;
      result[4] = hasSensor ? (output - sensor) / p.sensorTau : 0;
    }
    function intermediate(slope, fraction) {
      for (let j = 0; j < x.length; j++) stage[j] = x[j] + dt * fraction * slope[j];
    }

    for (let i = 0; i <= steps; i++) {
      t[i] = i * dt;
      y[i] = x[0];
      measured[i] = hasSensor ? x[4] : x[0];
      u[i] = command(x, measured[i]);
      if (i === steps) break;
      const [k1, k2, k3, k4] = rates;
      derivative(x, k1);
      intermediate(k1, 0.5);
      derivative(stage, k2);
      intermediate(k2, 0.5);
      derivative(stage, k3);
      intermediate(k3, 1);
      derivative(stage, k4);
      for (let j = 0; j < x.length; j++) x[j] += dt * (k1[j] + 2 * k2[j] + 2 * k3[j] + k4[j]) / 6;
    }
    return { t, y, measured, u, dt };
  }

  function firstCrossing(data, level) {
    const i = data.y.findIndex(value => value >= level);
    if (i <= 0) return i === 0 ? 0 : null;
    const fraction = (level - data.y[i - 1]) / (data.y[i] - data.y[i - 1]);
    return data.t[i - 1] + fraction * data.dt;
  }

  function responseMetrics(p, data) {
    const loopGain = p.kp * p.gain;
    const equilibrium = Math.min(p.gain * p.limit,
      p.ki ? p.target : p.target * loopGain / (1 + loopGain));
    const noResponse = equilibrium === 0;
    if (noResponse) return {
      rise: null, peakTime: null, overshoot: null, settling: null, steadyError: 100, noResponse
    };
    const low = firstCrossing(data, 0.1 * equilibrium);
    const high = firstCrossing(data, 0.9 * equilibrium);
    const band = 0.02 * equilibrium;
    let lastOutside = -1;
    let peakIndex = 0;
    for (let i = 0; i < data.y.length; i++) {
      if (Math.abs(data.y[i] - equilibrium) > band) lastOutside = i;
      if (data.y[i] > data.y[peakIndex]) peakIndex = i;
    }
    const peak = data.y[peakIndex];
    const overshoot = 100 * Math.max(0, peak - equilibrium) / equilibrium;
    const peakTime = overshoot >= 0.01 && data.y.at(-1) < peak ? data.t[peakIndex] : null;
    const timeInBand = p.duration - (data.t[lastOutside + 1] ?? p.duration);
    const confirmationTime = p.plant === 'second'
      ? Math.max(0.1 * p.duration, 2 * Math.PI / p.wn)
      : 0.1 * p.duration;
    const endRate = Math.abs(data.y.at(-1) - data.y.at(-2)) / data.dt;
    const settled = timeInBand >= confirmationTime && endRate <= band / confirmationTime;
    return {
      rise: low === null || high === null ? null : high - low,
      peakTime,
      overshoot,
      settling: settled ? data.t[lastOutside + 1] : null,
      steadyError: settled ? 100 * (p.target - equilibrium) / p.target : null
    };
  }

  function checks() {
    const proportional = simulate(defaults);
    const timeConstant = firstCrossing(proportional, 0.9 * (1 - Math.exp(-1)));
    const pError = 100 * (1 - proportional.y.at(-1));
    const pi = { ...defaults, kp: 1, ki: 1, duration: 12 };
    const wn = Math.sqrt(pi.gain * pi.ki / pi.tau);
    const zeta = (1 + pi.gain * pi.kp) / (2 * Math.sqrt(pi.tau * pi.gain * pi.ki));
    const piError = 100 * Math.abs(1 - simulate(pi).y.at(-1));
    const otherPiError = 100 * Math.abs(1 - simulate({ ...pi, kp: 2, ki: 2 }).y.at(-1));
    return [
      ['P only: time constant', '0.100 s', timeConstant.toFixed(3) + ' s', Math.abs(timeConstant - 0.1) < 0.001],
      ['P only: steady-state error', '10.00%', pError.toFixed(2) + '%', Math.abs(pError - 10) < 0.01],
      ['PI: closed-loop natural frequency', '1.00 rad/s', wn.toFixed(2) + ' rad/s', Math.abs(wn - 1) < 1e-9],
      ['PI: closed-loop damping ratio', '1.00', zeta.toFixed(2), Math.abs(zeta - 1) < 1e-9],
      ['PI: steady-state error for a reachable step', '0% (within 0.01%)',
        Math.max(piError, otherPiError).toFixed(4) + '%', Math.max(piError, otherPiError) < 0.01]
    ];
  }

  const controllerFields = ['kp', 'ki', 'kd'];
  const modules = {
    'control-p1': { prefix: 'p1', fields: [...controllerFields, 'target', 'limit', 'gain', 'tau', 'wn', 'zeta', 'duration'] },
    'control-p2': { prefix: 'p2', fields: ['sensorTau', ...controllerFields] }
  };

  function readParameters({ prefix, fields }) {
    const parameters = prefix === 'p1' ? { ...defaults, plant: $('p1-plant').value } : { ...sensorDefaults };
    for (const key of fields) parameters[key] = Number($(`${prefix}-${key}`).value);
    return parameters;
  }

  function applyParameters({ prefix, fields }, parameters) {
    if (prefix === 'p1') $('p1-plant').value = parameters.plant;
    for (const key of fields) $(`${prefix}-${key}`).value = parameters[key];
  }

  const p1Presets = {
    p: defaults,
    pi: { ...defaults, kp: 1, ki: 1, duration: 12 },
    d: { ...defaults, plant: 'second', zeta: 0.3, wn: 1, kp: 2, duration: 20 }
  };
  const p2Presets = {
    fast: sensorDefaults,
    slow: { ...sensorDefaults, sensorTau: 0.25 },
    ringing: { ...sensorDefaults, sensorTau: 1 }
  };

  function plot(id, series, axisTitle, symmetricLimit) {
    ToolkitCharts.draw(id, series, {
      margin: { l: 54, r: 15, t: 33, b: 45 },
      hovermode: 'x unified',
      xaxis: { title: { text: 'Time (s)' } },
      yaxis: {
        title: { text: axisTitle },
        zeroline: true,
        ...(symmetricLimit ? { range: [-1.11 * symmetricLimit, 1.11 * symmetricLimit] } : {})
      }
    });
  }

  function curve(t, values, name, line) {
    return { x: t, y: values, name, mode: 'lines', line };
  }

  function selectSamples(data) {
    const indexes = [];
    const stride = Math.max(1, Math.floor((data.t.length - 1) / 1100));
    for (let i = 0; i < data.t.length - 1; i += stride) indexes.push(i);
    indexes.push(data.t.length - 1);
    for (let i = 1; i < Math.min(65, data.t.length - 1); i++) indexes.push(i);
    return [...new Set(indexes)].sort((a, b) => a - b);
  }

  const fixed = (value, unit = '', unavailable = '—') =>
    value === null ? unavailable : value.toFixed(2) + unit;

  function render(route) {
    const config = modules[route];
    const { prefix, fields } = config;
    const p = readParameters(config);
    for (const key of fields) $(`${prefix}-${key}-value`).textContent =
      Number(p[key].toFixed(3)) + (['tau', 'sensorTau', 'duration'].includes(key) ? ' s' : key === 'wn' ? ' rad/s' : '');
    if (prefix === 'p1') {
      $('p1-first-fields').hidden = p.plant === 'second';
      $('p1-second-fields').hidden = p.plant !== 'second';
    }
    const data = simulate(p);
    const indexes = selectSamples(data);
    const t = indexes.map(i => data.t[i]);
    const output = curve(t, indexes.map(i => data.y[i]), 'True output (PV)', ToolkitCharts.line.process);
    const reference = curve([0, data.t.at(-1)], [p.target, p.target], 'Setpoint', ToolkitCharts.line.setpoint);
    if (prefix === 'p1') {
      plot('p1-output-plot', [output, reference], 'Output');
      const limits = curve([0, data.t.at(-1), null, 0, data.t.at(-1)],
        [p.limit, p.limit, null, -p.limit, -p.limit], 'Limits ±' + p.limit, ToolkitCharts.line.limit);
      plot('p1-command-plot', [
        curve(t, indexes.map(i => data.u[i]), 'Controller output (CO)', ToolkitCharts.line.controller), limits
      ], 'Command', p.limit);
      const metrics = responseMetrics(p, data);
      ToolkitCharts.renderMetrics('p1-metrics', [
        ['Rise time (T<sub>r</sub>, 10–90%)', fixed(metrics.rise, ' s')],
        ['Peak time (T<sub>p</sub>)', fixed(metrics.peakTime, ' s', 'No peak')],
        ['Overshoot (%OS)', fixed(metrics.overshoot, '%')],
        ['Settling time (T<sub>s</sub>, ±2%)', fixed(metrics.settling, ' s')],
        ['Steady-state error (E<sub>ss</sub>)', fixed(metrics.steadyError, '%')]
      ]);
      const clipped = data.u.some(command => Math.abs(command) >= p.limit);
      let note = 'Rise time, overshoot and settling use the expected equilibrium. Steady-state error uses the setpoint.';
      if (metrics.noResponse) {
        note = 'The output stays at zero. Increase proportional or integral gain to get a step response.';
      } else if (metrics.settling === null) {
        note = 'Settling is unconfirmed in this window. Increase the duration to inspect a slow response.';
      }
      $('p1-metrics-note').textContent = note +
        ' Peak time is reported for a sampled overshoot of at least 0.01% followed by a decrease.' +
        (clipped ? ' The actuator reached its limit.' : '');
    } else {
      const measured = curve(t, indexes.map(i => data.measured[i]), 'Sensor reading y<sub>m</sub>', ToolkitCharts.line.measured);
      plot('p2-response-plot', [output, measured, reference], 'Output');
      let maxGap = 0;
      let peak = 0;
      for (let i = 0; i < data.y.length; i++) {
        maxGap = Math.max(maxGap, Math.abs(data.y[i] - data.measured[i]));
        peak = Math.max(peak, data.y[i]);
      }
      ToolkitCharts.renderMetrics('p2-metrics', [
        ['True peak above setpoint', fixed(Math.max(0, 100 * (peak - p.target) / p.target), '%')],
        ['Largest sensor gap |y − y<sub>m</sub>|', fixed(maxGap)],
        ['Sensor time constant (τ<sub>s</sub>)', fixed(p.sensorTau, ' s')]
      ]);
    }
  }

  let heroMode = 'pid';

  function renderHero(mode = heroMode) {
    heroMode = mode;
    const host = $('heroPlot');
    if (!host || $('home').hidden) return;
    document.querySelectorAll('[data-preview]').forEach(btn => {
      const selected = btn.dataset.preview === heroMode;
      btn.classList.toggle('selected', selected);
      btn.setAttribute('aria-pressed', String(selected));
    });

    const isSensor = heroMode === 'sensor';
    const params = isSensor
      ? { ...sensorDefaults, sensorTau: 0.25, duration: 8 }
      : { ...defaults, kp: 2.5, ki: 3.5, kd: 0, duration: 8 };
    const data = simulate(params);
    const indexes = selectSamples(data);
    const t = indexes.map(i => data.t[i]);
    const traces = [
      curve([0, params.duration], [1, 1], 'Setpoint r', ToolkitCharts.line.setpoint),
      curve(t, indexes.map(i => data.y[i]), isSensor ? 'True output y' : 'PID output y', ToolkitCharts.line.process)
    ];

    if (isSensor) {
      traces.push(curve(t, indexes.map(i => data.measured[i]), 'Sensor y<sub>m</sub>', ToolkitCharts.line.measured));
      let maxGap = 0;
      let peak = 0;
      for (let i = 0; i < data.y.length; i++) {
        maxGap = Math.max(maxGap, Math.abs(data.y[i] - data.measured[i]));
        peak = Math.max(peak, data.y[i]);
      }
      $('heroMetric1Label').textContent = 'PEAK OVERSHOOT';
      $('heroMetric1').textContent = fixed(Math.max(0, 100 * (peak - 1)), '%');
      $('heroMetric2Label').textContent = 'MAX SENSOR GAP';
      $('heroMetric2').textContent = fixed(maxGap);
      $('heroMetric3').innerHTML = 'PI <small>+ τ<sub>s</sub> 0.25s</small>';
      $('heroFooterLink').setAttribute('href', '#control-p2');
      $('heroFooterLabel').textContent = 'Open Slow Sensor';
    } else {
      const openLoop = t.map(time => 1 - Math.exp(-time / params.tau));
      traces.push(curve(t, openLoop, '1st-order open loop', ToolkitCharts.line.controller));
      const m = responseMetrics(params, data);
      $('heroMetric1Label').textContent = 'RISE TIME';
      $('heroMetric1').textContent = fixed(m.rise, ' s');
      $('heroMetric2Label').textContent = 'SETTLING TIME';
      $('heroMetric2').textContent = fixed(m.settling, ' s');
      $('heroMetric3').innerHTML = '1st-Order <small>+ PI</small>';
      $('heroFooterLink').setAttribute('href', '#control-p1');
      $('heroFooterLabel').textContent = 'Inspect in PID Playground';
    }

    ToolkitCharts.draw('heroPlot', traces, {
      margin: { l: 42, r: 12, t: 28, b: 36 },
      hovermode: 'x unified',
      xaxis: { title: { text: 'Time (s)', standoff: 6 } },
      yaxis: { title: { text: 'Response' }, range: [0, isSensor ? 1.55 : 1.35] },
      legend: { orientation: 'h', x: 0, y: 1.12, font: { size: 11 } }
    });
  }

  function renderChecks() {
    const results = checks();
    $('p1-check-rows').innerHTML = results.map(([test, expected, actual, pass]) => `
      <tr><th scope="row">${test}</th><td>${expected}</td><td class="mono">${actual}</td>
        <td><span class="validation-result ${pass ? 'pass' : 'fail'}">${pass ? 'PASS' : 'FAIL'}</span></td></tr>`).join('');
    $('p1-check-summary').textContent = results.filter(row => row[3]).length + ' / ' + results.length + ' values passed';
  }

  function checkPrediction(prefix, explanation) {
    const answer = $(`${prefix}-prediction`).value;
    const feedback = $(`${prefix}-prediction-feedback`);
    feedback.classList.toggle('wrong', answer !== 'correct');
    feedback.textContent = !answer ? 'Choose a prediction first.' :
      answer === 'correct' ? 'Correct. ' + explanation : 'Try again. ' + explanation;
  }

  let frame;
  function queueRender(route) {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      if (!$(route).hidden) render(route);
    });
  }

  for (const [route, config] of Object.entries(modules)) {
    const { prefix, fields } = config;
    for (const key of fields) $(`${prefix}-${key}`).addEventListener('input', () => queueRender(route));
    const presets = prefix === 'p1' ? p1Presets : p2Presets;
    $(route).querySelectorAll('[data-control-preset]').forEach(button => {
      button.addEventListener('click', () => {
        applyParameters(config, presets[button.dataset.controlPreset]);
        queueRender(route);
      });
    });
  }

  document.querySelectorAll('[data-preview]').forEach(btn => {
    btn.addEventListener('click', () => renderHero(btn.dataset.preview));
  });

  $('p1-plant').addEventListener('change', () => queueRender('control-p1'));
  $('p1-copy-plant').addEventListener('click', () => {
    const firstOrder = $('p1-plant').value === 'first';
    const { K, wn, zeta } = window.Module3.getState();
    const values = firstOrder ? { gain: Number($('gain').value), tau: Number($('tau').value) }
      : { gain: K, wn, zeta };
    for (const [key, value] of Object.entries(values)) {
      const slider = $('p1-' + key);
      if (value < Number(slider.min)) slider.min = value;
      if (value > Number(slider.max)) slider.max = value;
      slider.value = value;
      const [min, max] = slider.nextElementSibling.children;
      const unit = key === 'wn' ? ' rad/s' : key === 'tau' ? ' s' : '';
      min.textContent = Number(Number(slider.min).toFixed(3)) + unit;
      max.textContent = Number(Number(slider.max).toFixed(3)) + unit;
    }
    queueRender('control-p1');
  });
  $('p1-check-prediction').addEventListener('click', () => checkPrediction('p1',
    'A stable PI loop can remove the remaining error when the target is reachable.'));
  $('p2-check-prediction').addEventListener('click', () => checkPrediction('p2',
    'The slow reading makes the controller keep pushing after the true output is already near the target.'));
  $('p1-run-checks').addEventListener('click', renderChecks);
  renderChecks();

  window.PIDControl = { render, renderHero };
})();
