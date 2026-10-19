# GasLeakSVM — project defence & interview prep

Defence preparation for the M.S. project
*Real-Time Gas Leak Detection in Logistics and Manufacturing Environments Using Support Vector
Machine on IoT Gas Sensor Data* by **Md. Ashfaqur Rahman** (ID 18203096, Session MS 2023-2024), Department of Mathematics,
University of Chittagong, AMAT-527, supervisor Dr. Mohammad Jalal Ahammad.

**Live site:** https://fahadjrdev.github.io/GasLeakSVM/

| Download | Link |
|---|---|
| Report (PDF) | https://fahadjrdev.github.io/GasLeakSVM/GasLeakSVM.pdf |
| Report (Word) | https://fahadjrdev.github.io/GasLeakSVM/GasLeakSVM.docx |
| Experiment script | https://fahadjrdev.github.io/GasLeakSVM/data/svm_gas_experiment.py |
| Sensor data (CSV) | https://fahadjrdev.github.io/GasLeakSVM/data/Gas_Sensors_Measurements.csv |

The site is static HTML/CSS/JS. There is no build step on the server and no backend. Open
`index.html` directly, or serve the folder:

```
python -m http.server 8080     # then http://localhost:8080
```

## Layout

```
index.html          00  start here (with PDF / DOCX downloads)
report.html         01  the report, chapter by chapter
glossary.html       02  key terms, defined
problem.html        03  gas leaks and gas sensors
data.html           04  the dataset and what it shows
svm.html            05  the SVM idea: margins
derivation.html     06  the derivation, line by line
tuning.html         07  scaling, tuning and metrics
results.html        08  the results, figure by figure
qa-project.html     09  Q&A — the project
qa-math.html        10  Q&A — the mathematics
qa-weakspots.html   11  hard questions & honest gaps
cheatsheet.html     12  cheat sheet
lab.html            13  Python lab (Pyodide + scikit-learn in the browser)
qa-python.html      14  Q&A — programming
assets/style.css        design system, light + dark
assets/app.js           nav, theme, quiz mode, KaTeX, Pyodide runner
figures/                the report's figures
data/                   the dataset (CC BY 4.0) and the experiment script
```

Mathematics is rendered with KaTeX 0.16.11 from jsDelivr. The Python lab loads Pyodide 0.26.4
(which includes scikit-learn) from jsDelivr on the first Run. It needs about 20–30 seconds and
an internet connection the first time.

## Reproducing the report

Lab cells 1–4 load `data/Gas_Sensors_Measurements.csv`, make the same 70/15/15 stratified split
(seed 42), and train the same models:

- linear SVM on raw data: 80.31% test accuracy
- RBF-SVM with C = 100, γ = 10: 98.23% test accuracy, 1,304 support vectors
- time-ordered split: 54.37% test accuracy

Cell 7 recomputes the decision function f(x) = Σ αᵢyᵢK(xᵢ, x) + b from the model's support
vectors and shows that it matches scikit-learn.

## Data

MultimodalGasData — Narkhede, P., Walambe, R., Chandel, P., Mandaokar, S., & Kotecha, K. (2022).
Mendeley Data, https://doi.org/10.17632/zkwgkjkjn9.2 — licensed CC BY 4.0. The sensor CSV is
included here unchanged, with attribution.
