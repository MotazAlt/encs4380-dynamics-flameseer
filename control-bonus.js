/* ENCS4380 / Homework 2 bonus — classic closed-loop Ziegler–Nichols (ultimate-gain) tuning.
   Reuses Module 3's second-order plant and P2's first-order feedback sensor.
   The P-only marginal gain is obtained from the cubic Routh–Hurwitz boundary;
   the period is measured independently in the numerically integrated output. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const duration = 24;
  const dt = 0.005;
  const samples = Math.round(duration / dt);
  const wn = 2;
  const plantGain = 1;
  const tauD = 0.05; // filtered derivative of measured output, same as P1
  const state = { found: false, applied: false, ku: null, pu: null, theoreticalPu: null };
  const value = id => Number($('zn-' + id).value);
  const numbers = n => Number(n).toFixed(3);

  function critical(p) {
    // (tauS*s+1)*(s^2+2*zeta*wn*s+wn^2) + Kp*K*wn^2 = 0.
    // At the marginal stability boundary: a2*a1 = a3*a0.
    const a3 = p.sensor;
    const a2 = 1 + 2 * p.zeta * wn * p.sensor;
    const a1 = 2 * p.zeta * wn + wn * wn * p.sensor;
    const ku = (a2 * a1 / (a3 * wn * wn) - 1) / plantGain;
    const omegaU = Math.sqrt(a1 / a3);
    return { ku, theoreticalPu: 2 * Math.PI / omegaU };
  }

  function simulate(p, gains) {
    // x = [true position y, dy/dt, sensor output ym, error integral, filtered ym].
    // The controller sees ONLY the delayed sensor, not the true plant output.
    const x = [0, 0, 0, 0, 0];
    const t = [], y = [], ym = [], u = [];
    const deriv = q => {
      const error = 1 - q[2];
      const derivativeOnMeasurement = (q[2] - q[4]) / tauD;
      const cmd = gains.kp * error + gains.ki * q[3] - gains.kd * derivativeOnMeasurement;
      return [
        q[1],
        wn * wn * (plantGain * cmd - q[0]) - 2 * p.zeta * wn * q[1],
        (q[0] - q[2]) / p.sensor,
        error,
        (q[2] - q[4]) / tauD
      ];
    };
    const command = q => gains.kp * (1 - q[2]) + gains.ki * q[3] - gains.kd * (q[2] - q[4]) / tauD;
    for (let i = 0; i <= samples; i++) {
      if (i % 4 === 0 || i === samples) {
        t.push(i * dt);
        y.push(x[0]);
        ym.push(x[2]);
        u.push(command(x));
      }
      if (i === samples) break;
      const k1 = deriv(x);
      const k2 = deriv(x.map((n, j) => n + dt * k1[j] / 2));
      const k3 = deriv(x.map((n, j) => n + dt * k2[j] / 2));
      const k4 = deriv(x.map((n, j) => n + dt * k3[j]));
      for (let j = 0; j < x.length; j++) {
        x[j] += dt / 6 * (k1[j] + 2 * k2[j] + 2 * k3[j] + k4[j]);
      }
    }
    return { t, y, ym, u };
  }

  function peaks(result) {
    const found = [];
    const { t, y } = result;
    for (let i = 1; i < y.length - 1; i++) {
      // Only sizeable maxima; ignore small numerical noise around equilibrium.
      if (y[i] > y[i - 1] && y[i] >= y[i + 1] && y[i] > 0.1) found.push(t[i]);
    }
    return found;
  }

  function measuredPeriod(result) {
    const times = peaks(result);
    if (times.length < 4) return null;
    // Average the last three cycles after the initially decaying real mode disappears.
    const count = Math.min(3, times.length - 1);
    return (times.at(-1) - times.at(-1 - count)) / count;
  }

  const curve = (d, name, line, field = 'y') => ({ x: d.t, y: d[field], name, mode: 'lines', line });

  function plot(id, traces, label) {
    ToolkitCharts.draw(id, traces, {
      margin: { l: 54, r: 15, t: 34, b: 45 },
      hovermode: 'x unified',
      xaxis: { title: { text: 'Time (s)' } },
      yaxis: { title: { text: label }, zeroline: true }
    });
  }

  function updateLabels() {
    $('zn-kp-value').textContent = value('kp').toFixed(3);
    $('zn-zeta-value').textContent = value('zeta').toFixed(2);
    $('zn-sensor-value').textContent = value('sensor').toFixed(2) + ' s';
  }

  function render() {
    updateLabels();
    const p = { zeta: value('zeta'), sensor: value('sensor') };
    const kp = value('kp');
    const threshold = critical(p);
    const pOnly = simulate(p, { kp, ki: 0, kd: 0 });
    const percent = threshold.ku ? 100 * kp / threshold.ku : 0;
    let status;
    if (percent < 99.5) status = 'P-only response: STABLE. The oscillations decay. Move Kp upward towards Ku.';
    else if (percent > 100.5) status = 'P-only response: UNSTABLE. The oscillation amplitude grows; reduce Kp.';
    else status = 'P-only response: AT THE CRITICAL GAIN. Oscillations continue at nearly constant amplitude.';
    $('zn-stability').textContent = status + `  Current Kp = ${numbers(kp)} (${percent.toFixed(1)}% of Ku).`;
    $('zn-stability').classList.toggle('warning', percent > 100.5);
    $('zn-apply').disabled = !state.found;

    ToolkitCharts.renderMetrics('zn-measurements', [
      ['Ultimate gain (K<sub>u</sub>)', state.found ? numbers(state.ku) : '—'],
      ['Measured period (P<sub>u</sub>)', state.found ? numbers(state.pu) + ' s' : '—'],
      ['Model period check', state.found ? numbers(state.theoreticalPu) + ' s' : '—']
    ]);
    $('zn-period-note').textContent = state.found
      ? `The P-only plot at Kp = Ku gives ${peaks(simulate(p, { kp: state.ku, ki: 0, kd: 0 })).length} visible response peaks. Period from the last three peak-to-peak intervals: ${numbers(state.pu)} s; characteristic-equation prediction: ${numbers(state.theoreticalPu)} s.`
      : 'Press Find Critical Gain to locate the marginal oscillation and measure its period from successive response peaks.';

    const pid = state.found ? {
      kp: 0.6 * state.ku,
      ki: 1.2 * state.ku / state.pu,
      kd: 0.075 * state.ku * state.pu
    } : null;
    ToolkitCharts.renderMetrics('zn-gains', [
      ['Tuned K<sub>p</sub>', pid ? numbers(pid.kp) : '—'],
      ['Tuned K<sub>i</sub> (1/s)', pid ? numbers(pid.ki) : '—'],
      ['Tuned K<sub>d</sub> (s)', pid ? numbers(pid.kd) : '—']
    ]);
    const traces = [
      curve(pOnly, 'P-only output', ToolkitCharts.line.process),
      { x: [0, duration], y: [1, 1], name: 'Setpoint', mode: 'lines', line: ToolkitCharts.line.setpoint }
    ];
    const commands = [curve(pOnly, 'P-only control', ToolkitCharts.line.process, 'u')];
    if (state.applied && pid) {
      const tuned = simulate(p, pid);
      traces.push(curve(tuned, 'ZN PID output', ToolkitCharts.line.controller));
      commands.push(curve(tuned, 'ZN PID control', ToolkitCharts.line.controller, 'u'));
      const max = Math.max(...tuned.y);
      const finalError = Math.abs(1 - tuned.y.at(-1)) * 100;
      $('zn-design-note').textContent = `ZN PID applied. Tuned response peak: ${numbers(max)}, overshoot: ${numbers(Math.max(0, (max - 1) * 100))}%, final-window error at ${duration} s: ${numbers(finalError)}%. The derivative uses a 0.05 s sensor filter, as in P1.`;
    } else {
      $('zn-design-note').textContent = state.found
        ? 'Gains computed from the measured period. Press Apply ZN PID to compare its response with the current P-only gain.'
        : 'Find the critical gain first. The tuned PID response will then be added to the comparison plot.';
    }
    plot('zn-response-plot', traces, 'Plant output');
    plot('zn-command-plot', commands, 'Controller output');
  }

  function findCritical() {
    const p = { zeta: value('zeta'), sensor: value('sensor') };
    const { ku, theoreticalPu } = critical(p);
    const criticalData = simulate(p, { kp: ku, ki: 0, kd: 0 });
    const pu = measuredPeriod(criticalData);
    if (!pu || !Number.isFinite(pu)) {
      $('zn-period-note').textContent = 'Could not measure enough peaks. Try resetting the plant parameters.';
      return;
    }
    Object.assign(state, { found: true, applied: false, ku, pu, theoreticalPu });
    $('zn-kp').value = String(ku); // range step="any" keeps mathematical precision
    render();
  }

  for (const id of ['kp', 'zeta', 'sensor']) {
    $('zn-' + id).addEventListener('input', () => {
      if (id !== 'kp') Object.assign(state, { found: false, applied: false, ku: null, pu: null, theoreticalPu: null });
      render();
    });
  }
  $('zn-find').addEventListener('click', findCritical);
  $('zn-apply').addEventListener('click', () => {
    if (!state.found) return;
    state.applied = true;
    render();
  });
  $('zn-reset').addEventListener('click', () => {
    $('zn-kp').value = '0.6';
    $('zn-zeta').value = '0.3';
    $('zn-sensor').value = '0.5';
    Object.assign(state, { found: false, applied: false, ku: null, pu: null, theoreticalPu: null });
    $('zn-prediction').value = '';
    $('zn-prediction-feedback').textContent = '';
    render();
  });
  $('zn-check-prediction').addEventListener('click', () => {
    const option = $('zn-prediction').value;
    $('zn-prediction-feedback').textContent = !option
      ? 'Choose an option first.'
      : option === 'correct'
        ? 'Correct. At Ku, the P-only closed loop is marginally stable and its oscillations do not decay.'
        : 'Try again. A sustained oscillation marks the stability boundary for the P-only loop.';
  });
  window.ZNTuning = { render, critical, simulate, measuredPeriod };
})();
