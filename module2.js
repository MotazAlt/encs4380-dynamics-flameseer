// Module 2: first-order frequency response and shared module navigation.
(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const TAU_MIN = 0.0001;
  const TAU_MAX = 1;
  const OMEGA_MIN = 0.01;
  const OMEGA_MAX = 10000;
  const RAD_TO_DEG = 180 / Math.PI;
  const state = { tau: 0.2, omega: 2 };
  const modules = ['module-1', 'module-2'];
  let currentModule = 'module-1';
  let framePending = false;

  // 1. First-order steady-state response to x(t) = sin(omega * t).
  // Normalized magnitude M; phase is negative because output lags input.
  function magnitude(omega, tau) {
    return 1 / Math.hypot(1, omega * tau);
  }
  function phase(omega, tau) {
    return -Math.atan(omega * tau);
  }
  function maxTau(hertz, allowedErrorPercent) {
    const minimumMagnitude = 1 - allowedErrorPercent / 100;
    return Math.sqrt(1 / (minimumMagnitude ** 2) - 1) / (2 * Math.PI * hertz);
  }
  function sig(value, digits = 4) {
    return Number(value.toPrecision(digits)).toString();
  }
  function tauLabel(tau) {
    return tau < 0.01 ? `${sig(tau * 1000)} ms` : `${sig(tau)} s`;
  }
  function validInput(id, min, max) {
    const raw = $(id).value.trim();
    const value = Number(raw);
    return raw && Number.isFinite(value) && value >= min && value <= max ? value : null;
  }
  function clearNumberError(id) {
    $(id).removeAttribute('aria-invalid');
    $(id === 'freqTauNumber' ? 'freqTauError' : 'freqOmegaError').textContent = '';
  }
  function showNumberError(id, min, max) {
    $(id).setAttribute('aria-invalid', 'true');
    $(id === 'freqTauNumber' ? 'freqTauError' : 'freqOmegaError').textContent =
      `Enter a value from ${min} to ${max}.`;
  }

  // 2. Synchronize the logarithmic sliders and exact-value number inputs.
  function syncControls() {
    $('freqTauSlider').value = Math.log10(state.tau);
    $('freqOmegaSlider').value = Math.log10(state.omega);
    $('freqTauNumber').value = sig(state.tau, 8);
    $('freqOmegaNumber').value = sig(state.omega, 8);
    $('freqTauReadout').textContent = tauLabel(state.tau);
    $('freqOmegaReadout').textContent = `${sig(state.omega)} rad/s`;
    clearNumberError('freqTauNumber');
    clearNumberError('freqOmegaNumber');
    $('freqTauSlider').setAttribute('aria-valuetext', tauLabel(state.tau));
    $('freqOmegaSlider').setAttribute('aria-valuetext', `${sig(state.omega)} rad/s`);
  }

  function setState(tau, omega) {
    state.tau = tau;
    state.omega = omega;
    syncControls();
    queueRender();
  }

  function queueRender() {
    if (currentModule !== 'module-2' || framePending) return;
    framePending = true;
    requestAnimationFrame(() => {
      framePending = false;
      renderFrequency();
    });
  }

  // 3. Update amplitude, phase, cutoff and signed dynamic error.
  function updateMetrics() {
    const M = magnitude(state.omega, state.tau);
    const phi = phase(state.omega, state.tau);
    const cutoff = 1 / state.tau;
    const error = (M - 1) * 100;
    const items = [
      ['Amplitude ratio (M)', sig(M, 5)],
      ['Phase shift (φ)', `${sig(phi * RAD_TO_DEG, 5)}°`],
      ['Cutoff (ωc)', `${sig(cutoff, 5)} rad/s`],
      ['Dynamic error (δ)', `${sig(error, 5)}%`]
    ];
    $('freqMetrics').innerHTML = items.map(([label, value]) =>
      `<div class="metric-item"><div class="metric-label">${label}</div><div class="metric-value mono">${value}</div></div>`
    ).join('');
    return { M, phi, cutoff, error };
  }

  // 4. Two steady-state sine waves, using four complete input cycles.
  function drawSine(M, phi) {
    const period = 2 * Math.PI / state.omega;
    const end = 4 * period;
    const time = [];
    const input = [];
    const output = [];
    const samples = 600;
    for (let i = 0; i <= samples; i++) {
      const t = end * i / samples;
      time.push(t);
      input.push(Math.sin(state.omega * t));
      output.push(M * Math.sin(state.omega * t + phi));
    }

    const inputPeak = Math.PI / (2 * state.omega);
    const outputPeak = (Math.PI / 2 - phi) / state.omega;
    const traces = [
      { x: time, y: input, name: 'Input sin(ωt)', mode: 'lines', line: { color: '#4b5563', width: 2, dash: 'dash' } },
      { x: time, y: output, name: 'Sensor output', mode: 'lines', line: { color: '#0f766e', width: 3 } }
    ];
    Plotly.react('frequencyPlot', traces, {
      paper_bgcolor: '#ffffff', plot_bgcolor: '#ffffff',
      font: { family: 'system-ui, sans-serif', size: 12, color: '#374151' },
      margin: { l: 50, r: 15, t: 44, b: 48 },
      legend: { orientation: 'h', x: 0, y: 1.18 },
      xaxis: { title: 'Time (s)', range: [0, end], gridcolor: '#e5e7eb', zeroline: false, fixedrange: true },
      yaxis: { title: 'Amplitude', range: [-1.18, 1.18], gridcolor: '#e5e7eb', zeroline: false, fixedrange: true },
      shapes: [
        { type: 'line', x0: inputPeak, x1: inputPeak, y0: -1, y1: 1, line: { color: '#a1a1aa', width: 1, dash: 'dot' } },
        { type: 'line', x0: outputPeak, x1: outputPeak, y0: -1, y1: 1, line: { color: '#0f766e', width: 1, dash: 'dot' } }
      ]
    }, { responsive: true, displayModeBar: false });
    $('frequencyNote').textContent = `The output amplitude is ${sig(M, 4)} of the input, with ${sig(-phi * RAD_TO_DEG, 4)}° lag (${sig((outputPeak - inputPeak), 4)} s at this frequency).`;
  }

  // 5. Bode magnitude in dB and phase in degrees, with cutoff at 1/tau.
  function drawBode(cutoff) {
    const low = Math.min(cutoff, state.omega) / 18;
    const high = Math.max(cutoff, state.omega) * 18;
    const x = [];
    const magDb = [];
    const phaseDeg = [];
    const count = 260;
    const logLow = Math.log10(low);
    const logHigh = Math.log10(high);
    for (let i = 0; i <= count; i++) {
      const w = 10 ** (logLow + (logHigh - logLow) * i / count);
      x.push(w);
      magDb.push(20 * Math.log10(magnitude(w, state.tau)));
      phaseDeg.push(phase(w, state.tau) * RAD_TO_DEG);
    }
    const axis = { gridcolor: '#e5e7eb', zeroline: false, fixedrange: true, linecolor: '#9ca3af' };
    const decadeStep = Math.max(1, Math.ceil((logHigh - logLow) / 5));
    const frequencyTicks = [];
    const frequencyLabels = [];
    for (let exp = Math.ceil(logLow / decadeStep) * decadeStep; exp <= Math.floor(logHigh); exp += decadeStep) {
      const value = 10 ** exp;
      frequencyTicks.push(value);
      frequencyLabels.push(value >= 0.01 && value <= 10000 ? sig(value, 5) : value.toExponential(0));
    }
    const frequencyAxis = { tickmode: 'array', tickvals: frequencyTicks, ticktext: frequencyLabels };
    const traces = [
      { x, y: magDb, name: 'Magnitude', mode: 'lines', line: { color: '#0f766e', width: 2.5 }, xaxis: 'x', yaxis: 'y', hovertemplate: 'ω = %{x:.3g} rad/s<br>%{y:.2f} dB<extra></extra>' },
      { x, y: phaseDeg, name: 'Phase', mode: 'lines', line: { color: '#3f5d87', width: 2.5 }, xaxis: 'x2', yaxis: 'y2', hovertemplate: 'ω = %{x:.3g} rad/s<br>%{y:.1f}°<extra></extra>' },
      { x: [cutoff], y: [-3.01029995664], name: 'Cutoff', mode: 'markers', marker: { color: '#ae3e35', size: 8 }, showlegend: false, xaxis: 'x', yaxis: 'y', hovertemplate: 'Cutoff: %{x:.3g} rad/s<extra></extra>' },
      { x: [state.omega], y: [20 * Math.log10(magnitude(state.omega, state.tau))], name: 'Selected frequency', mode: 'markers', marker: { color: '#9b692c', size: 10, line: { color: '#fff', width: 1 } }, showlegend: false, xaxis: 'x', yaxis: 'y', hovertemplate: 'Input ω = %{x:.3g} rad/s<br>%{y:.2f} dB<extra></extra>' },
      { x: [state.omega], y: [phase(state.omega, state.tau) * RAD_TO_DEG], name: 'Selected phase', mode: 'markers', marker: { color: '#9b692c', size: 10, line: { color: '#fff', width: 1 } }, showlegend: false, xaxis: 'x2', yaxis: 'y2', hovertemplate: 'Input ω = %{x:.3g} rad/s<br>%{y:.1f}°<extra></extra>' }
    ];
    Plotly.react('bodePlot', traces, {
      paper_bgcolor: '#fff', plot_bgcolor: '#fff',
      font: { family: 'system-ui, sans-serif', color: '#374151', size: 11 },
      showlegend: false,
      margin: { l: 62, r: 20, t: 39, b: 54 },
      xaxis: { ...axis, ...frequencyAxis, type: 'log', range: [logLow, logHigh], domain: [0, 1], anchor: 'y', showticklabels: false },
      xaxis2: { ...axis, ...frequencyAxis, type: 'log', range: [logLow, logHigh], domain: [0, 1], anchor: 'y2', title: 'Angular frequency ω (rad/s)' },
      yaxis: { ...axis, domain: [0.58, 1], title: 'Gain (dB)', rangemode: 'tozero' },
      yaxis2: { ...axis, domain: [0, 0.39], title: 'Phase (°)', range: [-95, 5] },
      shapes: [
        { type: 'line', xref: 'x', yref: 'paper', x0: cutoff, x1: cutoff, y0: 0, y1: 1, line: { color: '#ae3e35', dash: 'dot', width: 1.5 } },
        { type: 'line', xref: 'paper', yref: 'y', x0: 0, x1: 1, y0: -3.01029995664, y1: -3.01029995664, line: { color: '#b1b6b2', dash: 'dot', width: 1 } }
      ],
      annotations: [
        { xref: 'x', yref: 'paper', x: cutoff, y: 1.06, text: 'ωc', showarrow: false, font: { color: '#ae3e35', size: 12 } }
      ]
    }, { responsive: true, displayModeBar: false });
    $('bodeNote').textContent = `Cutoff ωc = ${sig(cutoff, 4)} rad/s (${sig(cutoff / (2 * Math.PI), 4)} Hz). Red line: cutoff (−3.01 dB, −45°). Amber points: selected input frequency.`;
  }

  function renderFrequency() {
    if (typeof Plotly === 'undefined') {
      $('frequencyPlot').textContent = 'Plotly could not load. Confirm plotly.min.js is beside index.html.';
      $('bodePlot').textContent = 'The plotting library is unavailable.';
      return;
    }
    const { M, phi, cutoff } = updateMetrics();
    drawSine(M, phi);
    drawBode(cutoff);
  }

  // 6. Calculator for an allowable dynamic-error percentage at a chosen f.
  function updateDesignCalculator() {
    const hz = validInput('designHz', 0.01, 100000);
    const error = validInput('designError', 0.01, 99);
    const phaseHz = validInput('phaseHz', 0.01, 100000);
    for (const [id, value] of [['designHz', hz], ['designError', error], ['phaseHz', phaseHz]]) {
      if (value === null) $(id).setAttribute('aria-invalid', 'true');
      else $(id).removeAttribute('aria-invalid');
    }
    if (hz === null || error === null || phaseHz === null) {
      $('designResults').innerHTML = '<p class="feedback wrong">Enter frequencies from 0.01 to 100,000 Hz and an error limit from 0.01% to 99%.</p>';
      return;
    }
    const tau = maxTau(hz, error);
    const lag = -phase(2 * Math.PI * phaseHz, tau) * RAD_TO_DEG;
    const atLimit = (magnitude(2 * Math.PI * hz, tau) - 1) * 100;
    const items = [
      ['Maximum time constant', `${sig(tau * 1000, 5)} ms`],
      [`Phase lag at ${sig(phaseHz)} Hz`, `${sig(lag, 5)}°`],
      ['Error at design limit', `${sig(atLimit, 5)}%`]
    ];
    $('designResults').innerHTML = items.map(([label, val]) =>
      `<div class="metric-item"><div class="metric-label">${label}</div><div class="metric-value mono">${val}</div></div>`
    ).join('');
  }

  // 7. Independent slide-number benchmarks: checks 2 and 3.
  function runFrequencyValidation() {
    const lectureM = magnitude(2, 0.2);
    const lectureLag = -phase(2, 0.2) * RAD_TO_DEG;
    const tau100 = maxTau(100, 5);
    const lag50 = -phase(2 * Math.PI * 50, tau100) * RAD_TO_DEG;
    const checks = [
      ['Amp', lectureM, 0.93, 0.01, sig(lectureM, 5)],
      ['Phase', lectureLag, 21.8, 0.15, `${sig(lectureLag, 5)}°`],
      ['Tau', tau100 * 1000, 0.52, 0.02, `${sig(tau100 * 1000, 5)} ms`],
      ['50', lag50, 9.3, 0.15, `${sig(lag50, 5)}°`]
    ];
    let passed = 0;
    for (const [id, actual, expected, tol, display] of checks) {
      const good = Math.abs(actual - expected) <= tol;
      if (good) passed++;
      $(`freqVal${id}`).textContent = display;
      const element = $(`freqVal${id}Status`);
      element.textContent = good ? 'PASS' : 'FAIL';
      element.className = good ? 'mono bold pass' : 'mono bold fail';
    }
    $('freqCheckSummary').textContent = `${passed} / 4 Benchmarks Passed`;
    $('freqCheckSummary').className = passed === 4 ? 'mono bold pass' : 'mono bold fail';
  }

  // 8. Predictions, presets, and exact-value input handling.
  function checkAnswer() {
    const answer = $('freqAnswer').value;
    const feedback = $('freqFeedback');
    if (answer === '') {
      feedback.textContent = 'Choose a prediction first.';
      feedback.className = 'feedback wrong';
    } else if (answer === '0') {
      feedback.textContent = 'Correct. As ωτ increases, M decreases and the negative phase angle grows in magnitude.';
      feedback.className = 'feedback';
    } else {
      feedback.textContent = 'Try increasing ω and comparing the two sine waves and the Bode plot.';
      feedback.className = 'feedback wrong';
    }
  }
  function attachSlider(id, field) {
    $(id).addEventListener('input', () => {
      state[field] = 10 ** Number($(id).value);
      syncControls();
      queueRender();
    });
  }
  function attachNumber(id, field, minimum, maximum) {
    $(id).addEventListener('input', () => {
      const value = validInput(id, minimum, maximum);
      if (value === null) {
        showNumberError(id, minimum, maximum);
        return;
      }
      clearNumberError(id);
      state[field] = value;
      $(field === 'tau' ? 'freqTauSlider' : 'freqOmegaSlider').value = Math.log10(value);
      $(field === 'tau' ? 'freqTauReadout' : 'freqOmegaReadout').textContent = field === 'tau' ? tauLabel(value) : `${sig(value)} rad/s`;
      $(field === 'tau' ? 'freqTauSlider' : 'freqOmegaSlider').setAttribute('aria-valuetext',
        field === 'tau' ? tauLabel(value) : `${sig(value)} rad/s`);
      queueRender();
    });
    $(id).addEventListener('blur', () => {
      $(id).value = sig(state[field], 8);
      clearNumberError(id);
    });
  }

  // 9. Hash-based module navigation with desktop collapse and mobile drawer.
  const sidebar = $('siteSidebar');
  const appMain = $('mainContent');
  function closeMobileMenu(restoreFocus = false) {
    const wasOpen = document.body.classList.contains('mobile-open');
    document.body.classList.remove('mobile-open');
    appMain.inert = false;
    $('navBackdrop').hidden = true;
    $('mobileMenuToggle').setAttribute('aria-expanded', 'false');
    $('mobileMenuToggle').setAttribute('aria-label', 'Open module navigation');
    if (wasOpen && restoreFocus) $('mobileMenuToggle').focus();
  }
  function activateModule() {
    const fromMobileNav = document.body.classList.contains('mobile-open');
    const hash = window.location.hash.replace('#', '');
    currentModule = modules.includes(hash) ? hash : 'module-1';
    for (const id of modules) $(id).hidden = id !== currentModule;
    document.querySelectorAll('.module-nav-link').forEach(link => {
      const active = link.dataset.module === currentModule;
      link.classList.toggle('is-active', active);
      if (active) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
    $('currentModuleName').textContent = currentModule === 'module-1'
      ? '01 / First-Order Time Response' : '02 / First-Order Frequency Response';
    closeMobileMenu();
    if (fromMobileNav) requestAnimationFrame(() => {
      const heading = document.querySelector(`#${currentModule} h1`);
      if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); }
    });
    if (currentModule === 'module-2') {
      renderFrequency();
    } else if (typeof Plotly !== 'undefined') {
      requestAnimationFrame(() => {
        for (const id of ['timePlot', 'logPlot']) {
          const plot = $(id);
          if (plot && plot.data) Plotly.Plots.resize(plot);
        }
      });
    }
    window.scrollTo(0, 0);
  }

  $('sidebarCollapse').addEventListener('click', () => {
    const collapsed = document.body.classList.toggle('sidebar-collapsed');
    $('sidebarCollapse').setAttribute('aria-expanded', String(!collapsed));
    $('sidebarCollapse').setAttribute('aria-label', collapsed ? 'Expand sidebar' : 'Collapse sidebar');
    $('sidebarCollapse').title = collapsed ? 'Expand sidebar' : 'Collapse sidebar';
    $('sidebarCollapse').textContent = collapsed ? '›' : '‹';
  });
  $('mobileMenuToggle').addEventListener('click', () => {
    const open = document.body.classList.toggle('mobile-open');
    appMain.inert = open;
    $('navBackdrop').hidden = !open;
    $('mobileMenuToggle').setAttribute('aria-expanded', String(open));
    $('mobileMenuToggle').setAttribute('aria-label', open ? 'Close module navigation' : 'Open module navigation');
    if (open) sidebar.querySelector('.module-nav-link.is-active').focus();
  });
  $('navBackdrop').addEventListener('click', () => closeMobileMenu(true));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && document.body.classList.contains('mobile-open')) {
      closeMobileMenu(true);
    }
  });
  sidebar.addEventListener('keydown', event => {
    if (event.key !== 'Tab' || !document.body.classList.contains('mobile-open')) return;
    const links = [...sidebar.querySelectorAll('a[href]')];
    const first = links[0], last = links[links.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });
  window.addEventListener('hashchange', activateModule);
  document.querySelectorAll('.module-nav-link, .brand').forEach(link => link.addEventListener('click', () => {
    const linkTarget = link.getAttribute('href').slice(1);
    if (location.hash === `#${linkTarget}`) activateModule();
  }));

  // Resize plots when the sidebar changes the available content width.
  if (typeof ResizeObserver !== 'undefined') {
    let resizeFrame = 0;
    new ResizeObserver(() => {
      cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(() => {
        if (typeof Plotly === 'undefined') return;
        const ids = currentModule === 'module-1' ? ['timePlot', 'logPlot'] : ['frequencyPlot', 'bodePlot'];
        for (const id of ids) {
          const plot = $(id);
          if (plot && plot.data && plot.clientWidth > 0) Plotly.Plots.resize(plot);
        }
      });
    }).observe(document.querySelector('.app-main'));
  }

  attachSlider('freqTauSlider', 'tau');
  attachSlider('freqOmegaSlider', 'omega');
  attachNumber('freqTauNumber', 'tau', TAU_MIN, TAU_MAX);
  attachNumber('freqOmegaNumber', 'omega', OMEGA_MIN, OMEGA_MAX);
  $('lectureSineBtn').addEventListener('click', () => setState(0.2, 2));
  $('highFrequencyBtn').addEventListener('click', () => setState(maxTau(100, 5), 2 * Math.PI * 100));
  $('freqCheckBtn').addEventListener('click', checkAnswer);
  for (const id of ['designHz', 'designError', 'phaseHz']) {
    $(id).addEventListener('input', updateDesignCalculator);
  }

  syncControls();
  updateDesignCalculator();
  runFrequencyValidation();
  activateModule();
})();
