"use client";

import { useEffect, useRef, useState } from "react";
import { ALL_STATES } from "./mockData";
import { predictGasPrice, PredictionResult } from "./predictionAlgorithm";
import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend,
} from "chart.js";

Chart.register(
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend
);

export default function PredictionsPage() {
  const [selectedState, setSelectedState] = useState("");
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [error, setError] = useState("");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!selectedState) {
      setResult(null);
      setError("");
      return;
    }

    const prediction = predictGasPrice(selectedState);
    if (!prediction) {
      setResult(null);
      setError(
        "Price prediction data is currently unavailable for your state. Please try again later."
      );
      return;
    }

    setError("");
    setResult(prediction);
  }, [selectedState]);

  useEffect(() => {
    if (!result || !canvasRef.current) return;

    if (chartRef.current) {
      chartRef.current.destroy();
    }

    const labels = [
      ...result.historicalData.map((d) => d.week),
      result.predictedWeek,
    ];
    const historicalPrices = result.historicalData.map((d) => d.price);
    const predictionData = new Array(historicalPrices.length - 1).fill(null);
    predictionData.push(historicalPrices[historicalPrices.length - 1]);
    predictionData.push(result.predictedPrice);

    chartRef.current = new Chart(canvasRef.current, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Historical Price ($/gal)",
            data: [...historicalPrices, null],
            borderColor: "#2563eb",
            backgroundColor: "#2563eb",
            tension: 0.2,
            pointRadius: 4,
          },
          {
            label: "Predicted Price ($/gal)",
            data: predictionData,
            borderColor: "#dc2626",
            backgroundColor: "#dc2626",
            borderDash: [6, 4],
            tension: 0,
            pointRadius: 6,
            pointStyle: "triangle",
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: "top" },
          tooltip: { mode: "index", intersect: false },
        },
        scales: {
          y: {
            title: { display: true, text: "Price ($/gal)" },
          },
          x: {
            title: { display: true, text: "Week" },
          },
        },
      },
    });

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [result]);

  const stateName = ALL_STATES.find((s) => s.code === selectedState)?.name;

  return (
    <div style={{ padding: "1.25rem", maxWidth: 1200, margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1rem",
          flexWrap: "wrap",
          gap: "0.5rem",
        }}
      >
        <h2 style={{ margin: 0 }}>Predictions</h2>
        <select
          value={selectedState}
          onChange={(e) => setSelectedState(e.target.value)}
          aria-label="State"
          style={{
            padding: "0.5rem 0.75rem",
            border: "1px solid #ccc",
            borderRadius: 8,
            backgroundColor: "var(--background)",
            color: "var(--foreground)",
            minWidth: 180,
          }}
        >
          <option value="">Select a state</option>
          {ALL_STATES.map((s) => (
            <option key={s.code} value={s.code}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div
          role="alert"
          style={{
            padding: "1rem",
            border: "1px solid #dc2626",
            borderRadius: 10,
            backgroundColor: "#fef2f2",
            color: "#991b1b",
            marginBottom: "1rem",
          }}
        >
          {error}
        </div>
      )}

      {result && (
        <>
          <div
            style={{
              border: "1px solid #ccc",
              borderRadius: 10,
              padding: "1rem",
              marginBottom: "1rem",
            }}
          >
            <canvas ref={canvasRef} aria-label="Gas price trend chart" />
          </div>

          <div
            style={{
              display: "flex",
              gap: "1rem",
              flexWrap: "wrap",
              marginBottom: "1rem",
            }}
          >
            <div
              style={{
                padding: "0.75rem 1rem",
                border: "1px solid #ccc",
                borderRadius: 10,
                flex: "1 1 200px",
              }}
            >
              <strong>Predicted Price for {result.predictedWeek}:</strong>
              <div style={{ fontSize: "1.5rem", fontWeight: 700 }}>
                ${result.predictedPrice.toFixed(2)}/gal
              </div>
            </div>
            <div
              data-testid="confidence-indicator"
              style={{
                padding: "0.75rem 1rem",
                border: "1px solid #ccc",
                borderRadius: 10,
                flex: "1 1 200px",
              }}
            >
              <strong>Confidence:</strong>
              <div style={{ fontSize: "1.5rem", fontWeight: 700 }}>
                {result.confidence}% &mdash; {result.confidenceLabel}
              </div>
            </div>
          </div>

          <div
            style={{
              padding: "1rem",
              border: "1px solid #ccc",
              borderRadius: 10,
            }}
          >
            <p style={{ margin: 0 }}>
              This chart shows the historical weekly average gas price for{" "}
              {stateName} over the past 8 weeks, along with a predicted price
              for next week. The prediction uses linear regression on the
              historical trend. Use the dropdown above to select a different
              state. The confidence indicator shows how well the historical data
              fits a linear trend &mdash; higher confidence means the prices
              have been changing more consistently.
            </p>
          </div>
        </>
      )}

      {!selectedState && (
        <div
          style={{
            padding: "1rem",
            border: "1px solid #ccc",
            borderRadius: 10,
          }}
        >
          <p style={{ margin: 0 }}>
            Select a state from the dropdown above to view gas price predictions.
            The chart will show historical price trends and a predicted price for
            next week.
          </p>
        </div>
      )}
    </div>
  );
}
