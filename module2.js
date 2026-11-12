// Module 2: First-Order Frequency Response & Navigation
(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const TAU_MIN = 0.0001;
  const TAU_MAX = 1;
  const OMEGA_MIN = 0.01;
  const OMEGA_MAX = 10000;
  const RAD_TO_DEG = 180 / Math.PI;
  const state = { tau: 0.2, omega: 2 };
  const modules = ['module-1', 'module-2', 'module-3', 'module-4', 'validation', 'about'];
  const moduleNames = {
    'module-1': '01 / First-Order Time Response',
    'module-2': '02 / First-Order Frequency Response',
    'module-3': '03 / Second-Order Response',
    'module-4': '04 / Guess the Sensor',
    validation: 'V / Validation Checks',
    about: 'About / Team 10'
  };
  let currentModule = 'module-1';

  // First-order frequency response: M = 1 / sqrt(1 + (omega * tau)^2), phi = -atan(omega * tau)
  function magnitude(omega, tau) {
    return 1 / Math.sqrt(1 + (omega * tau) ** 2);
  }
  function phase(omega, tau) {
    return -Math.atan(omega * tau);
  }
  function maxTau(hertz, allowedErrorPercent) {
    const M = 1 - allowedErrorPercent / 100;
    return Math.sqrt(1 / (M * M) - 1) / (2 * Math.PI * hertz);
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
    if (currentModule === 'module-2') renderFrequency();
  }

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
      xaxis: { title: { text: 'Time (s)' }, range: [0, end], gridcolor: '#e5e7eb', zeroline: false, fixedrange: true },
      yaxis: { title: { text: 'Amplitude' }, range: [-1.18, 1.18], gridcolor: '#e5e7eb', zeroline: false, fixedrange: true },
      shapes: [
        { type: 'line', x0: inputPeak, x1: inputPeak, y0: -1, y1: 1, line: { color: '#a1a1aa', width: 1, dash: 'dot' } },
        { type: 'line', x0: outputPeak, x1: outputPeak, y0: -1, y1: 1, line: { color: '#0f766e', width: 1, dash: 'dot' } }
      ]
    }, { responsive: true, displayModeBar: false });
    $('frequencyNote').textContent = `At ${sig(state.omega, 4)} rad/s (${sig(state.omega / (2 * Math.PI), 4)} Hz), the output amplitude is ${sig(M, 4)} of the input with ${sig(-phi * RAD_TO_DEG, 4)}° lag (${sig(outputPeak - inputPeak, 4)} s).`;
  }

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
    const cutoffDb = 20 * Math.log10(1 / Math.SQRT2);
    const traces = [
      { x, y: magDb, name: 'Magnitude', mode: 'lines', line: { color: '#0f766e', width: 2.5 }, xaxis: 'x', yaxis: 'y', hovertemplate: 'ω = %{x:.3g} rad/s<br>%{y:.2f} dB<extra></extra>' },
      { x, y: phaseDeg, name: 'Phase', mode: 'lines', line: { color: '#3f5d87', width: 2.5 }, xaxis: 'x2', yaxis: 'y2', hovertemplate: 'ω = %{x:.3g} rad/s<br>%{y:.1f}°<extra></extra>' },
      { x: [cutoff], y: [cutoffDb], name: 'Cutoff', mode: 'markers', marker: { color: '#ae3e35', size: 8 }, showlegend: false, xaxis: 'x', yaxis: 'y', hovertemplate: 'Cutoff: %{x:.3g} rad/s<extra></extra>' },
      { x: [state.omega], y: [20 * Math.log10(magnitude(state.omega, state.tau))], name: 'Selected frequency', mode: 'markers', marker: { color: '#9b692c', size: 10, line: { color: '#fff', width: 1 } }, showlegend: false, xaxis: 'x', yaxis: 'y', hovertemplate: 'Input ω = %{x:.3g} rad/s<br>%{y:.2f} dB<extra></extra>' },
      { x: [state.omega], y: [phase(state.omega, state.tau) * RAD_TO_DEG], name: 'Selected phase', mode: 'markers', marker: { color: '#9b692c', size: 10, line: { color: '#fff', width: 1 } }, showlegend: false, xaxis: 'x2', yaxis: 'y2', hovertemplate: 'Input ω = %{x:.3g} rad/s<br>%{y:.1f}°<extra></extra>' }
    ];
    Plotly.react('bodePlot', traces, {
      paper_bgcolor: '#fff', plot_bgcolor: '#fff',
      font: { family: 'system-ui, sans-serif', color: '#374151', size: 11 },
      showlegend: false,
      margin: { l: 62, r: 20, t: 39, b: 54 },
      xaxis: { ...axis, ...frequencyAxis, type: 'log', range: [logLow, logHigh], domain: [0, 1], anchor: 'y', showticklabels: false },
      xaxis2: { ...axis, ...frequencyAxis, type: 'log', range: [logLow, logHigh], domain: [0, 1], anchor: 'y2', title: { text: 'Angular frequency ω (rad/s)' } },
      yaxis: { ...axis, domain: [0.58, 1], title: { text: 'Gain (dB)' }, rangemode: 'tozero' },
      yaxis2: { ...axis, domain: [0, 0.39], title: { text: 'Phase (°)' }, range: [-95, 5] },
      shapes: [
        { type: 'line', xref: 'x', yref: 'paper', x0: cutoff, x1: cutoff, y0: 0, y1: 1, line: { color: '#ae3e35', dash: 'dot', width: 1.5 } },
        { type: 'line', xref: 'paper', yref: 'y', x0: 0, x1: 1, y0: cutoffDb, y1: cutoffDb, line: { color: '#b1b6b2', dash: 'dot', width: 1 } }
      ],
      annotations: [
        { xref: 'x', yref: 'paper', x: cutoff, y: 1.06, text: 'ωc', showarrow: false, font: { color: '#ae3e35', size: 12 } }
      ]
    }, { responsive: true, displayModeBar: false });
    $('bodeNote').textContent = `Cutoff ωc = ${sig(cutoff, 4)} rad/s (${sig(cutoff / (2 * Math.PI), 4)} Hz). Red line: cutoff (−3.01 dB, −45°). Amber points: selected input frequency.`;
  }

  function renderFrequency() {
    if (typeof Plotly === 'undefined') return;
    const { M, phi, cutoff } = updateMetrics();
    drawSine(M, phi);
    drawBode(cutoff);
  }

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

  function frequencyBenchmarks() {
    const lectureM = magnitude(2, 0.2);
    const lectureLag = -phase(2, 0.2) * RAD_TO_DEG;
    const tau100 = maxTau(100, 5);
    const lag50 = -phase(2 * Math.PI * 50, tau100) * RAD_TO_DEG;
    return [
      { id: 'Amp', label: '2 / Sine amplitude', expected: '0.93', actual: lectureM, reference: 0.93, tolerance: 0.01, display: sig(lectureM, 5) },
      { id: 'Phase', label: '2 / Sine phase lag', expected: '21.8°', actual: lectureLag, reference: 21.8, tolerance: 0.15, display: `${sig(lectureLag, 5)}°` },
      { id: 'Tau', label: '3 / Maximum τ at 100 Hz', expected: '≈ 0.52 ms', actual: tau100 * 1000, reference: 0.52, tolerance: 0.02, display: `${sig(tau100 * 1000, 5)} ms` },
      { id: '50', label: '3 / Phase lag at 50 Hz', expected: '9.3°', actual: lag50, reference: 9.3, tolerance: 0.15, display: `${sig(lag50, 5)}°` }
    ].map(c => ({ ...c, result: Math.abs(c.actual - c.reference) <= c.tolerance ? 'PASS' : 'FAIL' }));
  }

  function frequencyValidationRows() {
    return frequencyBenchmarks().map(c => [c.label, c.expected, c.display, c.result]);
  }

  function runFrequencyValidation() {
    const checks = frequencyBenchmarks();
    for (const c of checks) {
      $(`freqVal${c.id}`).textContent = c.display;
      const element = $(`freqVal${c.id}Status`);
      element.textContent = c.result;
      element.className = c.result === 'PASS' ? 'mono bold pass' : 'mono bold fail';
    }
    const passed = checks.filter(c => c.result === 'PASS').length;
    $('freqCheckSummary').textContent = `${passed} / 4 Benchmarks Passed`;
    $('freqCheckSummary').className = passed === 4 ? 'mono bold pass' : 'mono bold fail';
  }

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
      if (currentModule === 'module-2') renderFrequency();
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
      if (currentModule === 'module-2') renderFrequency();
    });
    $(id).addEventListener('blur', () => {
      $(id).value = sig(state[field], 8);
      clearNumberError(id);
    });
  }

  function updateValidationSuite() {
    const checks = [
      ...(window.Module1?.validationRows() || [
        ['1 / Step at τ', '63.2% of KA', 'Module 1 unavailable', 'FAIL'],
        ['1 / Step at 3τ', '95.0% of KA', 'Module 1 unavailable', 'FAIL']
      ]),
      ...frequencyValidationRows(),
      ...(window.Module3?.validationRows() || [
        ['4 / ζ = 0.5 overshoot', '16.3%', 'Module 3 unavailable', 'FAIL'],
        ['5 / ζ = 1 overshoot', '0%', 'Module 3 unavailable', 'FAIL'],
        ['6 / m=1, b=2, k=4', 'ζ = 0.5, ωₙ = 2', 'Module 3 unavailable', 'FAIL'],
        ['6 / Poles = A eigenvalues', '−1 ± j1.732', 'Module 3 unavailable', 'FAIL']
      ])
    ];
    $('suiteRows').innerHTML = checks.map(([label, expected, actual, result]) =>
      `<tr><td>${label}</td><td class="mono">${expected}</td>` +
      `<td class="mono">${actual}</td><td><span class="validation-result ${result === 'PASS' ? 'pass' : 'fail'}">${result}</span></td></tr>`
    ).join('');
    const passed = checks.filter(item => item[3] === 'PASS').length;
    $('suiteSummary').textContent = `${passed} / ${checks.length} PASS`;
    const passedGroups = [1, 2, 3, 4, 5, 6].filter(n => {
      const rows = checks.filter(c => c[0].startsWith(n + ' /'));
      return rows.length > 0 && rows.every(c => c[3] === 'PASS');
    }).length;
    $('suiteCheckCount').textContent = `${passedGroups} / 6 numbered checks passed`;
    $('suiteSummary').classList.toggle('fail', passed !== 10 || checks.length !== 10);
    $('suiteSummary').classList.toggle('pass', passed === 10 && checks.length === 10);
  }

  function resizeVisiblePlots() {
    if (typeof Plotly === 'undefined') return;
    const ids = currentModule === 'module-1' ? ['timePlot', 'logPlot'] :
      currentModule === 'module-2' ? ['frequencyPlot', 'bodePlot'] :
      currentModule === 'module-3' ? ['thirdResponsePlot', 'thirdPolePlot', 'thirdPhasePlot'] :
      currentModule === 'module-4' ? ['challengePlot'] : [];
    for (const id of ids) {
      const plot = $(id);
      if (plot && plot.data && plot.clientWidth > 0) Plotly.Plots.resize(plot);
    }
  }

  const sidebar = $('siteSidebar');
  const appMain = document.querySelector('.app-main');
  const mobileQuery = window.matchMedia('(max-width: 900px)');

  function closeMobileMenu(restoreFocus = false) {
    const wasOpen = document.body.classList.contains('mobile-open');
    document.body.classList.remove('mobile-open');
    appMain.inert = false;
    $('navBackdrop').hidden = true;
    sidebar.inert = mobileQuery.matches;
    $('mobileMenuToggle').setAttribute('aria-expanded', 'false');
    $('mobileMenuToggle').setAttribute('aria-label', 'Open module navigation');
    if (wasOpen && restoreFocus) $('mobileMenuToggle').focus();
  }

  function activateModule() {
    const wasMobileOpen = document.body.classList.contains('mobile-open');
    const hash = window.location.hash.slice(1);
    currentModule = modules.includes(hash) ? hash : 'module-1';
    for (const id of modules) $(id).hidden = id !== currentModule;
    document.querySelectorAll('.module-nav-link').forEach(link => {
      const active = link.dataset.module === currentModule;
      link.classList.toggle('is-active', active);
      if (active) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
    $('currentModuleName').textContent = moduleNames[currentModule];
    closeMobileMenu();
    if (currentModule === 'module-2') renderFrequency();
    if (currentModule === 'module-3' && window.Module3) window.Module3.render();
    if (currentModule === 'module-4' && window.Module4) window.Module4.render();
    if (currentModule === 'validation') updateValidationSuite();
    requestAnimationFrame(resizeVisiblePlots);
    if (wasMobileOpen) requestAnimationFrame(() => {
      const heading = document.querySelector(`#${currentModule} h1`);
      if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); }
    });
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
    const open = !document.body.classList.contains('mobile-open');
    document.body.classList.toggle('mobile-open', open);
    sidebar.inert = !open;
    appMain.inert = open;
    $('navBackdrop').hidden = !open;
    $('mobileMenuToggle').setAttribute('aria-expanded', String(open));
    $('mobileMenuToggle').setAttribute('aria-label', open ? 'Close module navigation' : 'Open module navigation');
    if (open) $('mobileSidebarClose').focus();
  });
  $('mobileSidebarClose').addEventListener('click', () => closeMobileMenu(true));
  $('navBackdrop').addEventListener('click', () => closeMobileMenu(true));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && document.body.classList.contains('mobile-open')) {
      closeMobileMenu(true);
    }
  });
  sidebar.addEventListener('keydown', event => {
    if (event.key !== 'Tab' || !document.body.classList.contains('mobile-open')) return;
    const focusable = [...sidebar.querySelectorAll('a[href], button')]
      .filter(el => !el.disabled && el.getClientRects().length);
    const first = focusable[0], last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault(); last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault(); first.focus();
    }
  });
  mobileQuery.addEventListener('change', () => closeMobileMenu());
  window.addEventListener('hashchange', activateModule);
  document.querySelectorAll('.module-nav-link, .brand').forEach(link =>
    link.addEventListener('click', () => {
      if (location.hash === link.getAttribute('href')) activateModule();
    })
  );

  if (typeof ResizeObserver !== 'undefined') {
    let resizeFrame = 0;
    new ResizeObserver(() => {
      cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(() => {
        if (typeof Plotly === 'undefined') return;
        resizeVisiblePlots();
      });
    }).observe(appMain);
  }

  attachSlider('freqTauSlider', 'tau');
  attachSlider('freqOmegaSlider', 'omega');
  attachNumber('freqTauNumber', 'tau', TAU_MIN, TAU_MAX);
  attachNumber('freqOmegaNumber', 'omega', OMEGA_MIN, OMEGA_MAX);
  $('lectureSineBtn').addEventListener('click', () => setState(0.2, 2));
  $('highFrequencyBtn').addEventListener('click', () => setState(maxTau(100, 5), 2 * Math.PI * 100));
  $('freqCheckBtn').addEventListener('click', checkAnswer);
  $('suiteRun').addEventListener('click', updateValidationSuite);
  for (const id of ['designHz', 'designError', 'phaseHz']) {
    $(id).addEventListener('input', updateDesignCalculator);
  }

  syncControls();
  updateDesignCalculator();
  runFrequencyValidation();
  document.addEventListener('DOMContentLoaded', activateModule, { once: true });
})();
