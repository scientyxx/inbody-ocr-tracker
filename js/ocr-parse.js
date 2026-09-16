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

function fixDecimal(val, maxExpected) {
  if (val == null) return null;
  let corrected = val;
  while (Math.abs(corrected) > maxExpected) {
    corrected = corrected / 10;
  }
  return Number(corrected.toFixed(2));
}

function rangeFrom(line) {
  const m = line.match(/(-?\d+\.?\d*)\s*[~\-–]\s*(-?\d+\.?\d*)/);
  if (!m) return { min: null, max: null };
  return { min: cleanNumber(m[1]), max: cleanNumber(m[2]) };
}

function extractValue(lines, keywordRegex, excludeRegex = null) {
  const idx = lines.findIndex(
    (l) => keywordRegex.test(l) && (!excludeRegex || !excludeRegex.test(l)),
  );
  if (idx === -1) return { value: null, min: null, max: null, allNums: [] };

  const line = lines[idx];
  const textWithoutLabel = line.replace(keywordRegex, "");
  let nums = numbersIn(textWithoutLabel);

  if (nums.length > 0) {
    const r = rangeFrom(line);
    return { value: nums[0], min: r.min, max: r.max, allNums: nums };
  }

  if (idx + 1 < lines.length) {
    const nextLine = lines[idx + 1];
    if (/(protein|abio|fat|muscle|bmi|pbf|whr)/i.test(nextLine)) {
      return { value: null, min: null, max: null, allNums: [] };
    }

    nums = numbersIn(nextLine);
    if (nums.length > 0) {
      const r = rangeFrom(nextLine);
      return { value: nums[0], min: r.min, max: r.max, allNums: nums };
    }
  }
  return { value: null, min: null, max: null, allNums: [] };
}

function extractAfter(lines, keywordRegex) {
  const idx = lines.findIndex((l) => keywordRegex.test(l));
  if (idx === -1) return null;

  const line = lines[idx];
  const parts = line.split(keywordRegex);
  if (parts.length > 1) {
    const rightPart = parts[parts.length - 1];
    const nums = numbersIn(rightPart);
    if (nums.length > 0) return nums[0];
  }

  if (
    idx + 1 < lines.length &&
    !/(ideal|weight|fat|muscle|basic|health|physical)/i.test(lines[idx + 1])
  ) {
    const numsNext = numbersIn(lines[idx + 1]);
    if (numsNext.length > 0) return numsNext[0];
  }

  return null;
}

function extractBodyPart(lines, keyword) {
  const idx = lines.findIndex((l) =>
    l.toLowerCase().includes(keyword.toLowerCase()),
  );
  if (idx === -1) return { muscle: null, fat: null };

  const nums = numbersIn(lines[idx]);
  if (nums.length >= 2) return { muscle: nums[0], fat: nums[1] };

  if (nums.length === 1 && idx + 1 < lines.length) {
    const nextNums = numbersIn(lines[idx + 1]);
    if (nextNums.length > 0) return { muscle: nums[0], fat: nextNums[0] };
  }

  return { muscle: null, fat: null };
}

function getAssessmentStatus(metric, metricType, gender = "F") {
  if (!metric || metric.value == null) return "";
  
  let min = metric.min;
  let max = metric.max;

  if (min == null || max == null) {
    if (metricType === "PBF") {
      min = gender === "M" ? 10.0 : 18.0; 
      max = gender === "M" ? 20.0 : 28.0;
    } else if (metricType === "BMI") {
      min = 18.5;
      max = 25.0;
    } else {
      return "Cek manual"; 
    }
  }

  if (metric.value < min) {
    return metricType === "PBF" ? "Thin" : "Lack / Under";
  } else if (metric.value > max) {
    if (metricType === "PBF" && metric.value > max + 5) return "Severe obesity";
    return metricType === "PBF" ? "Fat" : "Excessive";
  }
  return "Normal";
}

function extractBodyType(lines, bmi, pbf) {
  if (bmi && bmi.value && pbf && pbf.value) {
    const bmiMin = bmi.min || 18.5;
    const bmiMax = bmi.max || 25.0;
    const pbfMin = pbf.min || 18.0;
    const pbfMax = pbf.max || 28.0;

    const bmiStatus = bmi.value < bmiMin ? "under" : (bmi.value > bmiMax ? "over" : "normal");
    const pbfStatus = pbf.value < pbfMin ? "low" : (pbf.value > pbfMax ? "high" : "normal");

    if (bmiStatus === "under") {
      if (pbfStatus === "low") return "Too thin";
      return "Thin shape"; 
    }
    if (bmiStatus === "normal") {
      if (pbfStatus === "low") return "Low Fat Muscular";
      if (pbfStatus === "normal") return "Normal";
      return "High fat";
    }
    if (bmiStatus === "over") {
      if (pbfStatus === "low" || pbfStatus === "normal") return "Muscle over weight";
      if (pbf.value > pbfMax + 10) return "High obesity";
      if (pbf.value > pbfMax + 5) return "Obesity";
      return "Slight obesity";
    }
  }

  const types = ["Too thin", "Thin shape", "Normal", "Low Fat Muscular", "High fat", "Muscle over weight", "Slight obesity", "Obesity", "High obesity"];
  for (let i = 0; i < lines.length; i++) {
    if (/^[vV]$/.test(lines[i]) || /\s[vV]\s/.test(" " + lines[i] + " ")) {
      for (let j = Math.max(0, i - 3); j <= i; j++) {
         for (let type of types) {
            if (lines[j].replace(/\s/g, '').toLowerCase().includes(type.replace(/\s/g, '').toLowerCase())) {
               return type; 
            }
         }
      }
    }
  }
  return "";
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
    partMuscleFat: {
      armL: { muscle: null, fat: null },
      armR: { muscle: null, fat: null },
      legL: { muscle: null, fat: null },
      legR: { muscle: null, fat: null },
    },
    assessments: {}
  };

  const dateMatch = rawText.match(/\b(20\d{2}[\/\-]\d{2}[\/\-]\d{2})\b/);
  draft.header.datetime = dateMatch ? dateMatch[1].replace(/-/g, "/") : "";

  const ageHeightMatch =
    rawText.match(/(\d{1,3})\s*Age.*?(\d{2,3})\s*cm/i) ||
    rawText.match(/(\d{1,3})[^\d]{1,10}(\d{2,3})\s*cm/i);
  draft.header.age = ageHeightMatch ? cleanNumber(ageHeightMatch[1]) : null;
  draft.header.height = ageHeightMatch ? cleanNumber(ageHeightMatch[2]) : null;
  draft.header.gender = /\bF\b/i.test(rawText.substring(0, 300)) ? "F" : /\bM\b/i.test(rawText.substring(0, 300)) ? "M" : "";
  draft.header.sn = (rawText.match(/(\d{10,})/) || [])[1] || "";

  const water = extractValue(lines, /body\s*water/i, /protein/i);
  draft.water = {
    value: fixDecimal(water.value, 100),
    min: water.min,
    max: water.max,
  };

  const protein = extractValue(lines, /protein/i, /Normal|Lack|Excessive/i);
  draft.protein = {
    value: fixDecimal(protein.value, 30),
    min: protein.min,
    max: protein.max,
  };

  const abio = extractValue(lines, /abio/i, /Normal|Lack|Excessive/i);
  draft.abioSalt = {
    value: fixDecimal(abio.value, 10),
    min: abio.min,
    max: abio.max,
  };

  const fat = extractValue(
    lines,
    /fat\s*\(?kg\)?/i,
    /muscle|Normal|Lack|Excessive/i,
  );
  draft.fat = { value: fixDecimal(fat.value, 100), min: fat.min, max: fat.max };

  const ffmMatch = extractValue(lines, /FFM/i);
  if (ffmMatch.value) {
    draft.ffm = fixDecimal(ffmMatch.value, 150);
  } else if (abio.allNums && abio.allNums.length >= 2) {
    draft.ffm = fixDecimal(abio.allNums[1], 150);
  }

  const weight = extractValue(
    lines,
    /weight\s*\(kg\)/i,
    /FFM|Control|Assessment/i,
  );
  if (weight.value) {
    draft.weight = {
      value: fixDecimal(weight.value, 200),
      min: weight.min,
      max: weight.max,
    };
  } else if (fat.allNums && fat.allNums.length >= 2) {
    draft.weight = {
      value: fixDecimal(fat.allNums[1], 200),
      min: weight.min,
      max: weight.max,
    };
  }

  const muscle = extractValue(lines, /muscle\s*\(kg\)/i, /Control|Assessment/i);
  draft.muscle = {
    value: fixDecimal(muscle.value, 150),
    min: muscle.min,
    max: muscle.max,
  };

  const bmi = extractValue(lines, /BMI/i, /Assessment/i);
  draft.bmi = { value: fixDecimal(bmi.value, 60), min: bmi.min, max: bmi.max };

  const pbf = extractValue(lines, /PBF/i);
  draft.pbf = { value: fixDecimal(pbf.value, 70), min: pbf.min, max: pbf.max };

  draft.whr = {
    value: fixDecimal(extractValue(lines, /WHR/i).value, 2),
    min: null,
    max: null,
  };
  draft.moistureRatio = {
    value: fixDecimal(extractValue(lines, /moisture/i).value, 100),
    min: null,
    max: null,
  };

  draft.visceralFatIndex = {
    value: fixDecimal(extractValue(lines, /visceral/i).value, 50),
    min: null,
    max: null,
  };

  draft.partMuscleFat.armL = extractBodyPart(lines, "Arm(L)");
  draft.partMuscleFat.armR = extractBodyPart(lines, "Arm(R)");
  draft.partMuscleFat.legL = extractBodyPart(lines, "Leg(L)");
  draft.partMuscleFat.legR = extractBodyPart(lines, "Leg(R)");

  draft.idealWeight = fixDecimal(extractAfter(lines, /ideal\s*weight/i), 150);
  draft.weightControl = fixDecimal(extractAfter(lines, /weight\s*control/i), 50);
  draft.fatControl = fixDecimal(extractAfter(lines, /fat\s*control/i), 50);
  draft.muscleControl = fixDecimal(extractAfter(lines, /muscle\s*control/i), 50);
  draft.basicMetabolism = extractAfter(lines, /basic\s*metabolism/i);
  draft.healthAssessment = extractAfter(lines, /health\s*assessment/i);
  draft.physicalAge = extractAfter(lines, /physical\s*age/i);
  
  draft.bodyType = extractBodyType(lines, draft.bmi, draft.pbf);
  
  const gender = draft.header.gender || "F";
  draft.assessments = {
    protein: getAssessmentStatus(draft.protein, "PROTEIN", gender),
    fat: getAssessmentStatus(draft.fat, "FAT", gender),
    muscle: getAssessmentStatus(draft.muscle, "MUSCLE", gender),
    bmi: getAssessmentStatus(draft.bmi, "BMI", gender),
    pbf: getAssessmentStatus(draft.pbf, "PBF", gender)
  };

  return draft;
}