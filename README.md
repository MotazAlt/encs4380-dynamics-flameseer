# ENCS4380 — Dynamic Characteristics Toolkit

Interactive sensor dynamics laboratory for ENCS4380 Interfacing Techniques, Birzeit University.

**Live site:** https://motazalt.github.io/encs4380-dynamics-flameseer/

## Features

- **Module 1 — First-order time:** Step/ramp responses, τ and 3τ markers, ramp lag/asymptote, log-error line, predictions, and validation.
- **Module 2 — First-order frequency:** Input/output sines, magnitude and phase lag, Bode curves, cutoff marker, dynamic-error calculator, and validation.
- **Module 3 — Second-order and state space:** Three damping cases, ζ/ωₙ/K sliders, linked m/b/k controls, rise/peak/overshoot/settling measurements, live A/B matrices, pole/eigenvalue comparison, phase portrait, predictions, and validation.
- **Validation suite:** All six numbered homework checks, presented as ten numerical comparisons.
- **Module 4:** Reserved view only; the sensor-guessing challenge is not implemented in this version.

Use the collapsible sidebar to switch modules. The navigation becomes a drawer on phones.

## Run

Open `index.html` in a browser or upload the source files to the root of the GitHub Pages repository. No backend or login is required. The plotting library is bundled in `plotly.min.js`.

## Project files

| File | Purpose |
| --- | --- |
| `index.html` | Views, controls, and validation suite |
| `styles.css` | White interface and responsive sidebar |
| `app.js` | Module 1 |
| `module2.js` | Module 2 and shared navigation |
| `module3.js` | Module 3 closed-form dynamics and state-space |
| `plotly.min.js` | Offline-ready plotting library |
| `VERIFICATION.md` | Local mathematical and browser test results |

### Module 3 units

For the mass-spring-damper, `m` is in kg, `b` in N·s/m, `k` in N/m, and `ωₙ` in rad/s. The step transfer function has adjustable gain `K`; the equivalent physical input is `F(t) = kK·u(t)` newtons, giving final displacement `x₁ = K` metres. Rise time is measured from 10% to 90%; settling time is the last crossing of the ±2% band. A system with ζ = 0 never settles.

## Team 10

The table below is a **proposed assignment of responsibilities**, not a verified record of completed individual work. Confirm and correct it against your team's actual commits and contributions before handing it to the instructor.

| Team member | Proposed ownership / responsibility |
| --- | --- |
| Ameer AbdelJabbar | Module 1 — first-order step/ramp response and validation check 1 |
| Motaz Tayseer | Module 2 — frequency response, Bode plot and checks 2–3 |
| Nidal AbuHammad | Module 3 — second-order and state-space modeling, checks 4–6 |
| Karam Naji | Sidebar integration, unified validation, responsive testing and GitHub Pages deployment |

## Screenshots

![Module 1](screenshots/module1.png)
![Module 2](screenshots/module2.png)
![Module 3](screenshots/module3.png)

## AI-use disclosure

ChatGPT assisted with implementation, UI refinement, and local testing. Team members should be able to explain all equations and code. Confirm the proposed ownership table above and document individual GitHub contributions before submission.
