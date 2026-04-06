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
      ...result.futurePredictions.map((d) => d.week),
    ];
    const historicalPrices = result.historicalData.map((d) => d.price);
    const predictionData = new Array(historicalPrices.length - 1).fill(null);
    predictionData.push(historicalPrices[historicalPrices.length - 1]);
    predictionData.push(...result.futurePredictions.map((d) => d.price));

    chartRef.current = new Chart(canvasRef.current, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Historical Price ($/gal)",
            data: [...historicalPrices, ...new Array(result.futurePredictions.length).fill(null)],
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

  const confidenceColor =
    result?.confidenceLabel === "High"
      ? "#16a34a"
      : result?.confidenceLabel === "Medium"
        ? "#ca8a04"
        : "#dc2626";

  return (
    <div style={{ padding: "1.25rem", maxWidth: 1200, margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1.5rem",
          flexWrap: "wrap",
          gap: "0.75rem",
          paddingBottom: "1rem",
          borderBottom: "2px solid rgba(128,128,128,0.2)",
        }}
      >
        <h2 style={{ margin: 0, fontSize: "1.6rem" }}>Predictions</h2>
        <select
          value={selectedState}
          onChange={(e) => setSelectedState(e.target.value)}
          aria-label="State"
          style={{
            padding: "0.6rem 1rem",
            border: "1px solid #ccc",
            borderRadius: 8,
            backgroundColor: "var(--background)",
            color: "var(--foreground)",
            minWidth: 200,
            fontSize: "1rem",
            cursor: "pointer",
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
            padding: "1rem 1.25rem",
            border: "1px solid #dc2626",
            borderRadius: 10,
            backgroundColor: "#fef2f2",
            color: "#991b1b",
            marginBottom: "1.25rem",
            fontSize: "0.95rem",
            lineHeight: 1.5,
          }}
        >
          {error}
        </div>
      )}

      {result && (
        <>
          <div
            style={{
              display: "flex",
              gap: "1rem",
              flexWrap: "wrap",
              marginBottom: "1.25rem",
            }}
          >
            <div
              style={{
                padding: "1rem 1.25rem",
                border: "1px solid rgba(128,128,128,0.3)",
                borderRadius: 10,
                flex: "1 1 200px",
                backgroundColor: "var(--background)",
              }}
            >
              <div style={{ fontSize: "0.85rem", opacity: 0.6, marginBottom: "0.25rem" }}>
                Predicted Price for {result.predictedWeek}
              </div>
              <div style={{ fontSize: "2rem", fontWeight: 700, color: "#2563eb" }}>
                ${result.predictedPrice.toFixed(2)}
                <span style={{ fontSize: "0.9rem", fontWeight: 400, opacity: 0.6 }}>/gal</span>
              </div>
            </div>
            <div
              data-testid="confidence-indicator"
              style={{
                padding: "1rem 1.25rem",
                border: "1px solid rgba(128,128,128,0.3)",
                borderRadius: 10,
                flex: "1 1 200px",
                backgroundColor: "var(--background)",
              }}
            >
              <div style={{ fontSize: "0.85rem", opacity: 0.6, marginBottom: "0.25rem" }}>
                Confidence
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <span style={{ fontSize: "2rem", fontWeight: 700, color: confidenceColor }}>
                  {result.confidence}%
                </span>
                <span
                  style={{
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    color: "#fff",
                    backgroundColor: confidenceColor,
                    padding: "0.2rem 0.6rem",
                    borderRadius: 20,
                  }}
                >
                  {result.confidenceLabel}
                </span>
              </div>
            </div>
          </div>

          <div
            style={{
              border: "1px solid rgba(128,128,128,0.3)",
              borderRadius: 10,
              padding: "1.25rem",
              marginBottom: "1.25rem",
              backgroundColor: "#ffffff",
            }}
          >
            <canvas ref={canvasRef} aria-label="Gas price trend chart" />
          </div>

          <div
            style={{
              padding: "1rem 1.25rem",
              border: "1px solid rgba(128,128,128,0.3)",
              borderRadius: 10,
              backgroundColor: "var(--background)",
              opacity: 0.85,
              lineHeight: 1.6,
              fontSize: "0.9rem",
            }}
          >
            <p style={{ margin: 0 }}>
              This chart shows the historical weekly average gas price for{" "}
              <strong>{stateName}</strong> over the past 9 weeks, along with
              predicted prices for the next 4 weeks. The prediction uses linear
              regression on the historical trend. Use the dropdown above to
              select a different state. The confidence indicator shows how well
              the historical data fits a linear trend &mdash; higher confidence
              means the prices have been changing more consistently.
            </p>
          </div>
        </>
      )}

      {!selectedState && (
        <div
          style={{
            padding: "2.5rem",
            border: "1px solid rgba(128,128,128,0.3)",
            borderRadius: 10,
            textAlign: "center",
            opacity: 0.7,
            lineHeight: 1.6,
          }}
        >
          <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>&#9981;</div>
          <p style={{ margin: 0, fontSize: "1.05rem" }}>
            Select a state from the dropdown above to view gas price predictions.
          </p>
          <p style={{ margin: "0.5rem 0 0", fontSize: "0.9rem" }}>
            The chart will show historical price trends and predicted prices for
            the next 4 weeks.
          </p>
        </div>
      )}
    </div>
  );
}
