# ENCS4380 — Verification Report (v1.0)

**Project:** Dynamic Characteristics Interactive Toolkit
**Team:** 10
**Version reviewed:** `ENCS4380_Toolkit_v1.0` (12 November 2026)
**Scope:** Modules 1–4, validation suite, navigation, and packaged static assets.

## 1. Six lecture checks (10 numerical comparisons)

The reference values below were independently recalculated from the course equations. The application source includes a Validation Suite that compares its computed values against the six lecture checks and displays PASS/FAIL for each row.

**The table below gives the independently checked expected numerical results; it is not a claim that the deployed website has been tested.**

| Homework check                   | Quantity                           | Reference result        |
| -------------------------------- | ---------------------------------- | ----------------------- |
| 1 — First-order step (K=1, A=60) | Change at t=τ: KA(1−e⁻¹)           | 37.9272 (63.212% of KA) |
| 1 — First-order step             | Change at t=3τ: KA(1−e⁻³)          | 57.0128 (95.021% of KA) |
| 2 — τ=0.2 s, ω=2 rad/s           | Amplitude ratio M = 1/√(1+(ωτ)²)   | 0.92848 (≈0.93)         |
| 2 — same experiment              | Phase φ = −atan(ωτ)                | −21.8014° (≈−21.8°)     |
| 3 — 100 Hz, ≤5% amplitude error  | Maximum τ                          | 0.523117 ms (≈0.52 ms)  |
| 3 — τ=τmax, f=50 Hz              | Phase lag magnitude                | 9.33268° (≈9.3°)        |
| 4 — ζ=0.5                        | Percentage overshoot               | 16.3034% (≈16.3%)       |
| 5 — ζ=1                          | Percentage overshoot               | 0%                      |
| 6 — m=1 kg, b=2 N·s/m, k=4 N/m   | ζ and ωₙ                           | ζ=0.5, ωₙ=2 rad/s       |
| 6 — same physical model          | Poles of G(s) and eigenvalues of A | −1 ± j1.73205 s⁻¹       |

For Check 6:

- `A = [[0, 1], [−4, −2]]`
- `B = [[0], [1]]`

## 2. Source-code audit of v1.0

- **Module 1 (`app.js`):** Step and ramp models, τ/3τ markers, ramp asymptote, log-error display, and prediction interface are present. Its validation function is exposed to the shared dashboard.
- **Module 2 (`module2.js`):** Input/output sine waves, magnitude/phase calculations, Bode plots, dynamic-error calculator, prediction, and reference tests are present.
- **Module 3 (`module3.js`):** Underdamped, critically damped, and overdamped responses, physical parameters, state-space matrices, poles/eigenvalues, phase-plane plot, and reference checks are present.
- **Module 4 (`module4.js`):** Randomized first-order step/sine and second-order step challenges, noisy curves, hints, estimates, truth overlay, and running session scoring are implemented. This module is **not a placeholder**.
- **Navigation:** HTML contains Modules 1–4, Validation Suite, and About. The sidebar navigation supports these destinations.
- **Validation:** `module2.js` combines rows from Modules 1–3 and counts 10 numerical comparisons grouped into six numbered checks. The dashboard can be refreshed with **Run Checks**.

## 3. File and syntax verification

Performed against the **v1.0 ZIP**:

- `index.html` references `styles.css`, `plotly.min.js`, `app.js`, `module2.js`, `module3.js`, and `module4.js`; **all six files are included**.
- `node --check` completed successfully for all four application JavaScript files.
- No `TODO` markers were found in the four application JavaScript files.
- All six screenshots (`module1`, `module2`, `module3`, `module4`, `validation`, and `about`) are included.
- The source ZIP archive passed its integrity check.

## 4. Tests to perform on the published GitHub Pages site

These checks require the **deployed version** and are not certified by this source-code report:

- [x] Open the published URL in a private/incognito window and verify that the site loads with styling and all charts.
- [x] Switch through all four modules and the Validation Suite; confirm that links and active sidebar states work on desktop and phone.
- [x] Move each module's controls and verify that plotted curves and readouts update. Try ζ = 0, ζ = 1, and ζ > 1 in Module 3.
- [x] In Module 4, test **New Sensor → Hint → valid guess → Check Guess → revealed curves**, then confirm that a second submission cannot increase the score for the same round.
- [x] Click **Run Checks**; confirm **10/10 comparisons** and **6/6 numbered checks** show PASS.
- [x] Check narrow screens (approximately 320–390 px), collapsing/opening the mobile sidebar, and chart resizing.
- [x] Check browser DevTools Console for errors and GitHub **Actions** for the latest successful Pages deployment.

## 5. Submission note

This file documents the v1.0 source review and theoretical reference values. A successful source audit cannot guarantee every browser state or the live deployment.

If the site changes after v1.0, repeat the checks and update this report to match the submitted commit.

Confirm that the team responsibilities listed in `README.md` accurately reflect the team's actual work.
