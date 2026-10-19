"""
Real-Time Gas Leak Detection Using Support Vector Machine
Dataset : MultimodalGasData (Narkhede et al., 2022) - gas sensor measurements only
Model   : Support Vector Machine (baseline linear SVM -> tuned RBF-kernel SVM)

Run:  python svm_gas_experiment.py  (expects ../data_raw/Gas_Sensors_Measurements.csv)
Outputs figures to ../figures and numeric results to ../results
"""

# STEP 0: IMPORT LIBRARIES
import os
import json
import time
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import seaborn as sns
from matplotlib.colors import ListedColormap
import warnings
warnings.filterwarnings("ignore")

from sklearn.model_selection import train_test_split, GridSearchCV, StratifiedKFold, learning_curve
from sklearn.preprocessing import StandardScaler, label_binarize
from sklearn.pipeline import Pipeline
from sklearn.svm import SVC
from sklearn.decomposition import PCA
from sklearn.metrics import (accuracy_score, precision_recall_fscore_support, confusion_matrix,
                             classification_report, roc_curve, auc, roc_auc_score)

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(BASE, "data_raw", "Gas_Sensors_Measurements.csv")
FIG = os.path.join(BASE, "figures")
RES = os.path.join(BASE, "results")
os.makedirs(FIG, exist_ok=True)
os.makedirs(RES, exist_ok=True)

SEED = 42
SENSORS = ["MQ2", "MQ3", "MQ5", "MQ6", "MQ7", "MQ8", "MQ135"]
CLASSES = ["NoGas", "Perfume", "Smoke", "Mixture"]
plt.rcParams.update({"font.family": "Times New Roman", "font.size": 11, "figure.dpi": 150})
results = {}

# STEP 1: LOAD THE DATASET
df = pd.read_csv(DATA)
print(df.head())
print(df["Gas"].value_counts())
results["n_samples"] = int(len(df))
results["class_counts"] = df["Gas"].value_counts().to_dict()

X = df[SENSORS].values.astype(float)
y = df["Gas"].map({c: i for i, c in enumerate(CLASSES)}).values

# STEP 2: EXPLORATORY DATA ANALYSIS
desc = df.groupby("Gas")[SENSORS].agg(["mean", "std"]).round(2)
desc.to_csv(os.path.join(RES, "class_wise_statistics.csv"))
df[SENSORS].describe().round(2).to_csv(os.path.join(RES, "descriptive_statistics.csv"))

# Box plots of each sensor by class
fig, axes = plt.subplots(2, 4, figsize=(14, 6.5))
for ax, s in zip(axes.flat, SENSORS):
    sns.boxplot(data=df, x="Gas", y=s, order=CLASSES, ax=ax, palette="Set2", hue="Gas", legend=False)
    ax.set_title(s); ax.set_xlabel(""); ax.set_ylabel("Sensor reading (ADC)")
    ax.tick_params(axis="x", rotation=20)
axes.flat[-1].axis("off")
plt.tight_layout(); plt.savefig(os.path.join(FIG, "fig_boxplots.png")); plt.close()

# Sensor signal over time (sample index) for each class
fig, axes = plt.subplots(2, 2, figsize=(13, 7), sharey=True)
for ax, c in zip(axes.flat, CLASSES):
    sub = df[df["Gas"] == c]
    for s in SENSORS:
        ax.plot(sub["Serial Number"].values, sub[s].values, lw=0.8, label=s)
    ax.set_title(f"Class: {c}"); ax.set_xlabel("Sample index (time order)"); ax.set_ylabel("Reading (ADC)")
axes.flat[0].legend(ncol=4, fontsize=8)
plt.tight_layout(); plt.savefig(os.path.join(FIG, "fig_signals.png")); plt.close()

# Correlation heat map
plt.figure(figsize=(7, 5.5))
sns.heatmap(df[SENSORS].corr(), annot=True, fmt=".2f", cmap="coolwarm", vmin=-1, vmax=1)
plt.title("Pearson Correlation Between Gas Sensors")
plt.tight_layout(); plt.savefig(os.path.join(FIG, "fig_correlation.png")); plt.close()
results["correlation"] = df[SENSORS].corr().round(3).to_dict()

# STEP 3: TRAIN / VALIDATION / TEST SPLIT (70 / 15 / 15, stratified)
X_train, X_tmp, y_train, y_tmp = train_test_split(X, y, test_size=0.30, stratify=y, random_state=SEED)
X_val, X_test, y_val, y_test = train_test_split(X_tmp, y_tmp, test_size=0.50, stratify=y_tmp, random_state=SEED)
results["split"] = {"train": len(y_train), "validation": len(y_val), "test": len(y_test)}
print("Split:", results["split"])

# STEP 4: PCA VISUALISATION (on standardised training data)
sc_vis = StandardScaler().fit(X_train)
pca = PCA(n_components=7).fit(sc_vis.transform(X_train))
results["pca_explained_variance_ratio"] = pca.explained_variance_ratio_.round(4).tolist()
Z = pca.transform(sc_vis.transform(X_train))[:, :2]
plt.figure(figsize=(7, 5.5))
for i, c in enumerate(CLASSES):
    plt.scatter(Z[y_train == i, 0], Z[y_train == i, 1], s=6, alpha=0.6, label=c)
plt.xlabel(f"PC1 ({pca.explained_variance_ratio_[0]*100:.1f}% variance)")
plt.ylabel(f"PC2 ({pca.explained_variance_ratio_[1]*100:.1f}% variance)")
plt.title("PCA Projection of Standardised Sensor Data"); plt.legend(markerscale=3)
plt.tight_layout(); plt.savefig(os.path.join(FIG, "fig_pca.png")); plt.close()


def evaluate(model, Xs, ys, name):
    """Return metrics dictionary for a fitted model on a data split."""
    yp = model.predict(Xs)
    p, r, f, _ = precision_recall_fscore_support(ys, yp, average="macro", zero_division=0)
    return {"split": name, "accuracy": accuracy_score(ys, yp), "precision_macro": p,
            "recall_macro": r, "f1_macro": f}


# STEP 5: BASELINE MODEL - LINEAR SVM ON RAW (UNSCALED) READINGS
baseline = SVC(kernel="linear", C=1.0, random_state=SEED, max_iter=200000)
t0 = time.perf_counter(); baseline.fit(X_train, y_train); t_base = time.perf_counter() - t0
results["baseline"] = {"train_time_s": t_base,
                       "metrics": [evaluate(baseline, X_train, y_train, "train"),
                                   evaluate(baseline, X_val, y_val, "validation"),
                                   evaluate(baseline, X_test, y_test, "test")],
                       "n_support_vectors": int(baseline.n_support_.sum())}
print("Baseline:", results["baseline"]["metrics"])

# STEP 6: IMPROVED MODEL - STANDARDISATION + RBF SVM WITH GRID SEARCH (5-FOLD CV)
pipe = Pipeline([("scaler", StandardScaler()),
                 ("svm", SVC(kernel="rbf", probability=True, random_state=SEED))])
param_grid = {"svm__C": [0.1, 1, 10, 100, 1000, 10000],
              "svm__gamma": [0.001, 0.01, 0.1, 1, 10, 30, 100]}
cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=SEED)
grid = GridSearchCV(pipe, param_grid, cv=cv, scoring="accuracy", n_jobs=-1, return_train_score=True)
t0 = time.perf_counter(); grid.fit(X_train, y_train); t_grid = time.perf_counter() - t0
best = grid.best_estimator_
results["grid"] = {"best_params": grid.best_params_, "best_cv_accuracy": grid.best_score_,
                   "search_time_s": t_grid}
print("Best params:", grid.best_params_, "CV acc:", grid.best_score_)

# Grid-search heat map (mean CV accuracy for each C, gamma)
cvres = pd.DataFrame(grid.cv_results_)
heat = cvres.pivot_table(index="param_svm__C", columns="param_svm__gamma", values="mean_test_score")
heat.to_csv(os.path.join(RES, "grid_search_cv_accuracy.csv"))
heat.index = [f"{v:g}" for v in heat.index]
heat.columns = [f"{v:g}" for v in heat.columns]
plt.figure(figsize=(7, 5))
sns.heatmap(heat, annot=True, fmt=".3f", cmap="viridis")
plt.xlabel(r"Kernel parameter $\gamma$"); plt.ylabel("Regularisation parameter C")
plt.title("5-Fold Cross-Validation Accuracy (RBF-SVM Grid Search)")
plt.tight_layout(); plt.savefig(os.path.join(FIG, "fig_grid_heatmap.png")); plt.close()

# Also compare kernels at their own best settings (all SVM - kernel ablation)
kernel_rows = []
for kern, grid_k in {"linear": {"svm__C": [0.1, 1, 10, 100]},
                     "poly": {"svm__C": [0.1, 1, 10, 100], "svm__degree": [2, 3]},
                     "rbf": param_grid}.items():
    pk = Pipeline([("scaler", StandardScaler()), ("svm", SVC(kernel=kern, random_state=SEED))])
    gk = GridSearchCV(pk, grid_k, cv=cv, scoring="accuracy", n_jobs=-1).fit(X_train, y_train)
    kernel_rows.append({"kernel": kern, "best_params": str(gk.best_params_),
                        "cv_accuracy": gk.best_score_,
                        "test_accuracy": accuracy_score(y_test, gk.predict(X_test))})
pd.DataFrame(kernel_rows).to_csv(os.path.join(RES, "kernel_comparison.csv"), index=False)
results["kernel_comparison"] = kernel_rows

# STEP 7: EVALUATE THE IMPROVED MODEL
results["improved"] = {"metrics": [evaluate(best, X_train, y_train, "train"),
                                   evaluate(best, X_val, y_val, "validation"),
                                   evaluate(best, X_test, y_test, "test")],
                       "n_support_vectors": int(best.named_steps["svm"].n_support_.sum()),
                       "support_vectors_per_class": best.named_steps["svm"].n_support_.tolist()}
print("Improved:", results["improved"]["metrics"])

y_pred = best.predict(X_test)
report = classification_report(y_test, y_pred, target_names=CLASSES, digits=4, output_dict=True)
results["classification_report_test"] = report
with open(os.path.join(RES, "classification_report_test.txt"), "w") as fh:
    fh.write(classification_report(y_test, y_pred, target_names=CLASSES, digits=4))

# Binary leak-detection view: NoGas = no leak (0); Perfume, Smoke, Mixture = gas present (1)
yb_true, yb_pred = (y_test != 0).astype(int), (y_pred != 0).astype(int)
tn, fp, fn, tp = confusion_matrix(yb_true, yb_pred).ravel()
results["binary_leak_view"] = {"TP": int(tp), "TN": int(tn), "FP": int(fp), "FN": int(fn),
                               "sensitivity": tp / (tp + fn), "specificity": tn / (tn + fp),
                               "false_alarm_rate": fp / (fp + tn), "missed_leak_rate": fn / (fn + tp),
                               "accuracy": (tp + tn) / len(yb_true)}
print("Binary leak view:", results["binary_leak_view"])

for name, model in [("baseline", baseline), ("improved", best)]:
    cm = confusion_matrix(y_test, model.predict(X_test))
    results[f"confusion_matrix_{name}"] = cm.tolist()
    plt.figure(figsize=(6, 5))
    sns.heatmap(cm, annot=True, fmt="d", cmap="Blues", cbar=False, xticklabels=CLASSES, yticklabels=CLASSES)
    plt.xlabel("Predicted Label"); plt.ylabel("True Label")
    plt.title(f"Confusion Matrix on Test Data ({'Linear SVM' if name == 'baseline' else 'RBF-SVM'})")
    plt.tight_layout(); plt.savefig(os.path.join(FIG, f"fig_confusion_{name}.png")); plt.close()

# One-vs-rest ROC curves
y_score = best.predict_proba(X_test)
y_bin = label_binarize(y_test, classes=range(4))
plt.figure(figsize=(6.5, 5.5))
roc_auc = {}
for i, c in enumerate(CLASSES):
    fpr, tpr, _ = roc_curve(y_bin[:, i], y_score[:, i])
    roc_auc[c] = auc(fpr, tpr)
    plt.plot(fpr, tpr, lw=2, label=f"{c} (AUC = {roc_auc[c]:.4f})")
plt.plot([0, 1], [0, 1], "k--", label="Chance level")
plt.xlabel("False Positive Rate"); plt.ylabel("True Positive Rate")
plt.title("One-vs-Rest ROC Curves (RBF-SVM, Test Data)"); plt.legend(loc="lower right")
plt.tight_layout(); plt.savefig(os.path.join(FIG, "fig_roc.png")); plt.close()
results["roc_auc_per_class"] = roc_auc
results["roc_auc_macro"] = roc_auc_score(y_bin, y_score, average="macro", multi_class="ovr")

# Learning curve
sizes, tr_sc, va_sc = learning_curve(best, X_train, y_train, cv=cv, n_jobs=-1,
                                     train_sizes=np.linspace(0.1, 1.0, 8), scoring="accuracy")
plt.figure(figsize=(7, 5))
plt.plot(sizes, tr_sc.mean(1), "o-", label="Training accuracy")
plt.plot(sizes, va_sc.mean(1), "o-", label="Cross-validation accuracy")
plt.fill_between(sizes, va_sc.mean(1) - va_sc.std(1), va_sc.mean(1) + va_sc.std(1), alpha=0.2)
plt.xlabel("Number of training samples"); plt.ylabel("Accuracy"); plt.title("Learning Curve of RBF-SVM")
plt.legend(); plt.grid(alpha=0.3)
plt.tight_layout(); plt.savefig(os.path.join(FIG, "fig_learning_curve.png")); plt.close()
results["learning_curve"] = {"sizes": sizes.tolist(), "train": tr_sc.mean(1).tolist(), "cv": va_sc.mean(1).tolist()}

# STEP 8: DECISION REGIONS IN 2-D PCA SPACE (illustration of the SVM boundary)
vis = Pipeline([("scaler", StandardScaler()), ("pca", PCA(n_components=2)),
                ("svm", SVC(kernel="rbf", C=grid.best_params_["svm__C"], gamma="scale"))]).fit(X_train, y_train)
Ztr = vis[:-1].transform(X_train)
xx, yy = np.meshgrid(np.linspace(Ztr[:, 0].min() - 1, Ztr[:, 0].max() + 1, 400),
                     np.linspace(Ztr[:, 1].min() - 1, Ztr[:, 1].max() + 1, 400))
zz = vis.named_steps["svm"].predict(np.c_[xx.ravel(), yy.ravel()]).reshape(xx.shape)
plt.figure(figsize=(7.5, 6))
plt.contourf(xx, yy, zz, alpha=0.20, cmap=ListedColormap(["C0", "C1", "C2", "C3"]),
             levels=[-0.5, 0.5, 1.5, 2.5, 3.5])
for i, c in enumerate(CLASSES):
    plt.scatter(Ztr[y_train == i, 0], Ztr[y_train == i, 1], s=5, label=c)
plt.xlabel("Principal Component 1"); plt.ylabel("Principal Component 2")
plt.title("RBF-SVM Decision Regions in 2-D PCA Space"); plt.legend(markerscale=3)
plt.tight_layout(); plt.savefig(os.path.join(FIG, "fig_decision_regions.png")); plt.close()

# STEP 9: REAL-TIME INFERENCE LATENCY (one reading at a time, like a live sensor stream)
stream = X_test[:500]
for m in (best,):
    m.predict(stream[:1])  # warm-up
lat = []
for row in stream:
    t0 = time.perf_counter(); best.predict(row.reshape(1, -1)); lat.append((time.perf_counter() - t0) * 1000)
lat = np.array(lat)
t0 = time.perf_counter(); best.predict(X_test); batch_ms = (time.perf_counter() - t0) * 1000 / len(X_test)
results["latency_ms"] = {"single_mean": lat.mean(), "single_median": float(np.median(lat)),
                         "single_p95": float(np.percentile(lat, 95)), "single_max": lat.max(),
                         "batch_per_sample": batch_ms}
plt.figure(figsize=(7, 4.5))
plt.hist(lat, bins=40, color="steelblue", edgecolor="white")
plt.axvline(lat.mean(), color="red", ls="--", label=f"Mean = {lat.mean():.3f} ms")
plt.xlabel("Prediction time per reading (ms)"); plt.ylabel("Frequency")
plt.title("Single-Reading Inference Latency of RBF-SVM"); plt.legend()
plt.tight_layout(); plt.savefig(os.path.join(FIG, "fig_latency.png")); plt.close()

# Simulated real-time stream: walk through a test sequence and record predictions
sim_rows = []
for c in CLASSES:
    sub = df[df["Gas"] == c].sort_values("Serial Number").iloc[::200].head(2)
    for _, r in sub.iterrows():
        x = r[SENSORS].values.astype(float).reshape(1, -1)
        prob = best.predict_proba(x)[0]
        sim_rows.append({"sample": f"{r['Serial Number']}_{c}", "true": c, "predicted": CLASSES[int(prob.argmax())],
                         **{f"P({k})": round(float(v), 4) for k, v in zip(CLASSES, prob)}})
pd.DataFrame(sim_rows).to_csv(os.path.join(RES, "sample_predictions.csv"), index=False)
results["sample_predictions"] = sim_rows

# STEP 10: ROBUSTNESS CHECK - CHRONOLOGICAL (BLOCK) SPLIT
# Readings are a time series; random splits put neighbouring readings in train and test.
# Here the first 70% of each class (in time order) trains the model and the last 30% tests it.
tr_idx, te_idx = [], []
for c in CLASSES:
    idx = df.index[df["Gas"] == c].values
    cut = int(0.7 * len(idx)); tr_idx += list(idx[:cut]); te_idx += list(idx[cut:])
chron = Pipeline([("scaler", StandardScaler()),
                  ("svm", SVC(kernel="rbf", C=grid.best_params_["svm__C"], gamma=grid.best_params_["svm__gamma"]))])
chron.fit(X[tr_idx], y[tr_idx])
yc = chron.predict(X[te_idx])
p, r, f, _ = precision_recall_fscore_support(y[te_idx], yc, average="macro", zero_division=0)
results["chronological_split"] = {"accuracy": accuracy_score(y[te_idx], yc), "precision_macro": p,
                                  "recall_macro": r, "f1_macro": f,
                                  "confusion_matrix": confusion_matrix(y[te_idx], yc).tolist()}
print("Chronological split:", results["chronological_split"])

with open(os.path.join(RES, "results.json"), "w") as fh:
    json.dump(results, fh, indent=2, default=lambda o: o.item() if hasattr(o, "item") else str(o))
print("Done. Results in", RES)
