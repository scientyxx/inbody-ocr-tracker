// Turns raw OCR text (from the "BODYBUILDING WEIGHT TEST REPORT" layout) into a
// structured, editable draft. This is a best-effort heuristic parser, not a
// guarantee — every field lands in the review form so the user can fix misreads.

function cleanNumber(str) {
  if (str == null) return null;

  const normalized = String(str).trim().replace(",", ".");

  const n = Number(normalized);

  return Number.isFinite(n) ? n : null;
}

function numbersIn(line) {
  if (!line) return [];

  const matches = line.match(/-?\d+(?:[.,]\d+)?/g);

  return matches ? matches.map(cleanNumber) : [];
}

function findLine(lines, keywordRegex) {
  return lines.find((l) => keywordRegex.test(l)) || "";
}

function rangeFrom(line) {
  const m = line.match(/(-?\d+\.?\d*)\s*[~\-–]\s*(-?\d+\.?\d*)/);
  if (!m) return { min: null, max: null };
  return { min: cleanNumber(m[1]), max: cleanNumber(m[2]) };
}

function parseReportText(rawText) {
  const text = rawText.replace(/\r/g, "");
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const draft = {
    rawOcrText: rawText,
    header: {},
    water: { value: null, min: null, max: null },
    protein: { value: null, min: null, max: null },
    abioSalt: { value: null, min: null, max: null },
    ffm: null,
    fat: { value: null, min: null, max: null },
    weight: { value: null, min: null, max: null },
    muscle: { value: null, min: null, max: null },
    bmi: { value: null, min: null, max: null },
    pbf: { value: null, min: null, max: null },
    whr: { value: null, min: null, max: null },
    moistureRatio: { value: null, min: null, max: null },
    visceralFatIndex: { value: null, min: null, max: null },
    idealWeight: null,
    weightControl: null,
    fatControl: null,
    muscleControl: null,
    basicMetabolism: null,
    healthAssessment: null,
    physicalAge: null,
    bodyType: "",
    impedance: [],
  };

  // ---- Header ----
  const dateLine = findLine(lines, /\d{4}\/\d{2}\/\d{2}/);
  const dateMatch = dateLine.match(
    /(\d{4}\/\d{2}\/\d{2}\s*\d{1,2}:\d{2}(:\d{2})?)/,
  );
  draft.header.datetime = dateMatch ? dateMatch[1] : "";

  const ageHeightLine = findLine(lines, /\d+\s*cm/i);
  const ageHeightMatch = ageHeightLine.match(
    /(\d{1,3})[^\d]{0,10}(\d{2,3})\s*cm/i,
  );
  draft.header.age = ageHeightMatch ? cleanNumber(ageHeightMatch[1]) : null;
  draft.header.height = ageHeightMatch ? cleanNumber(ageHeightMatch[2]) : null;
  draft.header.gender = /\bF\b/i.test(ageHeightLine)
    ? "F"
    : /\bM\b/i.test(ageHeightLine)
      ? "M"
      : "";

  const snLine = findLine(lines, /S\s*\/?\s*N/i);
  const snMatch = snLine.match(/(\d{10,})/);
  draft.header.sn = snMatch ? snMatch[1] : "";

  // ---- Section 1: water / protein / abio-salt / fat / FFM / weight ----
  const waterLine = findLine(lines, /body\s*water/i);
  {
    const n = numbersIn(waterLine);
    draft.water.value = n[0] ?? null;
    const r = rangeFrom(waterLine);
    draft.water.min = r.min;
    draft.water.max = r.max;
  }

  const proteinLine = findLine(lines, /protein/i);
  {
    const n = numbersIn(proteinLine);
    draft.protein.value = n[0] ?? null;
    const r = rangeFrom(proteinLine);
    draft.protein.min = r.min;
    draft.protein.max = r.max;
  }

  const abioLine = findLine(lines, /abio/i);
  {
    const n = numbersIn(abioLine);
    draft.abioSalt.value = n[0] ?? null;
    const r = rangeFrom(abioLine);
    draft.abioSalt.min = r.min;
    draft.abioSalt.max = r.max;
  }

  const fatKgLine = lines.find(
    (l) => /fat\s*\(?kg\)?/i.test(l) && !/muscle/i.test(l),
  );
  if (fatKgLine) {
    const n = numbersIn(fatKgLine);
    draft.fat.value = n[0] ?? null;
    const r = rangeFrom(fatKgLine);
    draft.fat.min = r.min;
    draft.fat.max = r.max;
  }

  const ffmLine = findLine(lines, /FFM/i);
  {
    const n = numbersIn(ffmLine);
    draft.ffm = n[0] ?? null;
  }

  // ---- Section 2/1: Weight / Muscle bars with their own normal ranges ----
  // ---- Section 2/1: Weight / Muscle bars with their own normal ranges ----

  const weightLine = lines.find((l) => /weight\s*\(kg\)/i.test(l));

  if (weightLine) {
    const n = numbersIn(weightLine);

    draft.weight.value = n[0] ?? null;

    const r = rangeFrom(weightLine);
    draft.weight.min = r.min;
    draft.weight.max = r.max;
  }

  const muscleLine = findLine(lines, /muscle\s*\(kg\)/i);

  if (muscleLine) {
    const n = numbersIn(muscleLine);

    draft.muscle.value = n[0] ?? null;

    const r = rangeFrom(muscleLine);
    draft.muscle.min = r.min;
    draft.muscle.max = r.max;
  }
  // ---- Section 3: BMI / PBF / WHR / moisture ratio ----
  const bmiLine = findLine(lines, /BMI/i);
  {
    const n = numbersIn(bmiLine);
    draft.bmi.value = n[0] ?? null;
    const r = rangeFrom(bmiLine);
    draft.bmi.min = r.min;
    draft.bmi.max = r.max;
  }

  const pbfLine = findLine(lines, /PBF/i);
  {
    const n = numbersIn(pbfLine);
    draft.pbf.value = n[0] ?? null;
    const r = rangeFrom(pbfLine);
    draft.pbf.min = r.min;
    draft.pbf.max = r.max;
  }

  const whrLine = findLine(lines, /WHR/i);
  {
    const n = numbersIn(whrLine);
    draft.whr.value = n[0] ?? null;
    const r = rangeFrom(whrLine);
    draft.whr.min = r.min;
    draft.whr.max = r.max;
  }

  const moistureLine = findLine(lines, /moisture/i);
  {
    const n = numbersIn(moistureLine);
    draft.moistureRatio.value = n[0] ?? null;
    const r = rangeFrom(moistureLine);
    draft.moistureRatio.min = r.min;
    draft.moistureRatio.max = r.max;
  }

  // ---- Section 4: visceral fat index ----
  const visceralLine = findLine(lines, /visceral/i);
  const visceralIdx = lines.indexOf(visceralLine);
  if (visceralIdx !== -1) {
    // value is usually printed on the line right after the label
    const valueLine = lines[visceralIdx + 1] || "";
    const n = numbersIn(valueLine);
    draft.visceralFatIndex.value = n[0] ?? null;
    const r = rangeFrom(visceralLine);
    draft.visceralFatIndex.min = r.min;
    draft.visceralFatIndex.max = r.max;
  }

  // ---- Section 7: targets & metabolism ----
  const idealLine = findLine(lines, /ideal\s*weight/i);
  {
    const n = numbersIn(idealLine);
    draft.idealWeight = n[0] ?? null;
  }

  const weightCtrlLine = findLine(lines, /weight\s*control/i);
  {
    const n = numbersIn(weightCtrlLine);
    draft.weightControl = n[0] ?? null;
  }

  const fatCtrlLine = findLine(lines, /fat\s*control/i);
  {
    const n = numbersIn(fatCtrlLine);
    draft.fatControl = n[0] ?? null;
  }

  const muscleCtrlLine = findLine(lines, /muscle\s*control/i);
  {
    const n = numbersIn(muscleCtrlLine);
    draft.muscleControl = n[0] ?? null;
  }

  const metabolismLine = findLine(lines, /basic\s*metabolism/i);
  {
    const n = numbersIn(metabolismLine);
    draft.basicMetabolism = n[0] ?? null;
  }

  const healthLine = findLine(lines, /health\s*assessment/i);
  {
    const n = numbersIn(healthLine);
    draft.healthAssessment = n[0] ?? null;
  }

  const physAgeLine = findLine(lines, /physical\s*age/i);
  {
    const n = numbersIn(physAgeLine);
    draft.physicalAge = n[0] ?? null;
  }

  // ---- Impedance table (No. Z RA LA TR RL LL) — best effort ----
  lines.forEach((l) => {
    const n = numbersIn(l);
    if (/^\d\s/.test(l) && n.length >= 5 && n.length <= 6) {
      draft.impedance.push({ no: n[0], values: n.slice(1) });
    }
  });

  return draft;
}
