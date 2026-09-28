const IronCharts = (() => {
  const instances = {};

  function seriesFor(entries, path) {
    return entries
      .map((e) => {
        const val = path
          .split(".")
          .reduce((acc, k) => (acc == null ? null : acc[k]), e);
        return { x: e.date, y: val };
      })
      .filter((p) => p.y != null && !Number.isNaN(p.y));
  }

  function render(canvasId, entries, path, label, color) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    const data = seriesFor(entries, path);
    if (instances[canvasId]) instances[canvasId].destroy();

    instances[canvasId] = new Chart(ctx, {
      type: "line",
      data: {
        labels: data.map((p) => p.x),
        datasets: [
          {
            label,
            data: data.map((p) => p.y),
            borderColor: color,
            backgroundColor: color + "33",
            fill: true,
            tension: 0.35,
            pointRadius: 4,
            pointBackgroundColor: color,
            pointBorderColor: "#17181A",
            pointBorderWidth: 1.5,
            borderWidth: 2.5,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: {
            ticks: { color: "#9C9A94", maxRotation: 0, autoSkip: true },
            grid: { color: "#2A2B2E" },
          },
          y: { ticks: { color: "#9C9A94" }, grid: { color: "#2A2B2E" } },
        },
      },
    });
  }

  function renderExercise(canvasId, points, label, color) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    if (instances[canvasId]) instances[canvasId].destroy();

    instances[canvasId] = new Chart(ctx, {
      type: "line",
      data: {
        labels: points.map((p) => p.x),
        datasets: [
          {
            label,
            data: points.map((p) => p.y),
            borderColor: color,
            backgroundColor: color + "33",
            fill: true,
            tension: 0.35,
            pointRadius: 4,
            pointBackgroundColor: color,
            pointBorderColor: "#17181A",
            pointBorderWidth: 1.5,
            borderWidth: 2.5,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: {
            ticks: { color: "#9C9A94", maxRotation: 0, autoSkip: true },
            grid: { color: "#2A2B2E" },
          },
          y: { ticks: { color: "#9C9A94" }, grid: { color: "#2A2B2E" } },
        },
      },
    });
  }

  return { render, renderExercise };
})();
