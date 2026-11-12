# ENCS4380 — Dynamic Characteristics Toolkit

Interactive sensor-response toolkit for ENCS4380 Interfacing Techniques, Birzeit University.

**GitHub Pages:** https://motazalt.github.io/encs4380-dynamics-flameseer/

## Implemented

- **Module 1 — Time response:** First-order step/ramp simulations, tea and unit-step presets, 63.2%/95% response markers, log-error plot, prediction, validation check 1.
- **Module 2 — Frequency response:** Adjustable time constant and angular frequency, input/output sine waves, amplitude/phase, Bode magnitude/phase and cutoff, dynamic-error design calculator, prediction, validation checks 2 and 3.
- Sidebar shortcuts switch between these two modules. Modules 3 and 4 are not included yet.

## Run

Open `index.html` in a browser. No backend is required. Plotly is included locally as `plotly.min.js`. To publish on GitHub Pages, upload the files **at the repository root** without renaming any of them.

## Files

`index.html` — Page structure, module views, navigation  
`styles.css` — Shared responsive styling  
`app.js` — Module 1  
`module2.js` — Module 2 and navigation  
`plotly.min.js` — Locally bundled chart library  
`VERIFICATION.md` — Manual review and test cases

## Team 10

- Ameer AbdelJabbar
- Motaz Tayseer
- Nidal AbuHammad
- Karam Naji

## Screenshots

![Module 1](screenshots/module1.png)

![Module 2](screenshots/module2.png)

## AI-use disclosure

ChatGPT assisted with development, UI refinement, and testing. Team members should review and be able to explain the code and equations.
