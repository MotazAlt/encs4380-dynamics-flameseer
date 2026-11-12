// Module 3: closed-form second-order response and mass-spring-damper state space.
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const PI = Math.PI;
  const state = { zeta: 0.5, wn: 2, K: 1, m: 1, b: 2, k: 4, source: 'model' };
  let renderQueued = false;

  // 1. One consistent physical model, regardless of which sliders are enabled.
  function fromModel() {
    state.k = state.m * state.wn ** 2;
    state.b = 2 * state.zeta * state.m * state.wn;
  }
  function fromPhysical() {
    state.wn = Math.sqrt(state.k / state.m);
    state.zeta = state.b / (2 * Math.sqrt(state.k * state.m));
  }
  function format(v, decimals = 3) {
    return Number(v.toFixed(decimals)).toString();
  }

  // 2. Exact step displacement for G(s) = K*wn² / (s² + 2ζwns + wn²).
  // A physical force step F(t) = k*K*u(t) gives x(∞) = K metres.
  function response(t, zeta, wn, K = 1) {
    if (t <= 0) return { x: 0, v: 0 };
    if (zeta < 1) {
      const alpha = zeta * wn;
      const wd = wn * Math.sqrt(1 - zeta * zeta);
      const decay = Math.exp(-alpha * t);
      return {
        x: K * (1 - decay * (Math.cos(wd * t) + alpha / wd * Math.sin(wd * t))),
        v: K * wn * wn / wd * decay * Math.sin(wd * t)
      };
    }
    if (zeta === 1) {
      const decay = Math.exp(-wn * t);
      return { x: K * (1 - decay * (1 + wn * t)), v: K * wn * wn * t * decay };
    }
    const q = Math.sqrt(zeta * zeta - 1);
    const slow = -wn * (zeta - q);
    const fast = -wn * (zeta + q);
    const difference = slow - fast;
    const slowExp = Math.exp(slow * t);
    const fastExp = Math.exp(fast * t);
    return {
      x: K * (1 - (slow * fastExp - fast * slowExp) / difference),
      v: K * wn * wn * (slowExp - fastExp) / difference
    };
  }

  // 3. Transfer-function poles and eigenvalues of A have the same characteristic equation.
  function poles(zeta, wn) {
    if (zeta < 1) {
      const imaginary = wn * Math.sqrt(1 - zeta * zeta);
      return [{ re: -zeta * wn, im: imaginary }, { re: -zeta * wn, im: -imaginary }];
    }
    if (zeta === 1) return [{ re: -wn, im: 0 }, { re: -wn, im: 0 }];
    const q = Math.sqrt(zeta * zeta - 1);
    return [{ re: -wn * (zeta - q), im: 0 }, { re: -wn * (zeta + q), im: 0 }];
  }
  // Eigenvalues computed separately from the physical A matrix (trace/determinant).
  function eigenvalues(m, b, k) {
    const trace = -b / m;
    const determinant = k / m;
    let discriminant = trace * trace - 4 * determinant;
    if (Math.abs(discriminant) < 1e-11 * (1 + trace * trace + 4 * determinant)) discriminant = 0;
    if (discriminant >= 0) {
      const d = Math.sqrt(discriminant);
      return [{ re: (trace + d) / 2, im: 0 }, { re: (trace - d) / 2, im: 0 }];
    }
    const im = Math.sqrt(-discriminant) / 2;
    return [{ re: trace / 2, im }, { re: trace / 2, im: -im }];
  }
  function poleLabel(p) {
    if (Math.abs(p.im) < 1e-10) return format(p.re);
    return `${format(p.re)} ${p.im < 0 ? '−' : '+'} j${format(Math.abs(p.im))}`;
  }

  // 4. Rise time is measured at the first 10% and 90% crossings.
  function bisectCrossing(level, zeta, wn) {
    let lo = 0;
    let hi = 1 / wn;
    while (response(hi, zeta, wn).x < level) {
      hi *= 2;
      if (hi > 1e8) return NaN;
    }
    for (let i = 0; i < 55; i++) {
      const mid = (lo + hi) / 2;
      if (response(mid, zeta, wn).x >= level) hi = mid;
      else lo = mid;
    }
    return (lo + hi) / 2;
  }

  // Actual 2% settling time: last entry into [0.98, 1.02], not a 4/(ζωn) estimate.
  function settlingTime(zeta, wn) {
    if (zeta === 0) return Infinity; // undamped oscillation never settles
    if (zeta >= 1) return bisectCrossing(0.98, zeta, wn);
    const wd = wn * Math.sqrt(1 - zeta * zeta);
    const envelope = 1 / Math.sqrt(1 - zeta * zeta);
    const guaranteedInside = Math.log(envelope / 0.02) / (zeta * wn);
    const step = Math.min(PI / (36 * wd), 0.18 / wn);
    let inside = guaranteedInside;
    for (let t = inside - step; t >= 0; t -= step) {
      if (Math.abs(response(t, zeta, wn).x - 1) > 0.02) {
        let lo = t, hi = inside;
        for (let i = 0; i < 45; i++) {
          const mid = (lo + hi) / 2;
          if (Math.abs(response(mid, zeta, wn).x - 1) > 0.02) lo = mid;
          else hi = mid;
        }
        return hi;
      }
      inside = t;
    }
    return 0;
  }
  function features(zeta, wn) {
    const t10 = bisectCrossing(0.1, zeta, wn);
    const t90 = bisectCrossing(0.9, zeta, wn);
    const under = zeta < 1;
    const tp = under ? PI / (wn * Math.sqrt(1 - zeta * zeta)) : null;
    const overshoot = under ? 100 * Math.exp(-PI * zeta / Math.sqrt(1 - zeta * zeta)) : 0;
    return { t10, t90, tr: t90 - t10, tp, overshoot, ts: settlingTime(zeta, wn) };
  }

  function syncControls() {
    for (const [id, val] of [['thirdZeta', state.zeta], ['thirdWn', state.wn], ['thirdGain', state.K],
      ['thirdMass', state.m], ['thirdDamper', state.b], ['thirdSpring', state.k]]) {
      const input = $(id);
      // Physical values may exceed the normalized slider's initial range and vice versa.
      if (val < Number(input.min)) input.min = String(Math.floor(val * 100) / 100);
      if (val > Number(input.max)) input.max = String(Math.ceil(val * 100) / 100);
      input.value = val;
    }
    for (const [id, val, suffix] of [
      ['thirdZetaOut', state.zeta, ''], ['thirdWnOut', state.wn, ' rad/s'], ['thirdGainOut', state.K, ''],
      ['thirdMassOut', state.m, ' kg'], ['thirdDamperOut', state.b, ' N·s/m'],
      ['thirdSpringOut', state.k, ' N/m']
    ]) $(id).textContent = `${format(val)}${suffix}`;
    const physical = state.source === 'physical';
    $('thirdZeta').disabled = physical;
    $('thirdWn').disabled = physical;
    for (const id of ['thirdMass', 'thirdDamper', 'thirdSpring']) $(id).disabled = !physical;
    $('thirdModelInputs').classList.toggle('controls-disabled', physical);
    $('thirdPhysicalInputs').classList.toggle('controls-disabled', !physical);
    $('thirdModelChoice').checked = !physical;
    $('thirdPhysicalChoice').checked = physical;
  }

  function queueRender() {
    if (window.location.hash !== '#module-3' || renderQueued) return;
    renderQueued = true;
    requestAnimationFrame(() => {
      renderQueued = false;
      render();
    });
  }

  const layout = {
    paper_bgcolor: '#fff', plot_bgcolor: '#fff',
    font: { family: 'system-ui, sans-serif', color: '#182521', size: 12 },
    margin: { l: 52, r: 22, t: 35, b: 50 },
    legend: { orientation: 'h', x: 0, y: 1.17 }
  };
  const axis = { gridcolor: '#e6eeea', zeroline: false, linecolor: '#95a49d', fixedrange: true };
  const chartConfig = { responsive: true, displayModeBar: false };

  // 5. Response, time-domain metrics and phase portrait share the same samples.
  function render() {
    syncControls();
    const { zeta, wn, K, m, b, k } = state;
    const f = features(zeta, wn);
    const roots = poles(zeta, wn);
    const aEigen = eigenvalues(m, b, k);
    const damping = zeta < 1 ? (zeta === 0 ? 'Undamped (sustained oscillation)' : 'Underdamped') :
      zeta === 1 ? 'Critically damped' : 'Overdamped';
    const duration = zeta === 0 ? 6 * PI / wn :
      Math.max(7 / wn, Number.isFinite(f.ts) ? f.ts * 1.13 : 0, f.tp ? f.tp * 1.12 : 0);
    const time = [], position = [], velocity = [];
    const count = 1800;
    for (let i = 0; i <= count; i++) {
      const t = duration * i / count;
      const point = response(t, zeta, wn, K);
      time.push(t); position.push(point.x); velocity.push(point.v);
    }
    const showTime = t => Number.isFinite(t) ? `${format(t, 3)} s` : 'Never';
    const metrics = [
      ['Rise time (10–90%)', showTime(f.tr)],
      ['Peak time (tₚ)', f.tp === null ? 'No peak' : showTime(f.tp)],
      ['Overshoot (%OS)', `${format(f.overshoot, 3)}%`],
      ['Settling time (±2%)', showTime(f.ts)]
    ];
    $('thirdDampingType').textContent = damping;
    $('thirdMetrics').innerHTML = metrics.map(([name, value]) =>
      `<div class="metric-item"><div class="metric-label">${name}</div><div class="metric-value mono">${value}</div></div>`
    ).join('');

    const points = [
      { t: f.t10, text: '10%', color: '#596e64', place: 'bottom center' },
      { t: f.t90, text: 'tᵣ (90%)', color: '#596e64', place: 'bottom center' }
    ];
    if (f.tp !== null) points.push({ t: f.tp, text: `tₚ · ${format(f.overshoot, 1)}% OS`, color: '#ad492e', place: 'top center' });
    if (Number.isFinite(f.ts)) points.push({ t: f.ts, text: 'tₛ (2%)', color: '#0f766e', place: 'bottom center' });
    const markers = points.map(p => ({
      x: [p.t], y: [response(p.t, zeta, wn, K).x],
      text: [p.text], textposition: p.place, name: p.text, mode: 'markers+text',
      showlegend: false, marker: { size: 9, color: p.color },
      textfont: { size: 11, color: p.color }
    }));
    Plotly.react('thirdResponsePlot', [
      { x: time, y: position, mode: 'lines', name: 'Displacement x₁(t)', line: { color: '#0f766e', width: 3 } },
      { x: [0, duration], y: [K, K], mode: 'lines', name: 'Final reading', line: { color: '#7e8d85', dash: 'dash', width: 1.5 } },
      ...markers
    ], {
      ...layout,
      xaxis: { ...axis, title: 'Time (s)', range: [0, duration] },
      yaxis: { ...axis, title: 'Displacement (m)', range: [Math.min(0, ...position) - K * 0.08, Math.max(K * 1.08, ...position) + K * 0.1] },
      shapes: [
        { type: 'line', x0: 0, x1: duration, y0: K * 0.98, y1: K * 0.98, line: { color: '#b6c9c0', dash: 'dot', width: 1 } },
        { type: 'line', x0: 0, x1: duration, y0: K * 1.02, y1: K * 1.02, line: { color: '#b6c9c0', dash: 'dot', width: 1 } }
      ]
    }, chartConfig);
    $('thirdResponseNote').textContent = `Step response (K = ${format(K)}); rise time is the first 10%–90% transition. ${zeta === 0 ? 'No settling at zero damping.' : 'Settling uses the last crossing of the ±2% band.'}`;

    // A = [[0,1],[-k/m,-b/m]]; B = [[0],[1/m]], C = [1,0].
    $('thirdMatrixA').textContent = `⎡  0       1  ⎤\n⎣ ${format(-k / m)}   ${format(-b / m)} ⎦`;
    $('thirdMatrixB').textContent = `⎡ 0 ⎤\n⎣ ${format(1 / m)} ⎦`;
    $('thirdForce').textContent = `F(t) = ${format(k * K)} · u(t) N; final x₁ = ${format(K)} m`;
    $('thirdPoleText').textContent = `${poleLabel(roots[0])} ${zeta === 1 ? '(double pole)' : `, ${poleLabel(roots[1])}`}`;
    $('thirdEigenText').textContent = `${poleLabel(aEigen[0])} ${zeta === 1 ? '(double eigenvalue)' : `, ${poleLabel(aEigen[1])}`}`;

    // Exact overlapping markers: open ring for TF poles, smaller cross for A eigenvalues.
    const rootX = roots.map(p => p.re), rootY = roots.map(p => p.im);
    const eigenX = aEigen.map(p => p.re), eigenY = aEigen.map(p => p.im);
    const xMinimum = Math.min(...rootX, ...eigenX, -wn) * 1.2;
    const imagMax = Math.max(1, wn * 1.2, ...rootY.map(Math.abs), ...eigenY.map(Math.abs));
    Plotly.react('thirdPolePlot', [
      { x: rootX, y: rootY, name: 'G(s) poles (rings)', mode: 'markers', marker: { symbol: 'circle-open', size: 21, color: '#0f766e', line: { width: 2.4 } } },
      { x: eigenX, y: eigenY, name: 'A eigenvalues (×)', mode: 'markers', marker: { symbol: 'x', size: 10, color: '#ad492e', line: { width: 2.2 } } }
    ], {
      ...layout, margin: { l: 50, r: 18, t: 45, b: 45 },
      xaxis: { ...axis, title: 'Real (s⁻¹)', range: [xMinimum, wn * 0.3] },
      yaxis: { ...axis, title: 'Imaginary (s⁻¹)', range: [-imagMax, imagMax] },
      shapes: [{ type: 'line', x0: 0, x1: 0, y0: -imagMax, y1: imagMax, line: { color: '#98aba1', dash: 'dash' } }]
    }, chartConfig);
    Plotly.react('thirdPhasePlot', [
      { x: position, y: velocity, mode: 'lines', name: 'State trajectory', line: { color: '#0f766e', width: 2.5 } },
      { x: [0, K], y: [0, 0], mode: 'markers', name: 'Start / equilibrium', marker: { color: ['#ad492e', '#24362e'], size: 9, symbol: ['circle', 'diamond'] } }
    ], {
      ...layout, showlegend: true, margin: { l: 58, r: 18, t: 34, b: 49 },
      xaxis: { ...axis, title: 'x₁ — Displacement (m)' },
      yaxis: { ...axis, title: 'x₂ — Velocity (m/s)' }
    }, chartConfig);
    $('thirdPhaseNote').textContent = zeta === 0 ? `No damping: a closed orbit around the equilibrium (${format(K)}, 0).` :
      zeta < 1 ? `Underdamped: trajectory spirals toward (${format(K)}, 0).` :
        `Critical / overdamped: trajectory approaches (${format(K)}, 0) without oscillating.`;
  }

  // 6. Fixed assignment cases, independent of the user's sliders.
  function validationRows() {
    const osHalf = features(0.5, 2).overshoot;
    const osCritical = features(1, 2).overshoot;
    const m = 1, b = 2, k = 4;
    const wn = Math.sqrt(k / m), zeta = b / (2 * Math.sqrt(k * m));
    const tfPoles = poles(zeta, wn);
    const eigen = eigenvalues(m, b, k);
    const eigenReal = eigen[0].re;
    const eigenImag = Math.abs(eigen[0].im);
    const sameEigen = tfPoles.every((p, i) =>
      Math.abs(p.re - eigen[i].re) < 1e-10 && Math.abs(p.im - eigen[i].im) < 1e-10);
    return [
      ['4 / ζ = 0.5 overshoot', '16.3%', `${format(osHalf, 3)}%`, Math.abs(osHalf - 16.3) < 0.1 ? 'PASS' : 'FAIL'],
      ['5 / ζ = 1 overshoot', '0%', `${format(osCritical)}%`, osCritical === 0 ? 'PASS' : 'FAIL'],
      ['6 / m=1, b=2, k=4', 'ζ = 0.5, ωₙ = 2', `ζ = ${format(zeta)}, ωₙ = ${format(wn)}`, Math.abs(zeta - 0.5) < 1e-12 && Math.abs(wn - 2) < 1e-12 ? 'PASS' : 'FAIL'],
      ['6 / Poles = A eigenvalues', '−1 ± j1.732', `${format(eigenReal)} ± j${format(eigenImag)}`, sameEigen && Math.abs(eigenImag - 1.732) < 0.001 ? 'PASS' : 'FAIL']
    ];
  }
  function renderBenchmarks() {
    const rows = validationRows();
    $('thirdCheckRows').innerHTML = rows.map(([label, expect, actual, result]) =>
      `<tr><td>${label}</td><td class="mono">${expect}</td><td class="mono">${actual}</td><td class="mono bold ${result === 'PASS' ? 'pass' : 'fail'}">${result}</td></tr>`
    ).join('');
    $('thirdCheckSummary').textContent = `${rows.filter(r => r[3] === 'PASS').length} / ${rows.length} PASS`;
  }

  // 7. Predict first, then compare with the damping case.
  $('thirdPredictBtn').addEventListener('click', () => {
    const answer = $('thirdPrediction').value;
    const feedback = $('thirdPredictFeedback');
    if (!answer) {
      feedback.textContent = 'Choose a prediction first.';
      feedback.className = 'feedback wrong';
    } else if (answer === '1') {
      feedback.textContent = 'Correct. Increasing ζ reduces overshoot; at ζ ≥ 1 the step no longer overshoots.';
      feedback.className = 'feedback';
    } else {
      feedback.textContent = 'Try comparing ζ = 0.5, 1, and 1.5 on the plot, then check again.';
      feedback.className = 'feedback wrong';
    }
  });

  for (const [id, field] of [
    ['thirdZeta', 'zeta'], ['thirdWn', 'wn'], ['thirdGain', 'K'], ['thirdMass', 'm'],
    ['thirdDamper', 'b'], ['thirdSpring', 'k']
  ]) {
    $(id).addEventListener('input', () => {
      state[field] = Number($(id).value);
      if (field === 'zeta' || field === 'wn') fromModel();
      else if (field !== 'K') fromPhysical();
      syncControls();
      queueRender();
    });
  }
  document.querySelectorAll('input[name="thirdSource"]').forEach(radio => {
    radio.addEventListener('change', () => {
      state.source = $('thirdPhysicalChoice').checked ? 'physical' : 'model';
      syncControls();
      queueRender();
    });
  });
  for (const [id, zeta] of [['thirdUnderPreset', 0.5], ['thirdCriticalPreset', 1], ['thirdOverPreset', 1.5]]) {
    $(id).addEventListener('click', () => {
      state.source = 'model'; state.zeta = zeta; state.wn = 2; state.m = 1;
      fromModel(); syncControls(); queueRender();
    });
  }

  syncControls();
  renderBenchmarks();
  window.Module3 = { render, validationRows, response, poles, eigenvalues, features, getState: () => ({ ...state }) };
})();
