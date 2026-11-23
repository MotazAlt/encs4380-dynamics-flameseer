# Homework 2 — P3/P4 Testing and Demo Notes

This document describes the tests performed on the locally packaged project. **It does not certify that the updated files have been uploaded or deployed to GitHub Pages.**

## Browser checks

- Tested all home/P1/P2/P3/P4/validation routes in headless Chromium using local HTML/CSS/JS injection (navigation to localhost was restricted in the test environment).
- No JavaScript page errors were emitted in these checks.
- P1 still displayed all five response measurements; P2 displayed its three measurement tiles.
- The original Homework 1 validation suite still reported **10/10 PASS**.
- P3 showed a fast-sampling response (T_s = 0.02 s) with ~3.77% overshoot and ~2.63 s settling under its default Kp=2, Ki=3, Kd=0, K=1 and tau=1.
- The P3 Slow Sampling preset (T_s=1.22 s) produced severe overshoot and no confirmed settling for the same gains, demonstrating sample-time degradation.
- The P3 generated sketch changed when anti-windup was switched off; the code uses the exact gains and sample time from the sliders.
- An integral-only digital PID subject to actuator saturation produced a nonzero first controller command, confirming the anti-windup implementation does not freeze the actuator at zero.
- P4 generated hidden first- and second-order plants, scored individual spec results, improved partial scores on retest, did not award duplicate points on repeated tests, and revealed the true model after a scored test.
- Desktop and 390 px mobile layouts were visually inspected; the mobile document width stayed at 390 px with no horizontal overflow.
- P3 charts rendered after switching light/dark theme.

## Ziegler–Nichols bonus checks (new)

- The new `#control-bonus` route opens from both the sidebar and the homepage.
- Default plant `K=1`, `wn=2`, `zeta=0.3`, `tauS=0.5`: critical gain `Ku=1.560`, RK4 peak-derived period `Pu=2.480 s`, analytic period `2.484 s`.
- Applying the classic parallel-form rule gives `Kp=0.936`, `Ki=0.755`, `Kd=0.290`. The simulated ZN PID peak is approximately `1.223` (22.3% overshoot) and the final-window error is around `0.01%` at 24 s.
- The mobile bonus page at 390 px has no horizontal overflow. No JavaScript page errors occurred in the bonus workflow. P1–P4, validation, and home routes still navigate successfully.
- The reference model is unsaturated by design, to distinguish sustained *linear marginal oscillations* from actuator-limited oscillations. The experiment uses a second-order plant with a lagged first-order feedback sensor because the original P2 first-order loop cannot reach a P-only marginal oscillation.

## Five-minute demonstration

1. Open **P3 — Digital PID**. Keep `Kp=2`, `Ki=3`, `Kd=0`, and `Ts=0.02 s` to show a smooth output and rapid settling.
2. Click **Slow Sampling**. The control command is stair-stepped and the response shows large overshoot and failure to settle. Reset **Fast Sampling**.
3. Lower the command limit, add integral action, and compare **Anti-windup ON/OFF**. Copy the Arduino code and point out `Ts`, gains, conditional integration, PWM and direction pins.
4. Open **P4 — Tuning Challenge**. Start with the P-only gains and **Test Tuning**; the steady-state error will generally fail.
5. Select **PI Start**, retest, and inspect individual PASS/FAIL results. Only a higher score is added to the session total. Reveal parameters after finishing, then select **New Plant** for a second model.

## Outstanding items for the group

- Assign P3 and P4 owners through GitHub Issues and update the README's ownership section. Ensure each member makes meaningful commits.
- Provide measured micromouse motor gain/time constant from a PWM-to-encoder step response (or a cited source), plus the justified controller and simulated response for the separate **My System** requirement. No motor constants were fabricated in this P3/P4 implementation.
- Update GitHub Pages and publish the required `v2.0` release, then verify on the public live link and provide the Pages URL to the course page.
- Confirm the generated Arduino pin mapping and sensor normalization against your actual motor driver before using real hardware.
