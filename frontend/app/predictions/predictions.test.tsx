import { act } from "react";
import { createRoot, Root } from "react-dom/client";
import { predictGasPrice } from "./predictionAlgorithm";
import { mockGasPriceData } from "./mockData";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// Mock chart.js so canvas rendering doesn't fail in jsdom
jest.mock("chart.js", () => {
  const mockDestroy = jest.fn();
  const MockChart = jest.fn().mockImplementation(() => ({
    destroy: mockDestroy,
  }));
  (MockChart as any).register = jest.fn();
  return {
    Chart: MockChart,
    LineController: {},
    LineElement: {},
    PointElement: {},
    LinearScale: {},
    CategoryScale: {},
    Tooltip: {},
    Legend: {},
  };
});

import PredictionsPage from "./page";

// --- Prediction Algorithm Tests ---

describe("predictGasPrice", () => {
  it("returns null for a state with no data", () => {
    const result = predictGasPrice("WY");
    expect(result).toBeNull();
  });

  it("returns a prediction for a state with data", () => {
    const result = predictGasPrice("TX");
    expect(result).not.toBeNull();
    expect(typeof result!.predictedPrice).toBe("number");
    expect(typeof result!.predictedWeek).toBe("string");
    expect(Array.isArray(result!.futurePredictions)).toBe(true);
    expect(result!.futurePredictions.length).toBe(4);
  });

  it("returns confidence between 0 and 100", () => {
    for (const stateCode of Object.keys(mockGasPriceData)) {
      const result = predictGasPrice(stateCode);
      expect(result).not.toBeNull();
      expect(result!.confidence).toBeGreaterThanOrEqual(0);
      expect(result!.confidence).toBeLessThanOrEqual(100);
    }
  });

  it("returns a confidence label of High, Medium, or Low", () => {
    const result = predictGasPrice("GA");
    expect(result).not.toBeNull();
    expect(["High", "Medium", "Low"]).toContain(result!.confidenceLabel);
  });

  it("returns historicalData matching the mock data length", () => {
    const result = predictGasPrice("CA");
    expect(result).not.toBeNull();
    expect(result!.historicalData.length).toBe(mockGasPriceData["CA"].length);
  });

  it("predicted week is 7 days after the last data point", () => {
    const result = predictGasPrice("NY");
    expect(result).not.toBeNull();
    const lastWeek = new Date(mockGasPriceData["NY"][mockGasPriceData["NY"].length - 1].week);
    const predicted = new Date(result!.predictedWeek);
    const diffDays = (predicted.getTime() - lastWeek.getTime()) / (1000 * 60 * 60 * 24);
    expect(diffDays).toBe(7);
  });

  it("returns 4 future weekly predictions spaced by 7 days", () => {
    const result = predictGasPrice("CA");
    expect(result).not.toBeNull();

    const future = result!.futurePredictions;
    expect(future.length).toBe(4);

    const lastHistorical = new Date(
      mockGasPriceData["CA"][mockGasPriceData["CA"].length - 1].week
    );
    const firstFuture = new Date(future[0].week);
    const firstDiffDays =
      (firstFuture.getTime() - lastHistorical.getTime()) / (1000 * 60 * 60 * 24);
    expect(firstDiffDays).toBe(7);

    for (let index = 1; index < future.length; index++) {
      const prev = new Date(future[index - 1].week);
      const curr = new Date(future[index].week);
      const diffDays = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
      expect(diffDays).toBe(7);
    }
  });
});

// --- Predictions Page Tests ---

describe("PredictionsPage", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  async function renderPage() {
    await act(async () => {
      root.render(<PredictionsPage />);
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
  }

  it("renders the Predictions heading", async () => {
    await renderPage();
    const heading = container.querySelector("h2");
    expect(heading?.textContent).toBe("Predictions");
  });

  it("renders the state dropdown", async () => {
    await renderPage();
    const select = container.querySelector('select[aria-label="State"]');
    expect(select).not.toBeNull();
  });

  it("shows 50 state options plus the placeholder", async () => {
    await renderPage();
    const options = container.querySelectorAll("option");
    expect(options.length).toBe(51); // 50 states + "Select a state"
  });

  it("shows error message when selecting a state with no data", async () => {
    await renderPage();
    const select = container.querySelector('select[aria-label="State"]') as HTMLSelectElement;

    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")?.set;
      setter?.call(select, "WY");
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    const alert = container.querySelector('[role="alert"]');
    expect(alert).not.toBeNull();
    expect(alert?.textContent).toContain(
      "Price prediction data is currently unavailable for your state"
    );
  });

  it("does not show partial or incorrect data when state is unavailable", async () => {
    await renderPage();
    const select = container.querySelector('select[aria-label="State"]') as HTMLSelectElement;

    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")?.set;
      setter?.call(select, "WY");
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    const canvas = container.querySelector("canvas");
    expect(canvas).toBeNull();
  });

  it("renders the chart canvas when a valid state is selected", async () => {
    await renderPage();
    const select = container.querySelector('select[aria-label="State"]') as HTMLSelectElement;

    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")?.set;
      setter?.call(select, "TX");
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    const canvas = container.querySelector("canvas");
    expect(canvas).not.toBeNull();
  });

  it("shows confidence indicator when a valid state is selected", async () => {
    await renderPage();
    const select = container.querySelector('select[aria-label="State"]') as HTMLSelectElement;

    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")?.set;
      setter?.call(select, "CA");
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    const confidence = container.querySelector('[data-testid="confidence-indicator"]');
    expect(confidence).not.toBeNull();
    expect(confidence?.textContent).toMatch(/\d+%/);
    expect(confidence?.textContent).toMatch(/High|Medium|Low/);
  });

  it("shows the predicted price when a valid state is selected", async () => {
    await renderPage();
    const select = container.querySelector('select[aria-label="State"]') as HTMLSelectElement;

    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")?.set;
      setter?.call(select, "FL");
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(container.textContent).toMatch(/\$\d+\.\d{2}\/gal/);
  });
});
