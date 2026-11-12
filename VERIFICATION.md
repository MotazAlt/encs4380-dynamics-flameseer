# Local verification — Modules 1, 2 and 3

This report describes **local** checks. The live GitHub Pages deployment is not updated by generating these files.

## Module 1

- Step equation: `y(t) − y(0) = KA(1 − exp(−t/τ))`.
- Tea example (y₀=20°C, A=60°C, K=1, τ=10 s): 57.93°C at τ and 77.01°C at 3τ.
- Ramp equation: `KR(t−τ+τ exp(−t/τ))`; steady-state lag = τ and asymptotic vertical difference = KRτ.
- Log error fraction: `−t/τ`; full line visible across τ = 0.5 and 25 s.
- Presets, markers, prediction, and 2/2 step benchmark values passed.

## Module 2

- Amplitude `M = 1/sqrt(1+(ωτ)²)`; phase `−atan(ωτ)`.
- At τ = 0.2 s, ω = 2 rad/s: M = 0.92848 and phase = −21.801°.
- Cutoff `ωc = 1/τ`; dynamic error `δ = M−1`.
- Maximum τ at 100 Hz and 5% attenuation = 0.52312 ms; lag at 50 Hz = 9.3327°.
- Sine and Bode charts, cutoff marker, calculator, presets, and 4/4 frequency comparisons passed.

## Module 3

- Exact underdamped, critical, and overdamped step responses, with static gain K.
- ζ=0 is undamped: sustained oscillations, 100% overshoot, and no finite 2% settling time.
- Rise time uses first 10% and 90% crossings; settling time finds the **last** crossing of the ±2% band (not the approximate `4/(ζωₙ)` value).
- Default ζ = 0.5, ωₙ = 2 rad/s, K = 1: tᵣ = 0.818786 s; tₚ = 1.813799 s; overshoot = 16.303353%; tₛ = 4.038174 s.
- Critical and overdamped outputs do not overshoot; tested ζ = 1 and ζ = 1.5.
- Physical model m=1 kg, b=2 N·s/m, k=4 N/m gives ζ=0.5, ωₙ=2 rad/s, and A=[0 1;−4 −2], B=[0;1].
- Poles of the transfer function and eigenvalues computed separately from A: −1 ± j1.73205 s⁻¹.
- Gain K=2 test: final displacement 2 m, force step 8 N, equilibrium point (2,0).
- Further damping edge cases tested at ζ=0.01, 0.1, 0.99, 1.01, 2.5, and 10. All evaluated finite settling-time values remained within ±2% afterward.
- Module 3 validation: 4/4 numeric comparisons passed (checks 4–6).

## Integrated browser tests

- Chromium viewport widths: 1440, 850, 390, and 320 px, with no page JavaScript exceptions or horizontal overflow.
- Switch between Modules 1, 2, 3 and the validation view. Mobile sidebar open/close and navigation tested.
- Normalized and physical parameter controls, damping presets, K slider, prediction interaction, all three plots, and live matrices tested.
- Validation suite: **10/10 numerical comparisons**, across six numbered assignment checks.
- Actual standalone HTTP/HTTPS navigation could not be tested in this sandbox, so final GitHub Pages deployment must still be checked.

## After final audit

- Scoped Module 1 slider/radio listeners to `#module-1` and exposed `window.Module1` for validation.
- Gave Module 1 and Module 2 independent validation data functions, shared by both their own tables and the unified suite.
- Fixed initial script loading to Plotly → Module 1 → Module 2 router → Module 3 and delayed hash activation until DOMContentLoaded (after all deferred scripts register).
- Preserved Module 4 as a clearly labeled placeholder.

## Final regression tests (12 November 2026)

- Chromium interactive-browser checks passed at **1440, 850, 390 and 320 px**, with no JavaScript exceptions or horizontal overflow.
- Direct initial URLs ending in `#module-1`, `#module-2`, `#module-3` and `#validation` activate their views and render the appropriate charts.
- Test instrumentation verified that interacting with Module 2 and Module 3 controls does not call Module 1's Plotly redraw functions.
- Module 1's table and unified suite return the same two **PASS** results even when Ramp is selected and its slope differs from the retained step amplitude.
- All six numbered assignment checks (ten numerical comparisons) pass on the validation page.
- Boundary tests: τ = 0.5 and 25 s (Module 1); τ = 0.0001 and 1 s, ω = 0.01 and 10,000 rad/s (Module 2); ζ = 0, 0.01, 0.99, 1, 1.01 and 2.5, and a strongly overdamped physical model (Module 3).
- Module 4 remains a placeholder, per scope. Actual GitHub Pages deployment was not tested in this sandbox; references to local CSS/JavaScript assets were checked and all target files are included.

## Before submission

Deploy the project files to the root of the repository, verify the latest successful GitHub Pages deployment, and test the public URL on a phone. Module 4 remains to be built for the complete homework. Document actual member responsibilities and contribution history.
