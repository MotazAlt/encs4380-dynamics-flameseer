# Bonus — Ziegler–Nichols PID Tuning (Ultimate-Gain Method)

This optional Homework 2 bonus is a fully browser-based simulation, linked as **ZN Tuning Bonus** from the sidebar and homepage. It is separate from P1–P4 and does not imply a hardware experiment was performed.

## Five-step demonstration

1. Open `#control-bonus` and make a prediction. With `Kp=0.6`, `ζ=0.30` and sensor `τs=0.50 s`, the P-only response is stable.
2. Move the **P-only gain** slider upward. Below the critical gain, oscillations decay; above it, they grow.
3. Click **Find Critical Gain**. The slider moves to the marginal gain, and the numerical response exhibits sustained oscillation.
4. Point out **Ku = 1.560**, **measured Pu ≈ 2.480 s** (theoretical period ≈ 2.484 s). These values follow from the default model and the RK4 simulation.
5. Click **Apply ZN PID**. Explain the computed gains **Kp = 0.936**, **Ki ≈ 0.755**, and **Kd ≈ 0.290**. The graph overlays the tuned PID response on the continuing P-only oscillation. Discuss the overshoot of ~22% (ZN is aggressive).

Try changing `ζ` or `τs`, then repeat steps 2–5. The period and critical gain will update for that new plant.

## Mathematical basis

Reuse the Module 3 second-order plant and the P2 lagging sensor:

```
G(s) = K * wn^2 / (s^2 + 2*zeta*wn*s + wn^2)
H(s) = 1 / (tauS*s + 1)
```

At P-only gain `Kp`, unity negative feedback through `H(s)` gives:

```
(tauS*s + 1)*(s^2 + 2*zeta*wn*s + wn^2) + Kp*K*wn^2 = 0

  a3 = tauS
  a2 = 1 + 2*zeta*wn*tauS
  a1 = 2*zeta*wn + wn^2*tauS
  a0 = wn^2*(1 + K*Kp)
```

A cubic reaches marginal stability at `a2*a1 = a3*a0` (with positive coefficients). Solve for the ultimate gain:

```
Ku = (a2*a1/(a3*wn^2) - 1)/K
omegaU = sqrt(a1/a3)
Pu(theory) = 2*pi/omegaU
```

The program finds `Ku` from the marginal-stability condition, **independently simulates** the critical P-only response using RK4 with `dt = 0.005 s`, and estimates **Pu from the last three peak-to-peak intervals**. It displays both the observed and predicted period so the result can be checked.

The classic Ziegler–Nichols **parallel/independent-gain form** is:

```
Kp = 0.60 * Ku
Ki = 1.20 * Ku / Pu
Kd = 0.075 * Ku * Pu

u = Kp*e + Ki*integral(e dt) - Kd*(filtered sensor derivative)
```

The derivative is taken on the delayed measured output rather than the reference, filtered with `0.05 s` as in P1. RK4 simulates the second-order plant, first-order sensor, integral state, and filtered derivative state. The plot compares P-only and tuned PID outputs and controller commands over 24 seconds.

## Why the chosen plant matters

A first-order plant and a first-order sensor in series give a *second-order* P-only characteristic polynomial with positive damping, which does not cross into sustained oscillation for positive proportional gain. A second-order plant **plus** a first-order sensor generates a *third-order* loop that can reach the needed marginal-stability boundary. This is why the example uses Module 3's plant with P2's feedback lag.

## Limits

- `K = 1`, `wn = 2 rad/s`; `ζ` and `τs` can be adjusted. The demo uses a unit setpoint and an **unlimited** ideal actuator. This avoids a saturation-induced limit cycle being mistaken for true marginal stability.
- A sufficiently unstable gain gives growing amplitudes; this is a **mathematical demonstration**, not safe hardware guidance.
- Ziegler–Nichols estimates are a starting point and may produce large overshoot; the simulated tuned response should be inspected before use on hardware.
- This bonus is **not** a substitute for the separate *My System* micromouse motor application and its measurement requirement.
