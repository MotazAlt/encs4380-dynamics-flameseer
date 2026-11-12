# Module 2 — Verification notes

This review uses the ENCS4380 Homework 1 assignment, section 3 (Module 2) and section 3.2 (validation checks 2 and 3).

## 1. Mathematical model

For the normalized first-order sensor G(s) = 1/(τs + 1) under x(t) = sin(ωt):

- M = 1 / sqrt(1 + (ωτ)^2)
- φ = −atan(ωτ)
- y_ss(t) = M sin(ωt + φ)
- ωc = 1/τ; magnitude at cutoff is −3.0103 dB, phase is −45°.
- Signed dynamic error δ = M − 1; displayed in percent as 100(M − 1).
- With allowed attenuation e (as a fraction) at f Hz, τmax = sqrt(1/(1−e)^2−1)/(2πf).

These expressions are coded in `module2.js` and use angular frequency (rad/s) for the sine/Bode experiments, and ordinary frequency (Hz) in the design calculator. Conversion: ω=2πf.

## 2. Assignment benchmarks

| Check | Expected | Calculated | Result |
|---|---:|---:|---|
| τ=0.2 s, x=sin(2t): M | 0.93 | 0.92848 | PASS |
| τ=0.2 s, x=sin(2t): lag | 21.8° | 21.801° | PASS |
| 100 Hz, allowed attenuation 5%: τmax | ≈0.52 ms | 0.52312 ms | PASS |
| Phase lag at 50 Hz using τmax | 9.3° | 9.3327° | PASS |

The table on the page checks these fixed lecture examples independently of the active sliders.

## 3. Interaction regression checks

Tested the project through a self-contained browser preview using actual project HTML, CSS, JavaScript, and the bundled Plotly source:

1. Both Module 1 and Module 2 render, and their plots appear when switching views.
2. Direct `#module-2` selection activates the correct view and active sidebar state.
3. Slider and exact-number entries update magnitude, phase, and both plots.
4. At the input bounds (τ=0.0001–1 s, ω=0.01–10000 rad/s) values remain finite.
5. Invalid exact-number and calculator inputs are indicated and do not corrupt the plots.
6. The `sin(2t)` and 100 Hz presets produce the expected numbers.
7. The prediction question provides feedback; validation checks remain accessible.
8. Desktop sidebar collapse, mobile drawer, Escape-to-close, keyboard focus, and view navigation work.
9. Browser viewports 1440, 850, 390, and 320 px produce no JavaScript errors or horizontal document overflow.
10. Original Module 1 step/ramp controls, tea preset, and 2/2 validation remain functional.

**Deployment boundary:** Direct HTTP navigation to a local test server was blocked by the test environment. Source references and paths were checked separately. The live GitHub Pages URL was not tested here; verify it in a private browser window after uploading.

## 4. Scope and release readiness

This package implements Modules **1 and 2 only**. The full homework also requires Modules 3 and 4, validation checks 4–6, and an appropriate tagged final release. The assignment additionally requires team responsibilities and members' actual commit history; only team names were supplied, so responsibilities are not invented here.
