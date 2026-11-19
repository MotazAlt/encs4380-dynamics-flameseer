const ToolkitCharts = (() => {
  'use strict';

  const STORAGE_KEY = 'encs4380-toolkit-theme';
  const listeners = new Set();

  const palettes = {
    light: {
      themeColor: '#f5f7f9',
      grid: '#e2e8f0',
      axisLine: '#94a3b8',
      text: '#334155',
      hoverBg: '#ffffff',
      hoverBorder: '#cbd5e1',
      accent: '#0f766e',
      secondary: '#2563eb',
      danger: '#b91c1c',
      warning: '#b45309',
      purple: '#6d28d9',
      mutedLine: '#94a3b8',
      bandLine: '#99b8b2',
      asymptote: '#926c46',
      ink: '#0f172a',
      markerBorder: '#ffffff',
      setpoint: '#64748b',
      truth: '#c2410c'
    },
    dark: {
      themeColor: '#0c1219',
      grid: '#233042',
      axisLine: '#475569',
      text: '#cbd5e1',
      hoverBg: '#16202c',
      hoverBorder: '#334155',
      accent: '#2dd4bf',
      secondary: '#60a5fa',
      danger: '#f87171',
      warning: '#fbbf24',
      purple: '#c084fc',
      mutedLine: '#64748b',
      bandLine: '#2d6a63',
      asymptote: '#d9a066',
      ink: '#f1f5f9',
      markerBorder: '#121a24',
      setpoint: '#94a3b8',
      truth: '#fb923c'
    }
  };

  function readSavedTheme() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'light' || saved === 'dark') return saved;
    } catch (_) {}
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function getTheme() {
    return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
  }

  function isDark() {
    return getTheme() === 'dark';
  }

  function colors() {
    return palettes[getTheme()];
  }

  function updateThemeControl(theme) {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', palettes[theme].themeColor);
    const btn = document.getElementById('themeToggle');
    if (!btn) return;
    const next = theme === 'dark' ? 'light' : 'dark';
    btn.setAttribute('aria-label', `Switch to ${next} theme`);
    btn.setAttribute('aria-pressed', String(theme === 'dark'));
    btn.title = `Switch to ${next} theme`;
    const use = btn.querySelector('use');
    if (use) use.setAttribute('href', theme === 'dark' ? '#icon-sun' : '#icon-moon');
  }

  function setTheme(theme, persist = true) {
    const resolved = theme === 'dark' ? 'dark' : 'light';
    document.documentElement.dataset.theme = resolved;
    if (persist) {
      try { localStorage.setItem(STORAGE_KEY, resolved); } catch (_) {}
    }
    updateThemeControl(resolved);
    listeners.forEach(fn => fn(resolved));
  }

  function toggleTheme() {
    setTheme(isDark() ? 'light' : 'dark', true);
  }

  function onThemeChange(fn) {
    listeners.add(fn);
  }

  const observeSize = typeof ResizeObserver !== 'undefined';
  const config = { responsive: !observeSize, displayModeBar: false, scrollZoom: false };

  function draw(id, traces, layout) {
    if (typeof Plotly === 'undefined') return;
    const c = colors();
    const axis = {
      automargin: true,
      fixedrange: true,
      showgrid: true,
      gridcolor: c.grid,
      gridwidth: 1,
      showline: true,
      linecolor: c.axisLine,
      zeroline: false,
      zerolinecolor: c.axisLine,
      tickfont: { color: c.text }
    };
    const figure = {
      ...layout,
      autosize: true,
      paper_bgcolor: 'rgba(0,0,0,0)',
      plot_bgcolor: 'rgba(0,0,0,0)',
      font: { family: 'system-ui, -apple-system, sans-serif', color: c.text, size: 12, ...layout.font },
      hoverlabel: { bgcolor: c.hoverBg, bordercolor: c.hoverBorder, font: { color: c.ink, size: 12 }, ...layout.hoverlabel },
      legend: { orientation: 'h', x: 0, xanchor: 'left', y: 1.04, yanchor: 'bottom', ...layout.legend }
    };
    for (const key of Object.keys(layout)) {
      if (/^[xy]axis\d*$/.test(key)) figure[key] = { ...axis, ...layout[key] };
    }
    return Plotly.react(id, traces, figure, config);
  }

  function renderMetrics(id, items) {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = items.map(([label, value]) =>
      `<div class="metric-item"><div class="metric-label">${label}</div><div class="metric-value mono">${value}</div></div>`
    ).join('');
  }

  if (observeSize) {
    const observer = new ResizeObserver(entries => {
      for (const { target, contentRect } of entries) {
        const layout = target._fullLayout;
        if (!layout || !contentRect.width || !contentRect.height) continue;
        if (Math.abs(contentRect.width - layout.width) >= 1 ||
            Math.abs(contentRect.height - layout.height) >= 1) {
          Plotly.Plots.resize(target);
        }
      }
    });
    document.querySelectorAll('.plot-box, .hero-plot').forEach(plot => observer.observe(plot));
  }

  setTheme(readSavedTheme(), false);
  const toggleBtn = document.getElementById('themeToggle');
  if (toggleBtn) toggleBtn.addEventListener('click', toggleTheme);

  return {
    draw,
    colors,
    renderMetrics,
    getTheme,
    isDark,
    setTheme,
    toggleTheme,
    onThemeChange,
    get line() {
      const c = colors();
      return {
        setpoint: { color: c.setpoint, width: 2, dash: 'dash' },
        process: { color: c.accent, width: 2.8, dash: 'solid' },
        controller: { color: c.secondary, width: 2.4, dash: 'dashdot' },
        measured: { color: c.purple, width: 2.4, dash: 'dot' },
        limit: { color: c.warning, width: 1.7, dash: 'dot' }
      };
    }
  };
})();
