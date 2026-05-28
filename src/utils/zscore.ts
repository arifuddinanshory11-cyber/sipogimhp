import { Gender } from "../types";

/**
 * Calculates the age of a child in completed months between birth date and check date.
 */
export function calculateAgeInMonths(birthDateStr: string, checkDateStr: string): number {
  if (!birthDateStr || !checkDateStr) return 0;
  const birth = new Date(birthDateStr);
  const check = new Date(checkDateStr);
  
  let yearsDiff = check.getFullYear() - birth.getFullYear();
  let monthsDiff = check.getMonth() - birth.getMonth();
  let totalMonths = (yearsDiff * 12) + monthsDiff;
  
  // Adjust if review day is before birth day
  if (check.getDate() < birth.getDate()) {
    totalMonths--;
  }
  
  return Math.max(0, totalMonths);
}

// Milestone points for BB/U (Weight/Age)
// Format: age (months): [boys median, boys SD], [girls median, girls SD]
export interface ReferencePoint {
  [key: number]: {
    boys: [number, number]; // median, SD
    girls: [number, number]; // median, SD
  };
}

export const bbuReference: ReferencePoint = {
  0:  { boys: [3.3, 0.40], girls: [3.2, 0.40] },
  1:  { boys: [4.5, 0.50], girls: [4.2, 0.45] },
  2:  { boys: [5.6, 0.55], girls: [5.1, 0.50] },
  3:  { boys: [6.4, 0.60], girls: [5.8, 0.55] },
  4:  { boys: [7.0, 0.65], girls: [6.4, 0.60] },
  5:  { boys: [7.5, 0.70], girls: [6.9, 0.65] },
  6:  { boys: [7.9, 0.75], girls: [7.3, 0.70] },
  7:  { boys: [8.3, 0.80], girls: [7.6, 0.75] },
  8:  { boys: [8.6, 0.80], girls: [7.9, 0.75] },
  9:  { boys: [8.9, 0.85], girls: [8.2, 0.80] },
  10: { boys: [9.2, 0.85], girls: [8.5, 0.80] },
  11: { boys: [9.4, 0.90], girls: [8.7, 0.85] },
  12: { boys: [9.6, 0.90], girls: [8.9, 0.85] },
  15: { boys: [10.3, 1.00], girls: [9.6, 0.90] },
  18: { boys: [10.9, 1.00], girls: [10.2, 0.95] },
  24: { boys: [12.2, 1.15], girls: [11.5, 1.10] },
  30: { boys: [13.3, 1.25], girls: [12.7, 1.20] },
  36: { boys: [14.3, 1.35], girls: [13.9, 1.30] },
  42: { boys: [15.3, 1.50], girls: [15.0, 1.40] },
  48: { boys: [16.3, 1.60], girls: [16.1, 1.50] },
  54: { boys: [17.3, 1.70], girls: [17.2, 1.65] },
  60: { boys: [18.3, 1.80], girls: [18.2, 1.75] }
};

// Milestone points for TB/U (Height/Age) in cm
export const tbuReference: ReferencePoint = {
  0:  { boys: [49.9, 1.80], girls: [49.1, 1.80] },
  1:  { boys: [54.7, 1.90], girls: [53.7, 1.90] },
  2:  { boys: [58.4, 2.00], girls: [57.1, 2.00] },
  3:  { boys: [61.4, 2.10], girls: [59.8, 2.10] },
  4:  { boys: [63.9, 2.20], girls: [62.1, 2.20] },
  5:  { boys: [65.9, 2.20], girls: [64.0, 2.20] },
  6:  { boys: [67.6, 2.30], girls: [65.7, 2.30] },
  7:  { boys: [69.2, 2.30], girls: [67.3, 2.30] },
  8:  { boys: [70.6, 2.30], girls: [68.7, 2.30] },
  9:  { boys: [72.0, 2.40], girls: [70.1, 2.40] },
  10: { boys: [73.3, 2.40], girls: [71.5, 2.40] },
  11: { boys: [74.5, 2.40], girls: [72.8, 2.40] },
  12: { boys: [75.7, 2.40], girls: [74.0, 2.40] },
  15: { boys: [79.1, 2.50], girls: [77.5, 2.50] },
  18: { boys: [82.3, 2.60], girls: [80.7, 2.60] },
  24: { boys: [87.1, 2.80], girls: [85.7, 2.80] },
  30: { boys: [91.9, 3.10], girls: [90.7, 3.10] },
  36: { boys: [96.1, 3.30], girls: [95.1, 3.30] },
  42: { boys: [100.0, 3.60], girls: [99.0, 3.60] },
  48: { boys: [103.3, 3.80], girls: [102.7, 3.80] },
  54: { boys: [106.7, 4.00], girls: [106.2, 4.00] },
  60: { boys: [110.0, 4.20], girls: [109.4, 4.20] }
};

// Helper for linear interpolation between two reference points
function getInterpolatedReference(
  ref: ReferencePoint,
  gender: Gender,
  ageInMonths: number
): [number, number] {
  const ages = Object.keys(ref).map(Number).sort((a, b) => a - b);
  
  if (ageInMonths <= ages[0]) {
    const r = ref[ages[0]];
    return gender === "L" ? r.boys : r.girls;
  }
  
  if (ageInMonths >= ages[ages.length - 1]) {
    const r = ref[ages[ages.length - 1]];
    return gender === "L" ? r.boys : r.girls;
  }
  
  // Find boundaries
  let lowAge = ages[0];
  let highAge = ages[ages.length - 1];
  for (let i = 0; i < ages.length - 1; i++) {
    if (ageInMonths >= ages[i] && ageInMonths <= ages[i + 1]) {
      lowAge = ages[i];
      highAge = ages[i + 1];
      break;
    }
  }
  
  const lowRef = ref[lowAge];
  const highRef = ref[highAge];
  
  const lowVal = gender === "L" ? lowRef.boys : lowRef.girls;
  const highVal = gender === "L" ? highRef.boys : highRef.girls;
  
  const ratio = (ageInMonths - lowAge) / (highAge - lowAge);
  
  const median = lowVal[0] + ratio * (highVal[0] - lowVal[0]);
  const sd = lowVal[1] + ratio * (highVal[1] - lowVal[1]);
  
  return [median, sd];
}

/**
 * Calculates Weight for Age (BB/U) Z-score
 */
export function getZScoreBBU(gender: Gender, ageInMonths: number, weight: number): { zScore: number; status: "Sangat Kurang" | "Kurang" | "Berat Badan Normal" | "Risiko Gizi Lebih" } {
  const [median, sd] = getInterpolatedReference(bbuReference, gender, ageInMonths);
  const zScore = parseFloat(((weight - median) / sd).toFixed(2));
  
  let status: "Sangat Kurang" | "Kurang" | "Berat Badan Normal" | "Risiko Gizi Lebih";
  if (zScore < -3.0) {
    status = "Sangat Kurang";
  } else if (zScore >= -3.0 && zScore < -2.0) {
    status = "Kurang";
  } else if (zScore >= -2.0 && zScore <= 1.0) {
    status = "Berat Badan Normal";
  } else {
    status = "Risiko Gizi Lebih";
  }
  
  return { zScore, status };
}

/**
 * Calculates Height for Age (TB/U) Z-score (Used for Stunting identification)
 */
export function getZScoreTBU(gender: Gender, ageInMonths: number, height: number): { zScore: number; status: "Sangat Pendek" | "Pendek" | "Stunting Perseda" | "Normal" | "Tinggi" } {
  const [median, sd] = getInterpolatedReference(tbuReference, gender, ageInMonths);
  const zScore = parseFloat(((height - median) / sd).toFixed(2));
  
  let status: "Sangat Pendek" | "Pendek" | "Stunting Perseda" | "Normal" | "Tinggi";
  if (zScore < -3.0) {
    status = "Sangat Pendek";
  } else if (zScore >= -3.0 && zScore < -2.0) {
    status = "Pendek";
  } else if (zScore >= -2.0 && zScore <= 3.0) {
    status = "Normal";
  } else {
    status = "Tinggi";
  }
  
  return { zScore, status };
}

/**
 * Calculates Weight for Height (BB/TB) z-score. Approximated based on child height.
 * Reference model: ideal weight $W$ corresponds to height $H$
 */
export function getZScoreBBTB(gender: Gender, heightCm: number, weightKg: number): { zScore: number; status: "Gizi Buruk / Outlier" | "Gizi Kurang" | "Normal" | "Risiko Gizi Lebih" | "Gizi Lebih" | "Obesitas" } {
  // Model curves for weight vs height
  // height in cm: boys ideal-weight, girls ideal-weight (with approximate SD)
  const hTable: { h: number; boys: [number, number]; girls: [number, number] }[] = [
    { h: 45, boys: [2.4, 0.3], girls: [2.4, 0.3] },
    { h: 50, boys: [3.3, 0.4], girls: [3.3, 0.4] },
    { h: 55, boys: [4.5, 0.5], girls: [4.3, 0.5] },
    { h: 60, boys: [5.7, 0.6], girls: [5.4, 0.6] },
    { h: 65, boys: [7.1, 0.7], girls: [6.7, 0.7] },
    { h: 70, boys: [8.4, 0.8], girls: [8.0, 0.8] },
    { h: 75, boys: [9.5, 0.9], girls: [9.1, 0.9] },
    { h: 80, boys: [10.5, 1.0], girls: [10.1, 1.0] },
    { h: 85, boys: [11.5, 1.1], girls: [11.1, 1.1] },
    { h: 90, boys: [12.6, 1.2], girls: [12.2, 1.2] },
    { h: 95, boys: [13.8, 1.3], girls: [13.4, 1.3] },
    { h: 100, boys: [15.1, 1.4], girls: [14.8, 1.4] },
    { h: 105, boys: [16.6, 1.6], girls: [16.3, 1.6] },
    { h: 110, boys: [18.2, 1.8], girls: [18.0, 1.8] },
    { h: 115, boys: [20.0, 2.0], girls: [19.8, 2.0] },
    { h: 120, boys: [22.0, 2.2], girls: [21.8, 2.2] }
  ];

  let lowIdx = 0;
  let highIdx = hTable.length - 1;
  const h = Math.max(45, Math.min(120, heightCm));

  for (let i = 0; i < hTable.length - 1; i++) {
    if (h >= hTable[i].h && h <= hTable[i + 1].h) {
      lowIdx = i;
      highIdx = i + 1;
      break;
    }
  }

  const lowRef = hTable[lowIdx];
  const highRef = hTable[highIdx];
  const ratio = (h - lowRef.h) / (highRef.h - lowRef.h);

  const lowVal = gender === "L" ? lowRef.boys : lowRef.girls;
  const highVal = gender === "L" ? highRef.boys : highRef.girls;

  const median = lowVal[0] + ratio * (highVal[0] - lowVal[0]);
  const sd = lowVal[1] + ratio * (highVal[1] - lowVal[1]);

  const zScore = parseFloat(((weightKg - median) / sd).toFixed(2));

  let status: "Gizi Buruk / Outlier" | "Gizi Kurang" | "Normal" | "Risiko Gizi Lebih" | "Gizi Lebih" | "Obesitas";
  if (zScore < -3.0) {
    status = "Gizi Buruk / Outlier";
  } else if (zScore >= -3.0 && zScore < -2.0) {
    status = "Gizi Kurang";
  } else if (zScore >= -2.0 && zScore <= 1.0) {
    status = "Normal";
  } else if (zScore > 1.0 && zScore <= 2.0) {
    status = "Risiko Gizi Lebih";
  } else if (zScore > 2.0 && zScore <= 3.0) {
    status = "Gizi Lebih";
  } else {
    status = "Obesitas";
  }

  return { zScore, status };
}
