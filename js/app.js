(() => {
  "use strict";

  const PROXY_URL = "https://rapid-haze-6cf5.srialia110.workers.dev";

  const views = [
    "home",
    "scan",
    "review",
    "workout",
    "workout-form",
    "history",
    "chart",
    "profile",
  ];

  function getProfile() {
    try {
      return JSON.parse(localStorage.getItem("ironLogProfile") || "null");
    } catch {
      return null;
    }
  }
  function saveProfile(p) {
    localStorage.setItem("ironLogProfile", JSON.stringify(p));
  }
  function showView(name) {
    views.forEach((v) => {
      document
        .getElementById(`view-${v}`)
        .classList.toggle("active", v === name);
    });
    document.querySelectorAll(".navbtn").forEach((b) => {
      b.classList.toggle("active", b.dataset.view === name);
    });
    if (name === "home") renderHome();
    if (name === "history") renderHistory();
    if (name === "chart") {
      renderChart();
      renderExerciseChartOptions();
    }
    if (name === "workout") renderWorkoutList();
    if (name !== "scan") stopQrScanner();
  }

  document.querySelectorAll(".navbtn").forEach((btn) => {
    btn.addEventListener("click", () => showView(btn.dataset.view));
  });

  function toast(msg) {
    const t = document.getElementById("toast");
    t.textContent = msg;
    t.classList.add("show");
    setTimeout(() => t.classList.remove("show"), 2200);
  }

  const BODY_TYPES = [
    "Too thin",
    "Thin shape",
    "Normal",
    "Low Fat Muscular",
    "High fat",
    "Muscle over weight",
    "Slight obesity",
    "Obesity",
    "High obesity",
  ];

  function fmt(n, unit = "") {
    if (n == null || Number.isNaN(n)) return "—";
    return `${n}${unit ? ` <span class="unit">${unit}</span>` : ""}`;
  }

  function deltaHTML(curr, prev, lowerIsBetter = true) {
    if (curr == null || prev == null) return "";
    const d = Math.round((curr - prev) * 10) / 10;
    if (d === 0) return `<div class="delta flat">tetap vs bulan lalu</div>`;
    const goingUp = d > 0;
    const cls =
      (goingUp && lowerIsBetter) || (!goingUp && !lowerIsBetter)
        ? "up"
        : "down";
    const arrow = goingUp ? "▲" : "▼";
    return `<div class="delta ${cls}">${arrow} ${Math.abs(d)} vs bulan lalu</div>`;
  }

  async function renderHome() {
    const profile = getProfile();
    const taglineEl = document.getElementById("topbar-tagline");
    if (taglineEl) {
      taglineEl.textContent = profile?.name
        ? `Halo, ${profile.name} 👋`
        : "Pantau progress timbangan gym kamu";
    }

    const entries = await IronDB.getAll();
    const el = document.getElementById("home-content");

    if (!entries.length) {
      el.innerHTML = `
        <div class="hero-empty">
          <div class="big-icon">🏋️</div>
          <p>Belum ada data timbangan.</p>
          <p>Scan QR struk gym kamu buat mulai tracking.</p>
        </div>`;
      return;
    }

    const latest = entries[entries.length - 1];
    const prev = entries.length > 1 ? entries[entries.length - 2] : null;
    const last5 = entries.slice(-5);

    const idx = BODY_TYPES.indexOf(latest.bodyType);
    const markerPct = idx >= 0 ? ((idx + 0.5) / BODY_TYPES.length) * 100 : null;

    const totalW = latest.weight?.value || 1;
    const fatKg = latest.fat?.value || 0;
    const waterKg = latest.water?.value || 0;
    const proteinKg = latest.protein?.value || 0;
    const mineralKg = latest.abioSalt?.value || 0;

    const fatPct = (fatKg / totalW) * 100;
    const waterPct = (waterKg / totalW) * 100;
    const proteinPct = (proteinKg / totalW) * 100;
    const mineralPct = Math.max(0, 100 - fatPct - waterPct - proteinPct);

    const h250 = 250;
    const fatH = (fatPct / 100) * h250;
    const waterH = (waterPct / 100) * h250;
    const proteinH = (proteinPct / 100) * h250;
    const mineralH = (mineralPct / 100) * h250;

    const fatY = 0;
    const waterY = fatH;
    const proteinY = fatH + waterH;
    const mineralY = fatH + waterH + proteinH;

    el.innerHTML = `
      <div class="hero">
        <div class="hero-date">Terakhir timbang: ${latest.date || "-"}</div>
        <div class="hero-grid">
          <div class="stat-tile">
            <div class="label">Berat</div>
            <div class="value">${fmt(latest.weight?.value, "kg")}</div>
            ${deltaHTML(latest.weight?.value, prev?.weight?.value, true)}
          </div>
          <div class="stat-tile">
            <div class="label">Otot</div>
            <div class="value">${fmt(latest.muscle?.value, "kg")}</div>
            ${deltaHTML(latest.muscle?.value, prev?.muscle?.value, false)}
          </div>
          <div class="stat-tile">
            <div class="label">Lemak</div>
            <div class="value">${fmt(latest.fat?.value, "kg")}</div>
            ${deltaHTML(latest.fat?.value, prev?.fat?.value, true)}
          </div>
          <div class="stat-tile">
            <div class="label">Body fat %</div>
            <div class="value">${fmt(latest.pbf?.value, "%")}</div>
            ${deltaHTML(latest.pbf?.value, prev?.pbf?.value, true)}
          </div>
        </div>

        <!-- VISUALISASI PROPORSI TUBUH -->
        <div class="card" style="margin-top:14px; text-align: center;">
          <div style="margin-bottom:16px; text-align: left;">
            <h3 style="margin: 0;">Ilusi Proporsi Tubuh</h3>
            <p class="field-hint" style="margin-top:4px; margin-bottom:0;">Analisis 4 lapis (${totalW} kg).</p>
          </div>
          
          <div style="display: flex; justify-content: center; align-items: stretch; gap: 20px;">
            
            <!-- Area Siluet -->
            <div style="width: 100px; height: 260px; display: flex; align-items: center; justify-content: center;">
              <svg viewBox="0 0 100 250" style="width: 100%; height: 100%;">
                <defs>
                  <!-- CETAKAN SILUET COWO (Badan Bidang) -->
                  <clipPath id="body-cutout-cowo">
                    <circle cx="50" cy="18" r="14"/>
                    <rect x="43" y="25" width="14" height="20" rx="3"/>
                    <path d="M23,40 Q50,35 77,40 L70,125 Q50,130 30,125 Z"/>
                    <path d="M24,40 Q12,45 12,75 L10,125 Q9,135 15,135 Q20,135 21,125 L28,75 Z"/>
                    <path d="M76,40 Q88,45 88,75 L90,125 Q91,135 85,135 Q80,135 79,125 L72,75 Z"/>
                    <path d="M30,120 L25,235 Q24,245 35,245 Q43,245 44,235 L48,130 Z"/>
                    <path d="M70,120 L75,235 Q76,245 65,245 Q57,245 56,235 L52,130 Z"/>
                  </clipPath>

                  <!-- CETAKAN SILUET CEWE (Hourglass) -->
                  <clipPath id="body-cutout-cewe">
                    <circle cx="50" cy="18" r="13"/>
                    <rect x="45" y="25" width="10" height="20" rx="3"/>
                    <path d="M32,40 Q50,35 68,40 Q75,60 62,85 Q80,110 75,135 Q50,145 25,135 Q20,110 38,85 Q25,60 32,40 Z"/>
                    <path d="M33,40 Q20,45 18,70 L14,120 Q13,128 19,128 Q24,128 25,120 L30,75 Z"/>
                    <path d="M67,40 Q80,45 82,70 L86,120 Q87,128 81,128 Q76,128 75,120 L70,75 Z"/>
                    <path d="M26,130 L22,235 Q21,245 31,245 Q39,245 42,235 L47,140 Z"/>
                    <path d="M74,130 L78,235 Q79,245 69,245 Q61,245 58,235 L53,140 Z"/>
                  </clipPath>
                </defs>
                
                <!-- GROUP WARNA COWO -->
                <g id="siluet-cowo" clip-path="url(#body-cutout-cowo)">
                  <rect x="0" y="${fatY}" width="100" height="${fatH}" fill="#a64d79" />
                  <rect x="0" y="${waterY}" width="100" height="${waterH}" fill="#3da4e5" />
                  <rect x="0" y="${proteinY}" width="100" height="${proteinH}" fill="#1c4587" />
                  <rect x="0" y="${mineralY}" width="100" height="${mineralH}" fill="#0b1a30" />
                </g>

                <!-- GROUP WARNA CEWE (Ditampilkan via JS) -->
                <g id="siluet-cewe" clip-path="url(#body-cutout-cewe)" style="display: none;">
                  <rect x="0" y="${fatY}" width="100" height="${fatH}" fill="#a64d79" />
                  <rect x="0" y="${waterY}" width="100" height="${waterH}" fill="#3da4e5" />
                  <rect x="0" y="${proteinY}" width="100" height="${proteinH}" fill="#1c4587" />
                  <rect x="0" y="${mineralY}" width="100" height="${mineralH}" fill="#0b1a30" />
                </g>
              </svg>
            </div>

            <!-- Legenda Penjelasan -->
            <div style="display: flex; flex-direction: column; justify-content: space-around; text-align: left; padding: 5px 0;">
              <div>
                <div style="display: flex; align-items: center; gap: 8px; font-weight: bold; color: #a64d79;">
                  <div style="width: 12px; height: 12px; border-radius: 3px; background-color: #a64d79;"></div> Lemak
                </div>
                <div style="font-size: 11px; color: var(--text-dim); margin-top: 2px;">${fatPct.toFixed(1)}% (${fatKg} kg)</div>
              </div>
              
              <div>
                <div style="display: flex; align-items: center; gap: 8px; font-weight: bold; color: #3da4e5;">
                  <div style="width: 12px; height: 12px; border-radius: 3px; background-color: #3da4e5;"></div> Air Tubuh
                </div>
                <div style="font-size: 11px; color: var(--text-dim); margin-top: 2px;">${waterPct.toFixed(1)}% (${waterKg} kg)</div>
              </div>

              <div>
                <div style="display: flex; align-items: center; gap: 8px; font-weight: bold; color: #5c83c4;">
                  <div style="width: 12px; height: 12px; border-radius: 3px; background-color: #1c4587;"></div> Protein
                </div>
                <div style="font-size: 11px; color: var(--text-dim); margin-top: 2px;">${proteinPct.toFixed(1)}% (${proteinKg} kg)</div>
              </div>
              
              <div>
                <div style="display: flex; align-items: center; gap: 8px; font-weight: bold; color: #9C9A94;">
                  <div style="width: 12px; height: 12px; border-radius: 3px; background-color: #0b1a30; border: 1px solid #3b3a37;"></div> Mineral
                </div>
                <div style="font-size: 11px; color: var(--text-dim); margin-top: 2px;">Abio-salt ${mineralPct.toFixed(1)}% (${mineralKg} kg)</div>
              </div>
            </div>

          </div>
        </div>
        
        <!-- GRAFIK 5 TIMBANGAN TERAKHIR (DENGAN DROPDOWN) -->
        <div class="card" style="margin-top:14px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <h3 style="margin: 0;">Tren (5 Terakhir)</h3>
            <select id="home-chart-metric" style="padding: 4px 8px; font-size: 12px; border-radius: 6px; background: #2A2B2E; color: #f5f5f5; border: 1px solid #3a3b3e; outline: none;">
              <option value="weight.value">Berat</option>
              <option value="muscle.value">Otot</option>
              <option value="fat.value">Lemak</option>
              <option value="pbf.value">Body Fat %</option>
            </select>
          </div>
          <div class="chart-canvas-wrap" style="height: 160px;">
            <canvas id="home-trend-canvas"></canvas>
          </div>
        </div>

        <div class="card" style="margin-top:14px;">
          <h3>Klasifikasi tubuh</h3>
          <div class="type-strip">
            <div class="type-track">
              ${markerPct != null ? `<div class="type-marker" style="left:${markerPct}%"></div>` : ""}
            </div>
          </div>
          <div class="type-label">${latest.bodyType || "Belum diisi"}</div>
        </div>

        <div class="card">
          <h3>BMI &amp; metabolisme</h3>
          <div class="detail-row"><span class="k">BMI</span><span>${latest.bmi?.value ?? "—"}</span></div>
          <div class="detail-row"><span class="k">Metabolisme basal</span><span>${latest.basicMetabolism ?? "—"} kcal</span></div>
          <div class="detail-row"><span class="k">Usia fisik</span><span>${latest.physicalAge ?? "—"}</span></div>
          <div class="detail-row" style="border-bottom:none;"><span class="k">Berat ideal</span><span>${latest.idealWeight ?? "—"} kg</span></div>
        </div>
      </div>`;

    setTimeout(() => {
      const genderKey = profile?.gender === "cewe" ? "cewe" : "cowo";
      const siluetCowo = document.getElementById("siluet-cowo");
      const siluetCewe = document.getElementById("siluet-cewe");
      if (siluetCowo && siluetCewe) {
        siluetCowo.style.display = genderKey === "cowo" ? "block" : "none";
        siluetCewe.style.display = genderKey === "cewe" ? "block" : "none";
      }

      const metricSelect = document.getElementById("home-chart-metric");
      if (metricSelect) {
        const drawHomeChart = () => {
          const path = metricSelect.value;
          let label = "Berat (kg)";
          let color = "#ff5a36";
          if (path === "muscle.value") {
            label = "Otot (kg)";
            color = "#5db56a";
          }
          if (path === "fat.value") {
            label = "Lemak (kg)";
            color = "#a64d79";
          }
          if (path === "pbf.value") {
            label = "PBF (%)";
            color = "#d64545";
          }
          IronCharts.render("home-trend-canvas", last5, path, label, color);
        };
        metricSelect.addEventListener("change", drawHomeChart);
        drawHomeChart();
      }
    }, 50);
  }

  let qrStream = null;
  let qrRafId = null;
  const qrCanvas = document.createElement("canvas");
  const qrCtx = qrCanvas.getContext("2d", { willReadFrequently: true });

  async function startQrScanner() {
    const wrap = document.getElementById("qr-wrap");
    const video = document.getElementById("qr-video");
    const status = document.getElementById("qr-status");
    document.getElementById("qr-result").innerHTML = "";
    wrap.style.display = "block";

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      status.textContent =
        "Kamera live butuh HTTPS (atau localhost). Kamu lagi buka lewat " +
        location.protocol +
        "//" +
        location.host +
        ' — coba akses via https, atau pakai tombol "Scan QR dari foto" di bawah.';
      return;
    }

    try {
      qrStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      video.srcObject = qrStream;
      await video.play();
      status.textContent = "Arahkan kamera ke QR di struk timbangan";
      tickQr(video, status);
    } catch (err) {
      status.textContent = "Tidak bisa akses kamera: " + err.message;
    }
  }

  function tickQr(video, status) {
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      qrCanvas.width = video.videoWidth;
      qrCanvas.height = video.videoHeight;
      qrCtx.drawImage(video, 0, 0, qrCanvas.width, qrCanvas.height);
      const imgData = qrCtx.getImageData(0, 0, qrCanvas.width, qrCanvas.height);
      const code = jsQR(imgData.data, imgData.width, imgData.height);
      if (code && code.data) {
        onQrDetected(code.data, status);
        return;
      }
    }
    qrRafId = requestAnimationFrame(() => tickQr(video, status));
  }

  function onQrDetected(data, status) {
    if (status) status.textContent = "QR terbaca ✓";
    stopQrScanner();
    showQrResult(data);
  }

  function showQrResult(data) {
    const resultEl = document.getElementById("qr-result");
    const url = data.trim();
    const isUrl = /^https?:\/\//i.test(url);

    if (!isUrl) {
      resultEl.innerHTML = `
        <div class="card">
          <h3>Hasil scan</h3>
          <p style="word-break:break-all; font-size:13px;">${url}</p>
          <button class="btn btn-ghost" style="margin-top:8px;" id="btn-scan-again">Scan lagi</button>
        </div>`;
      document
        .getElementById("btn-scan-again")
        .addEventListener("click", startQrScanner);
      return;
    }

    resultEl.innerHTML = `
      <div class="card">
        <h3>QR terbaca ✓</h3>
        <p style="word-break:break-all; font-size:12px; color:var(--text-dim);">${url}</p>
        <div class="ocr-progress"><div class="spinner"></div><div>Mengambil &amp; membaca laporan otomatis…</div></div>
      </div>`;

    autoFetchAndOcr(url);
  }

  async function autoFetchAndOcr(url) {
    try {
      const fetchUrl = `${PROXY_URL}?url=${encodeURIComponent(url)}`;
      const res = await fetch(fetchUrl, { mode: "cors" });
      if (!res.ok) throw new Error("Server membalas status " + res.status);
      const blob = await res.blob();
      if (!blob.type.startsWith("image/"))
        throw new Error("File yang didapat bukan gambar (" + blob.type + ")");
      showQrManualFallback(url, null);
      await handleImageFile(blob);
    } catch (err) {
      showQrManualFallback(url, err.message);
    }
  }

  function showQrManualFallback(url, errorMsg) {
    const resultEl = document.getElementById("qr-result");
    resultEl.innerHTML = `
      <div class="card">
        <h3>${errorMsg ? "Ambil otomatis gagal" : "QR terbaca ✓"}</h3>
        <p style="word-break:break-all; font-size:12px; color:var(--text-dim);">${url}</p>
        ${errorMsg ? `<p class="field-hint">Alasan: ${errorMsg}. Biasanya karena server laporan memblokir akses otomatis, atau linknya http:// sementara app ini https:// (browser blokir demi keamanan).</p>` : ""}
        <div class="btn-row" style="margin-top:8px;">
          <button class="btn btn-secondary" id="btn-retry-auto">Coba otomatis lagi</button>
          <button class="btn btn-secondary" id="btn-open-qr-link">Buka tautan</button>
        </div>
        <p class="field-hint" style="margin-top:8px;">
          Kalau tetap gagal: buka tautannya, screenshot/simpan gambarnya, lalu upload di bagian "Foto laporan timbangan" di bawah.
        </p>
        <button class="btn btn-ghost" style="margin-top:8px;" id="btn-scan-again">Scan lagi</button>
      </div>`;
    document
      .getElementById("btn-retry-auto")
      .addEventListener("click", () => autoFetchAndOcr(url));
    document
      .getElementById("btn-open-qr-link")
      .addEventListener("click", () => window.open(url, "_blank", "noopener"));
    document
      .getElementById("btn-scan-again")
      .addEventListener("click", startQrScanner);
  }

  function stopQrScanner() {
    if (qrRafId) cancelAnimationFrame(qrRafId);
    qrRafId = null;
    if (qrStream) {
      qrStream.getTracks().forEach((t) => t.stop());
      qrStream = null;
    }
    document.getElementById("qr-wrap").style.display = "none";
  }

  document
    .getElementById("btn-start-qr")
    .addEventListener("click", startQrScanner);

  const inputQrPhoto = document.getElementById("input-qr-photo");
  document
    .getElementById("btn-qr-from-photo")
    .addEventListener("click", () => inputQrPhoto.click());
  inputQrPhoto.addEventListener("change", (e) =>
    decodeQrFromFile(e.target.files[0]),
  );

  function decodeQrFromFile(file) {
    if (!file) return;
    stopQrScanner();
    const resultEl = document.getElementById("qr-result");
    resultEl.innerHTML = `<div class="card"><h3>Membaca QR dari foto…</h3></div>`;

    let settled = false;

    function fail(msg) {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      inputQrPhoto.value = "";
      resultEl.innerHTML = `
        <div class="card">
          <h3>QR tidak terbaca dari foto ini</h3>
          <p class="field-hint">${msg}</p>
          <button class="btn btn-ghost" id="btn-qr-photo-retry">Coba foto lain</button>
        </div>`;
      document
        .getElementById("btn-qr-photo-retry")
        .addEventListener("click", () => inputQrPhoto.click());
    }

    const timeoutId = setTimeout(() => {
      fail(
        "Proses membaca foto ini kelamaan (lebih dari 10 detik) dan dihentikan. Coba foto dengan resolusi lebih kecil, atau pastikan file-nya benar-benar gambar (JPG/PNG).",
      );
    }, 10000);

    if (typeof jsQR !== "function") {
      fail(
        "Library pembaca QR gagal dimuat (cek koneksi internet, library-nya diambil dari CDN saat app dibuka pertama kali).",
      );
      return;
    }

    const img = new Image();

    img.onload = () => {
      if (settled) return;
      try {
        const MAX_DIM = 1600;
        const scale = Math.min(
          1,
          MAX_DIM / Math.max(img.naturalWidth, img.naturalHeight),
        );
        const w = Math.round(img.naturalWidth * scale) || img.naturalWidth;
        const h = Math.round(img.naturalHeight * scale) || img.naturalHeight;

        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        ctx.drawImage(img, 0, 0, w, h);

        const imgData = ctx.getImageData(0, 0, w, h);
        let code = jsQR(imgData.data, w, h);
        if (!code || !code.data) {
          code = jsQR(imgData.data, w, h, { inversionAttempts: "attemptBoth" });
        }
        if (!code || !code.data) {
          const blurCanvas = document.createElement("canvas");
          blurCanvas.width = w;
          blurCanvas.height = h;
          const blurCtx = blurCanvas.getContext("2d", {
            willReadFrequently: true,
          });
          blurCtx.filter = "blur(1.5px)";
          blurCtx.drawImage(img, 0, 0, w, h);
          const blurData = blurCtx.getImageData(0, 0, w, h);
          code = jsQR(blurData.data, w, h);
          if (!code || !code.data) {
            code = jsQR(blurData.data, w, h, {
              inversionAttempts: "attemptBoth",
            });
          }
        }

        settled = true;
        clearTimeout(timeoutId);
        URL.revokeObjectURL(img.src);
        inputQrPhoto.value = "";

        if (code && code.data) {
          showQrResult(code.data);
        } else {
          resultEl.innerHTML = `
            <div class="card">
              <h3>QR tidak terbaca dari foto ini</h3>
              <p class="field-hint">Coba foto ulang: dekatkan sedikit ke QR-nya, hindari pantulan cahaya di layar, dan pastikan fotonya tidak buram.</p>
              <button class="btn btn-ghost" id="btn-qr-photo-retry">Coba foto lain</button>
            </div>`;
          document
            .getElementById("btn-qr-photo-retry")
            .addEventListener("click", () => inputQrPhoto.click());
        }
      } catch (err) {
        URL.revokeObjectURL(img.src);
        fail("Gagal memproses foto: " + err.message);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      fail("Gagal membuka file gambar ini. Coba format foto lain (JPG/PNG).");
    };

    img.src = URL.createObjectURL(file);
  }

  const inputCamera = document.getElementById("input-camera");
  const inputUpload = document.getElementById("input-upload");
  document
    .getElementById("btn-camera-capture")
    .addEventListener("click", () => inputCamera.click());
  document
    .getElementById("btn-upload")
    .addEventListener("click", () => inputUpload.click());
  inputCamera.addEventListener("change", (e) =>
    handleImageFile(e.target.files[0]),
  );
  inputUpload.addEventListener("change", (e) =>
    handleImageFile(e.target.files[0]),
  );

  let pendingDraft = null;

  function loadImageEl(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }

  function cropToCanvas(img, sx, sy, sw, sh, targetW) {
    const scale = Math.min(3, Math.max(1.5, targetW / sw));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(sw * scale);
    canvas.height = Math.round(sh * scale);
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const d = imgData.data;

    for (let i = 0; i < d.length; i += 4) {
      const r = d[i],
        g = d[i + 1],
        b = d[i + 2];
      if (b > r + 40 && b > g + 20) {
        d[i] = d[i + 1] = d[i + 2] = 255;
      }
    }

    const contrast = 1.6;
    const intercept = 128 * (1 - contrast);
    for (let i = 0; i < d.length; i += 4) {
      const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      let v = gray * contrast + intercept;
      v = Math.max(0, Math.min(255, v));
      d[i] = d[i + 1] = d[i + 2] = v;
    }
    ctx.putImageData(imgData, 0, 0);
    return canvas;
  }

  async function handleImageFile(file) {
    if (!file) return;
    const progressCard = document.getElementById("ocr-progress-card");
    const progressText = document.getElementById("ocr-progress-text");
    const thumb = document.getElementById("ocr-thumb");

    const dataUrl = await fileToDataUrl(file);
    thumb.src = dataUrl;
    thumb.style.display = "block";
    progressCard.style.display = "block";
    progressText.textContent = "Menyiapkan OCR…";

    try {
      const img = await loadImageEl(file);
      const w = img.naturalWidth;
      const h = img.naturalHeight;

      const headerCanvas = cropToCanvas(img, 0, 0, w, h * 0.14, 2400);
      const leftCanvas = cropToCanvas(img, 0, h * 0.14, w / 2, h * 0.86, 2000);
      const rightCanvas = cropToCanvas(
        img,
        w / 2,
        h * 0.14,
        w / 2,
        h * 0.86,
        2000,
      );

      progressText.textContent = "Membaca data diri…";
      const headerResult = await Tesseract.recognize(headerCanvas, "eng", {
        logger: (m) => {
          if (m.status && typeof m.progress === "number") {
            progressText.textContent = `Data diri: ${labelForStatus(m.status)} ${Math.round(m.progress * 100)}%`;
          }
        },
      });

      progressText.textContent = "Membaca kolom kiri…";
      const leftResult = await Tesseract.recognize(leftCanvas, "eng", {
        logger: (m) => {
          if (m.status && typeof m.progress === "number") {
            progressText.textContent = `Kolom kiri: ${labelForStatus(m.status)} ${Math.round(m.progress * 100)}%`;
          }
        },
      });

      progressText.textContent = "Membaca kolom kanan…";
      const rightResult = await Tesseract.recognize(rightCanvas, "eng", {
        logger: (m) => {
          if (m.status && typeof m.progress === "number") {
            progressText.textContent = `Kolom kanan: ${labelForStatus(m.status)} ${Math.round(m.progress * 100)}%`;
          }
        },
      });

      const combinedText =
        headerResult.data.text +
        "\n\n" +
        leftResult.data.text +
        "\n\n" +
        rightResult.data.text;
      const draft = parseReportText(combinedText);
      pendingDraft = draft;
      openReviewForm(draft);
    } catch (err) {
      toast("OCR gagal: " + err.message);
    } finally {
      progressCard.style.display = "none";
      thumb.style.display = "none";
      inputCamera.value = "";
      inputUpload.value = "";
    }
  }

  function labelForStatus(status) {
    const map = {
      "loading tesseract core": "Memuat mesin OCR",
      "initializing tesseract": "Menyiapkan OCR",
      "loading language traineddata": "Memuat data bahasa",
      "initializing api": "Menyiapkan",
      "recognizing text": "Membaca teks",
    };
    return map[status] || "Memproses";
  }

  function fileToDataUrl(file) {
    return new Promise((resolve) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.readAsDataURL(file);
    });
  }

  function setVal(id, val) {
    const el = document.getElementById(id);
    if (el) el.value = val == null ? "" : val;
  }
  function getVal(id) {
    const el = document.getElementById(id);
    if (!el) return null;
    if (el.value === "") return null;
    return el.type === "number" ? parseFloat(el.value) : el.value;
  }

  function openReviewForm(draft) {
    document.getElementById("raw-ocr-text").textContent =
      draft.rawOcrText || "";
    const today = new Date().toISOString().slice(0, 10);
    let dateVal = today;
    if (draft.header.datetime) {
      const m = draft.header.datetime.match(/(\d{4})\/(\d{2})\/(\d{2})/);
      if (m) dateVal = `${m[1]}-${m[2]}-${m[3]}`;
    }
    setVal("f-date", dateVal);
    const profile = getProfile();
    setVal("f-age", draft.header.age ?? profile?.age ?? null);
    setVal("f-height", draft.header.height ?? profile?.height ?? null);
    setVal("f-sn", draft.header.sn);

    setVal("f-weight", draft.weight.value);
    setVal("f-muscle", draft.muscle.value);
    setVal("f-fat", draft.fat.value);
    setVal("f-ffm", draft.ffm);
    setVal("f-bmi", draft.bmi.value);
    setVal("f-pbf", draft.pbf.value);

    setVal("f-water", draft.water.value);
    setVal("f-protein", draft.protein.value);
    setVal("f-abio", draft.abioSalt.value);
    setVal("f-moisture", draft.moistureRatio.value);
    setVal("f-whr", draft.whr.value);
    setVal("f-visceral", draft.visceralFatIndex.value);

    setVal("f-idealweight", draft.idealWeight);
    setVal("f-weightctrl", draft.weightControl);
    setVal("f-fatctrl", draft.fatControl);
    setVal("f-musclectrl", draft.muscleControl);
    setVal("f-metabolism", draft.basicMetabolism);
    setVal("f-physage", draft.physicalAge);
    setVal("f-health", draft.healthAssessment);

    setVal("f-bodytype", draft.bodyType || "");
    setVal("f-assess-protein", draft.assessments?.protein);
    setVal("f-assess-fat", draft.assessments?.fat);
    setVal("f-assess-muscle", draft.assessments?.muscle);
    setVal("f-assess-pbf", draft.assessments?.pbf);
    setVal("f-circ-belly", null);
    setVal("f-circ-hip", null);
    setVal("f-circ-armL", null);
    setVal("f-circ-armR", null);
    setVal("f-circ-thighL", null);
    setVal("f-circ-thighR", null);

    showView("review");
  }

  document
    .getElementById("btn-review-cancel")
    .addEventListener("click", () => showView("scan"));

  document
    .getElementById("btn-review-save")
    .addEventListener("click", async () => {
      const date = getVal("f-date");
      if (!date) {
        toast("Tanggal wajib diisi");
        return;
      }

      const entry = {
        id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
        date,
        header: {
          age: getVal("f-age"),
          height: getVal("f-height"),
          sn: getVal("f-sn"),
        },
        weight: { value: getVal("f-weight") },
        muscle: { value: getVal("f-muscle") },
        fat: { value: getVal("f-fat") },
        ffm: getVal("f-ffm"),
        bmi: { value: getVal("f-bmi") },
        pbf: { value: getVal("f-pbf") },
        water: { value: getVal("f-water") },
        protein: { value: getVal("f-protein") },
        abioSalt: { value: getVal("f-abio") },
        moistureRatio: { value: getVal("f-moisture") },
        whr: { value: getVal("f-whr") },
        visceralFatIndex: { value: getVal("f-visceral") },
        idealWeight: getVal("f-idealweight"),
        weightControl: getVal("f-weightctrl"),
        fatControl: getVal("f-fatctrl"),
        muscleControl: getVal("f-musclectrl"),
        basicMetabolism: getVal("f-metabolism"),
        physicalAge: getVal("f-physage"),
        healthAssessment: getVal("f-health"),
        bodyType: getVal("f-bodytype") || "",
        partMuscleFat: {
          armL: { muscle: getVal("f-armL-m"), fat: getVal("f-armL-f") },
          armR: { muscle: getVal("f-armR-m"), fat: getVal("f-armR-f") },
          legL: { muscle: getVal("f-legL-m"), fat: getVal("f-legL-f") },
          legR: { muscle: getVal("f-legR-m"), fat: getVal("f-legR-f") },
        },
        circumferences: {
          belly: getVal("f-circ-belly"),
          hip: getVal("f-circ-hip"),
          armL: getVal("f-circ-armL"),
          armR: getVal("f-circ-armR"),
          thighL: getVal("f-circ-thighL"),
          thighR: getVal("f-circ-thighR"),
        },
        rawOcrText: pendingDraft ? pendingDraft.rawOcrText : "",
        createdAt: new Date().toISOString(),
      };

      await IronDB.saveEntry(entry);
      toast("Tersimpan ✓");
      pendingDraft = null;
      showView("history");
    });

  async function renderHistory() {
    const entries = (await IronDB.getAll()).slice().reverse();
    const el = document.getElementById("history-list");
    if (!entries.length) {
      el.innerHTML = `<div class="empty-state">Belum ada riwayat. Scan hasil timbangan pertama kamu di tab Scan.</div>`;
      return;
    }
    el.innerHTML = entries
      .map(
        (e) => `
      <div class="history-item" data-id="${e.id}">
        <div class="row-top">
          <div class="date">${e.date}</div>
          <div class="sn">${e.header?.sn || ""}</div>
        </div>
        <div class="history-mini-grid">
          <div><div class="v">${e.weight?.value ?? "—"}</div><div class="l">Berat</div></div>
          <div><div class="v">${e.muscle?.value ?? "—"}</div><div class="l">Otot</div></div>
          <div><div class="v">${e.fat?.value ?? "—"}</div><div class="l">Lemak</div></div>
          <div><div class="v">${e.pbf?.value ?? "—"}</div><div class="l">PBF%</div></div>
        </div>
      </div>`,
      )
      .join("");

    el.querySelectorAll(".history-item").forEach((card) => {
      card.addEventListener("click", () =>
        openDetail(card.dataset.id, entries),
      );
    });
  }

  function detailRow(label, val) {
    return `<div class="detail-row"><span class="k">${label}</span><span>${val ?? "—"}</span></div>`;
  }

  function openDetail(id, entries) {
    const e = entries.find((x) => x.id === id);
    if (!e) return;
    const root = document.getElementById("detail-modal-root");
    root.innerHTML = `
      <div class="modal-backdrop" id="modal-backdrop">
        <div class="modal-sheet">
          <h2>${e.date}</h2>
          <div class="section-tag">Komposisi utama</div>
          ${detailRow("Berat (kg)", e.weight?.value)}
          ${detailRow("Otot (kg)", e.muscle?.value)}
          ${detailRow("Lemak (kg)", e.fat?.value)}
          ${detailRow("FFM (kg)", e.ffm)}
          ${detailRow("BMI", e.bmi?.value)}
          ${detailRow("PBF (%)", e.pbf?.value)}
          <div class="section-tag">Cairan &amp; lainnya</div>
          ${detailRow("Air tubuh (kg)", e.water?.value)}
          ${detailRow("Protein (kg)", e.protein?.value)}
          ${detailRow("Abio-salt (kg)", e.abioSalt?.value)}
          ${detailRow("Moisture ratio (%)", e.moistureRatio?.value)}
          ${detailRow("WHR", e.whr?.value)}
          ${detailRow("Visceral fat index", e.visceralFatIndex?.value)}
          <div class="section-tag">Target &amp; metabolisme</div>
          ${detailRow("Berat ideal (kg)", e.idealWeight)}
          ${detailRow("Weight control (kg)", e.weightControl)}
          ${detailRow("Fat control (kg)", e.fatControl)}
          ${detailRow("Muscle control (kg)", e.muscleControl)}
          ${detailRow("Metabolisme basal (kcal)", e.basicMetabolism)}
          ${detailRow("Usia fisik", e.physicalAge)}
          ${detailRow("Skor kesehatan", e.healthAssessment)}
          ${detailRow("Kategori tubuh", e.bodyType)}
          <div class="section-tag">Bagian tubuh</div>
          ${detailRow("Otot / lemak lengan kiri", `${e.partMuscleFat?.armL?.muscle ?? "—"} / ${e.partMuscleFat?.armL?.fat ?? "—"}`)}
          ${detailRow("Otot / lemak lengan kanan", `${e.partMuscleFat?.armR?.muscle ?? "—"} / ${e.partMuscleFat?.armR?.fat ?? "—"}`)}
          ${detailRow("Otot / lemak kaki kiri", `${e.partMuscleFat?.legL?.muscle ?? "—"} / ${e.partMuscleFat?.legL?.fat ?? "—"}`)}
          ${detailRow("Otot / lemak kaki kanan", `${e.partMuscleFat?.legR?.muscle ?? "—"} / ${e.partMuscleFat?.legR?.fat ?? "—"}`)}
          <div class="section-tag">Lingkar Tubuh (cm)</div>
          ${detailRow("Perut", e.circumferences?.belly)}
          ${detailRow("Pantat / Pinggul", e.circumferences?.hip)}
          ${detailRow("Lengan (Kiri / Kanan)", `${e.circumferences?.armL ?? "—"} / ${e.circumferences?.armR ?? "—"}`)}
          ${detailRow("Paha (Kiri / Kanan)", `${e.circumferences?.thighL ?? "—"} / ${e.circumferences?.thighR ?? "—"}`)}

          <div class="btn-row" style="margin-top:16px;">
            <button class="btn btn-danger" id="btn-delete-entry">Hapus</button>
            <button class="btn btn-secondary" id="btn-close-detail">Tutup</button>
          </div>
        </div>
      </div>`;
    document
      .getElementById("btn-close-detail")
      .addEventListener("click", () => (root.innerHTML = ""));
    document
      .getElementById("modal-backdrop")
      .addEventListener("click", (ev) => {
        if (ev.target.id === "modal-backdrop") root.innerHTML = "";
      });
    document
      .getElementById("btn-delete-entry")
      .addEventListener("click", async () => {
        if (!confirm("Hapus data timbangan tanggal " + e.date + "?")) return;
        await IronDB.deleteEntry(e.id);
        root.innerHTML = "";
        renderHistory();
        toast("Dihapus");
      });
  }

  const CHART_COLORS = {
    "weight.value": "#ff5a36",
    "muscle.value": "#5db56a",
    "fat.value": "#d9a34a",
    "bmi.value": "#4fa8c9",
    "pbf.value": "#d64545",
    "water.value": "#4fa8c9",
    "protein.value": "#d9a34a",
    "whr.value": "#e8c43a",
    "moistureRatio.value": "#4fa8c9",
    "visceralFatIndex.value": "#d64545",
    basicMetabolism: "#ff5a36",
    physicalAge: "#9c968c",
  };

  async function renderChart() {
    const entries = await IronDB.getAll();
    const select = document.getElementById("chart-metric");
    const hint = document.getElementById("chart-empty-hint");
    if (entries.length < 2) {
      hint.textContent = "Butuh minimal 2 data timbangan buat lihat tren.";
    } else {
      hint.textContent = "";
    }
    const draw = () => {
      const path = select.value;
      IronCharts.render(
        "trend-canvas",
        entries,
        path,
        select.options[select.selectedIndex].text,
        CHART_COLORS[path] || "#ff5a36",
      );
    };
    select.onchange = draw;
    if (entries.length) draw();
  }

  document.getElementById("btn-export").addEventListener("click", async () => {
    const json = await IronDB.exportJSON();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `iron-log-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").catch(() => {});
    });
  }

  window.addEventListener("error", (e) => {
    toast("Error: " + e.message);
    console.error(e);
  });
  window.addEventListener("unhandledrejection", (e) => {
    toast("Error: " + (e.reason?.message || e.reason));
    console.error(e.reason);
  });

  document.getElementById("btn-edit-profile").addEventListener("click", () => {
    const p = getProfile() || {};
    setVal("p-name", p.name);
    setVal("p-age", p.age);
    setVal("p-height", p.height);
    setVal("p-weight", p.weight);
    const genderEl = document.getElementById("p-gender");
    if (genderEl) genderEl.value = p.gender || "cowo";
    showView("profile");
  });

  document.getElementById("btn-profile-save").addEventListener("click", () => {
    const name = getVal("p-name");
    const age = getVal("p-age");
    const height = getVal("p-height");
    const weight = getVal("p-weight");
    const gender = document.getElementById("p-gender").value;
    if (!name || !age || !height || !weight) {
      toast("Lengkapi semua data profil dulu ya");
      return;
    }
    saveProfile({ name, age, height, weight, gender });
    toast("Profil tersimpan ✓");
    showView("home");
  });

  // ---------------- Workout / Latihan tracking ----------------
  let editingWorkoutId = null;
  let workoutRowCount = 0;

  const EXERCISE_PRESETS = {
    Chest: [
      "Bench Press",
      "Incline Bench Press",
      "Dumbbell Fly",
      "Cable Crossover",
      "Push Up",
      "Chest Press Machine",
    ],
    Back: [
      "Lat Pulldown",
      "Deadlift",
      "Barbell Row",
      "Seated Cable Row",
      "Pull Up",
      "T-Bar Row",
    ],
    "Lower Back": ["Hyperextension", "Good Morning", "Deadlift", "Superman"],
    Shoulders: [
      "Overhead Press",
      "Lateral Raise",
      "Front Raise",
      "Face Pull",
      "Shrug",
    ],
    Biceps: [
      "Barbell Curl",
      "Dumbbell Curl",
      "Hammer Curl",
      "Preacher Curl",
      "Cable Curl",
    ],
    Triceps: [
      "Tricep Pushdown",
      "Skull Crusher",
      "Overhead Tricep Extension",
      "Close Grip Bench Press",
      "Dips",
    ],
    Legs: [
      "Squat",
      "Leg Press",
      "Leg Extension",
      "Leg Curl",
      "Lunges",
      "Calf Raise",
    ],
    Abs: [
      "Sit Up",
      "Plank",
      "Hanging Leg Raise",
      "Cable Crunch",
      "Russian Twist",
    ],
    Cardio: [
      "Treadmill",
      "Cycling",
      "Elliptical",
      "Rowing Machine",
      "Stairmaster",
    ],
  };

  async function refreshExerciseSuggestions() {
    const activeGroups = Array.from(
      document.querySelectorAll("#w-musclegroups .chip.active"),
    ).map((c) => c.dataset.group);
    const names = new Set();
    activeGroups.forEach((g) =>
      (EXERCISE_PRESETS[g] || []).forEach((n) => names.add(n)),
    );

    const sessions = await IronDB.getAllWorkouts();
    sessions.forEach((s) =>
      s.exercises.forEach((e) => {
        if (e.name) names.add(e.name);
      }),
    );

    const datalist = document.getElementById("exercise-suggestions");
    if (datalist) {
      datalist.innerHTML = [...names]
        .sort()
        .map((n) => `<option value="${n.replace(/"/g, "&quot;")}">`)
        .join("");
    }
  }

  function addExerciseBlock(prefill) {
    const list = document.getElementById("w-exercise-list");
    const block = document.createElement("div");
    block.className = "exercise-block";
    const type = prefill?.type || "strength";
    block.innerHTML = `
      <div class="exercise-block-header">
        <input type="text" class="ex-name" list="exercise-suggestions" placeholder="Nama latihan (misal: Lat Pulldown)" value="${prefill?.name ? prefill.name.replace(/"/g, "&quot;") : ""}">
        <select class="ex-type">
          <option value="strength" ${type === "strength" ? "selected" : ""}>Beban</option>
          <option value="cardio" ${type === "cardio" ? "selected" : ""}>Kardio</option>
        </select>
        <button type="button" class="btn-remove-exercise" title="Hapus latihan">×</button>
      </div>
      <div class="ex-strength-fields" style="${type === "cardio" ? "display:none;" : ""}">
        <div class="set-list"></div>
        <button type="button" class="btn-add-set">+ Tambah Set</button>
      </div>
      <div class="ex-cardio-fields" style="${type === "strength" ? "display:none;" : ""}">
        <div class="field-row">
          <div class="field"><label>Durasi (menit)</label><input type="number" class="cardio-duration" value="${prefill?.cardio?.duration ?? ""}"></div>
          <div class="field"><label>Incline (%)</label><input type="number" step="0.5" class="cardio-incline" value="${prefill?.cardio?.incline ?? ""}"></div>
        </div>
        <div class="field-row">
          <div class="field"><label>Kecepatan (km/j)</label><input type="number" step="0.1" class="cardio-speed" value="${prefill?.cardio?.speed ?? ""}"></div>
          <div class="field"><label>Jarak (km, opsional)</label><input type="number" step="0.1" class="cardio-distance" value="${prefill?.cardio?.distance ?? ""}"></div>
        </div>
      </div>
    `;

    const typeSelect = block.querySelector(".ex-type");
    const strengthFields = block.querySelector(".ex-strength-fields");
    const cardioFields = block.querySelector(".ex-cardio-fields");
    typeSelect.addEventListener("change", () => {
      strengthFields.style.display =
        typeSelect.value === "strength" ? "" : "none";
      cardioFields.style.display = typeSelect.value === "cardio" ? "" : "none";
    });

    block
      .querySelector(".btn-remove-exercise")
      .addEventListener("click", () => block.remove());

    const setList = block.querySelector(".set-list");
    function renumberSets() {
      setList.querySelectorAll(".set-row").forEach((row, i) => {
        row.querySelector(".set-label").textContent = `Set ${i + 1}`;
      });
    }
    function addSetRow(setPrefill) {
      const row = document.createElement("div");
      row.className = "set-row";
      row.innerHTML = `
        <span class="set-label">Set</span>
        <input type="number" step="0.5" class="set-weight" placeholder="kg" value="${setPrefill?.weight ?? ""}">
        <input type="number" class="set-reps" placeholder="reps" value="${setPrefill?.reps ?? ""}">
        <button type="button" class="btn-remove-set" title="Hapus set">×</button>
      `;
      row.querySelector(".btn-remove-set").addEventListener("click", () => {
        row.remove();
        renumberSets();
      });
      setList.appendChild(row);
      renumberSets();
    }

    block.querySelector(".btn-add-set").addEventListener("click", () => {
      const rows = setList.querySelectorAll(".set-row");
      const last = rows[rows.length - 1];
      const prev = last
        ? {
            weight: last.querySelector(".set-weight").value,
            reps: last.querySelector(".set-reps").value,
          }
        : null;
      addSetRow(prev);
    });

    if (prefill?.sets?.length) {
      prefill.sets.forEach((s) => addSetRow(s));
    } else if (type === "strength") {
      addSetRow();
    }

    list.appendChild(block);
  }

  document
    .getElementById("btn-add-exercise-row")
    .addEventListener("click", () => addExerciseBlock());

  document
    .getElementById("btn-add-exercise-row")
    .addEventListener("click", () => addExerciseBlock());

  document
    .getElementById("btn-add-exercise-row")
    .addEventListener("click", () => addExerciseRow());

  document.querySelectorAll("#w-musclegroups .chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      chip.classList.toggle("active");
      refreshExerciseSuggestions();
    });
  });

  document.getElementById("btn-new-workout").addEventListener("click", () => {
    editingWorkoutId = null;
    document.getElementById("workout-form-title").textContent =
      "Sesi Latihan Baru";
    setVal("w-date", new Date().toISOString().slice(0, 10));
    setVal("w-notes", "");
    document
      .querySelectorAll("#w-musclegroups .chip")
      .forEach((c) => c.classList.remove("active"));
    document.getElementById("w-exercise-list").innerHTML = "";
    addExerciseBlock();
    showView("workout-form");
  });

  document
    .getElementById("btn-workout-cancel")
    .addEventListener("click", () => showView("workout"));

  document;
  document
    .getElementById("btn-workout-save")
    .addEventListener("click", async () => {
      const date = getVal("w-date");
      if (!date) {
        toast("Tanggal wajib diisi");
        return;
      }

      const muscleGroups = Array.from(
        document.querySelectorAll("#w-musclegroups .chip.active"),
      ).map((c) => c.dataset.group);

      const exercises = Array.from(
        document.querySelectorAll("#w-exercise-list .exercise-block"),
      )
        .map((block) => {
          const name = block.querySelector(".ex-name").value.trim();
          const type = block.querySelector(".ex-type").value;
          if (type === "cardio") {
            return {
              name,
              type,
              cardio: {
                duration:
                  parseFloat(block.querySelector(".cardio-duration").value) ||
                  null,
                incline:
                  parseFloat(block.querySelector(".cardio-incline").value) ||
                  null,
                speed:
                  parseFloat(block.querySelector(".cardio-speed").value) ||
                  null,
                distance:
                  parseFloat(block.querySelector(".cardio-distance").value) ||
                  null,
              },
            };
          }
          const sets = Array.from(block.querySelectorAll(".set-row"))
            .map((row) => ({
              weight:
                parseFloat(row.querySelector(".set-weight").value) || null,
              reps: parseInt(row.querySelector(".set-reps").value) || null,
            }))
            .filter((s) => s.weight != null || s.reps != null);
          return { name, type, sets };
        })
        .filter((e) => e.name && (e.type === "cardio" || e.sets.length));

      if (!exercises.length) {
        toast("Tambahkan minimal 1 latihan");
        return;
      }

      const session = {
        id:
          editingWorkoutId ||
          (crypto.randomUUID ? crypto.randomUUID() : String(Date.now())),
        date,
        muscleGroups,
        exercises,
        notes: getVal("w-notes") || "",
        createdAt: new Date().toISOString(),
      };

      await IronDB.saveWorkout(session);
      toast("Sesi latihan tersimpan ✓");
      editingWorkoutId = null;
      showView("workout");
    });

  async function renderWorkoutList() {
    const sessions = (await IronDB.getAllWorkouts()).slice().reverse();
    const el = document.getElementById("workout-list");
    if (!sessions.length) {
      el.innerHTML = `<div class="empty-state">Belum ada sesi latihan. Tap "+ Sesi Baru" buat mulai catat.</div>`;
      return;
    }
    el.innerHTML = sessions
      .map(
        (s) => `
      <div class="history-item" data-id="${s.id}">
        <div class="row-top">
          <div class="date">${s.date}</div>
          <div class="sn">${s.muscleGroups.join(", ")}</div>
        </div>
                <div class="field-hint" style="margin-top:2px;">
          ${s.exercises
            .map((e) => {
              if (e.type === "cardio") {
                const c = e.cardio || {};
                return `${e.name} (${c.duration ?? "?"} menit${c.incline ? `, incline ${c.incline}%` : ""})`;
              }
              const summary = (e.sets || [])
                .map((st) => `${st.weight ?? "?"}kg×${st.reps ?? "?"}`)
                .join(", ");
              return `${e.name}: ${summary}`;
            })
            .join(" · ")}
        </div>
      </div>`,
      )
      .join("");

    el.querySelectorAll(".history-item").forEach((card) => {
      card.addEventListener("click", () =>
        openWorkoutDetail(card.dataset.id, sessions),
      );
    });
  }

  function openWorkoutDetail(id, sessions) {
    const s = sessions.find((x) => x.id === id);
    if (!s) return;
    const root = document.getElementById("detail-modal-root");
    root.innerHTML = `
      <div class="modal-backdrop" id="modal-backdrop">
        <div class="modal-sheet">
          <h2>${s.date}</h2>
          <div class="section-tag">Bagian tubuh</div>
          <p>${s.muscleGroups.join(", ") || "—"}</p>
          <div class="section-tag">Latihan</div>
          ${s.exercises
            .map((e) => {
              if (e.type === "cardio") {
                const c = e.cardio || {};
                const parts = [];
                if (c.duration != null) parts.push(`${c.duration} menit`);
                if (c.incline != null) parts.push(`incline ${c.incline}%`);
                if (c.speed != null) parts.push(`${c.speed} km/j`);
                if (c.distance != null) parts.push(`${c.distance} km`);
                return detailRow(e.name, parts.join(" · ") || "—");
              }
              const summary = (e.sets || [])
                .map(
                  (st, i) =>
                    `Set${i + 1}: ${st.weight ?? "?"}kg×${st.reps ?? "?"}`,
                )
                .join(" · ");
              return detailRow(e.name, summary || "—");
            })
            .join("")}
          ${s.notes ? `<div class="section-tag">Catatan</div><p>${s.notes}</p>` : ""}
          <div class="btn-row" style="margin-top:16px;">
            <button class="btn btn-secondary" id="btn-edit-workout">Edit</button>
            <button class="btn btn-danger" id="btn-delete-workout">Hapus</button>
            <button class="btn btn-secondary" id="btn-close-detail">Tutup</button>
          </div>
        </div>
      </div>`;
    document
      .getElementById("btn-close-detail")
      .addEventListener("click", () => (root.innerHTML = ""));
    document
      .getElementById("modal-backdrop")
      .addEventListener("click", (ev) => {
        if (ev.target.id === "modal-backdrop") root.innerHTML = "";
      });
    document
      .getElementById("btn-delete-workout")
      .addEventListener("click", async () => {
        if (!confirm("Hapus sesi latihan tanggal " + s.date + "?")) return;
        await IronDB.deleteWorkout(s.id);
        root.innerHTML = "";
        renderWorkoutList();
        toast("Dihapus");
      });
    document
      .getElementById("btn-edit-workout")
      .addEventListener("click", () => {
        root.innerHTML = "";
        editingWorkoutId = s.id;
        document.getElementById("workout-form-title").textContent =
          "Edit Sesi Latihan";
        setVal("w-date", s.date);
        setVal("w-notes", s.notes || "");
        document
          .querySelectorAll("#w-musclegroups .chip")
          .forEach((c) => c.classList.remove("active"));
      document.getElementById("w-exercise-list").innerHTML = "";
      s.exercises.forEach((e) => addExerciseBlock(e));
      refreshExerciseSuggestions();
      showView("workout-form");
    });
  }

  async function renderExerciseChartOptions() {
    const sessions = await IronDB.getAllWorkouts();
    const select = document.getElementById("exercise-progress-select");
    const hint = document.getElementById("exercise-chart-hint");
    if (!select) return;

    const names = new Set();
    sessions.forEach((s) =>
      s.exercises.forEach((e) => {
        if (e.name && e.type !== "cardio") names.add(e.name);
      }),
    );

    const current = select.value;
    select.innerHTML = "";
    if (!names.size) {
      select.innerHTML = `<option value="">— belum ada data —</option>`;
      hint.textContent = "Catat latihan dulu di tab Latihan.";
      return;
    }
    [...names].sort().forEach((n) => {
      const opt = document.createElement("option");
      opt.value = n;
      opt.textContent = n;
      select.appendChild(opt);
    });
    if ([...names].includes(current)) select.value = current;

    const draw = () => {
      const name = select.value;
      const points = sessions
        .filter((s) =>
          s.exercises.some((e) => e.name === name && e.type !== "cardio"),
        )
        .map((s) => {
          const relevant = s.exercises.filter(
            (e) => e.name === name && e.type !== "cardio",
          );
          const weights = relevant
            .flatMap((e) => (e.sets || []).map((st) => st.weight))
            .filter((w) => w != null);
          return { x: s.date, y: weights.length ? Math.max(...weights) : null };
        })
        .filter((p) => p.y != null);
      hint.textContent =
        points.length < 2 ? "Butuh minimal 2 sesi buat lihat tren." : "";
      IronCharts.renderExercise(
        "exercise-trend-canvas",
        points,
        name,
        "#ff5a36",
      );
    };
    select.onchange = draw;
    draw();
  }

  showView(getProfile() ? "home" : "profile");
})();
