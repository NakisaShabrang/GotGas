import { act } from "react";
import { createRoot, Root } from "react-dom/client";
import FavoritesClient from "@/app/favorites/FavoritesClient";
import {
  FavoriteStation,
  loadFavorites,
  MAX_FAVORITE_NAME_LENGTH,
  saveFavorites,
} from "@/app/lib/favorites";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("FavoritesClient rename flows", () => {
  let container: HTMLDivElement;
  let root: Root;

  const favorite: FavoriteStation = {
    id: "station-1",
    name: "Shell Downtown",
    address: "123 Main St",
    createdAt: 1700000000000,
  };

  async function renderClient() {
    await act(async () => {
      root.render(<FavoritesClient />);
    });
  }

  function findButton(label: string) {
    const buttons = Array.from(container.querySelectorAll("button"));
    return buttons.find((button) => button.textContent?.trim() === label) ?? null;
  }

  async function clickButton(label: string) {
    const button = findButton(label);
    expect(button).not.toBeNull();

    await act(async () => {
      button!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
  }

  async function updateInputValue(value: string) {
    const input = container.querySelector('input[id^="favorite-rename-"]') as HTMLInputElement | null;
    expect(input).not.toBeNull();

    const setValue = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value"
    )?.set;

    await act(async () => {
      setValue?.call(input, value);
      input!.dispatchEvent(new Event("input", { bubbles: true }));
      input!.dispatchEvent(new Event("change", { bubbles: true }));
    });
  }

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    saveFavorites([favorite]);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    saveFavorites([]);
  });

  it("shows an edit option for a saved favorite", async () => {
    await renderClient();

    expect(findButton("Edit")).not.toBeNull();
  });

  it("saves a new custom name after confirm", async () => {
    await renderClient();

    await clickButton("Edit");
    await updateInputValue("Weekday Commute Stop");
    await clickButton("Confirm");

    expect(loadFavorites()[0].name).toBe("Weekday Commute Stop");
    expect(container.textContent).toContain("Weekday Commute Stop");
  });

  it("shows inline validation when name is empty", async () => {
    await renderClient();

    await clickButton("Edit");
    await updateInputValue("   ");
    await clickButton("Confirm");

    const alert = container.querySelector('[role="alert"]');
    expect(alert?.textContent).toBe("Please enter a valid station name.");
    expect(loadFavorites()[0].name).toBe("Shell Downtown");
  });

  it("shows inline validation when name exceeds max length", async () => {
    await renderClient();

    await clickButton("Edit");
    await updateInputValue("x".repeat(MAX_FAVORITE_NAME_LENGTH + 1));
    await clickButton("Confirm");

    const alert = container.querySelector('[role="alert"]');
    expect(alert?.textContent).toBe(
      `Station name must be ${MAX_FAVORITE_NAME_LENGTH} characters or fewer.`
    );
    expect(loadFavorites()[0].name).toBe("Shell Downtown");
  });

  it("cancels rename without saving", async () => {
    await renderClient();

    await clickButton("Edit");
    await updateInputValue("Do Not Save This");
    await clickButton("Cancel");

    expect(loadFavorites()[0].name).toBe("Shell Downtown");
    expect(container.textContent).toContain("Shell Downtown");
  });
});
