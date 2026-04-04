import { WeeklyPrice, mockGasPriceData } from "./mockData";

export type PredictionResult = {
  predictedPrice: number;
  confidence: number;
  confidenceLabel: string;
  historicalData: WeeklyPrice[];
  predictedWeek: string;
};

// Linear regression on price data. Returns slope, intercept, and R-squared.
function linearRegression(prices: number[]): {
  slope: number;
  intercept: number;
  rSquared: number;
} {
  const n = prices.length;
  // x values are 0, 1, 2, ... (week indices)
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;
  let sumY2 = 0;

  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += prices[i];
    sumXY += i * prices[i];
    sumX2 += i * i;
    sumY2 += prices[i] * prices[i];
  }

  const denominator = n * sumX2 - sumX * sumX;
  if (denominator === 0) {
    return { slope: 0, intercept: prices[0] || 0, rSquared: 0 };
  }

  const slope = (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;

  // R-squared
  const meanY = sumY / n;
  let ssTotal = 0;
  let ssResidual = 0;
  for (let i = 0; i < n; i++) {
    const predicted = slope * i + intercept;
    ssTotal += (prices[i] - meanY) ** 2;
    ssResidual += (prices[i] - predicted) ** 2;
  }

  const rSquared = ssTotal === 0 ? 0 : 1 - ssResidual / ssTotal;

  return { slope, intercept, rSquared };
}

function getConfidenceLabel(confidence: number): string {
  if (confidence >= 80) return "High";
  if (confidence >= 50) return "Medium";
  return "Low";
}

// Add 7 days to a date string (YYYY-MM-DD)
function addOneWeek(dateStr: string): string {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + 7);
  return date.toISOString().split("T")[0];
}

export function predictGasPrice(
  stateCode: string
): PredictionResult | null {
  const data = mockGasPriceData[stateCode];
  if (!data || data.length === 0) {
    return null;
  }

  const prices = data.map((d) => d.price);
  const { slope, intercept, rSquared } = linearRegression(prices);

  // Predict next week (index = data.length)
  const predictedPrice = Number(
    (slope * data.length + intercept).toFixed(2)
  );

  // Convert R-squared to a 0-100 confidence percentage
  const confidence = Math.round(Math.max(0, Math.min(100, rSquared * 100)));

  const lastWeek = data[data.length - 1].week;
  const predictedWeek = addOneWeek(lastWeek);

  return {
    predictedPrice,
    confidence,
    confidenceLabel: getConfidenceLabel(confidence),
    historicalData: data,
    predictedWeek,
  };
}
