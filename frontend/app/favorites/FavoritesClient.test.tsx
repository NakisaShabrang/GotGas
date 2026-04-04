import { act } from "react";
import { createRoot, Root } from "react-dom/client";
import FavoritesClient from "@/app/favorites/FavoritesClient";
import {
  FavoriteStation,
  loadFavoriteGroups,
  loadFavorites,
  MAX_FAVORITE_NAME_LENGTH,
  saveFavoriteGroups,
  saveFavorites,
} from "@/app/lib/favorites";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("FavoritesClient flows", () => {
  let container: HTMLDivElement;
  let root: Root;

  const favorites: FavoriteStation[] = [
    {
      id: "station-1",
      name: "Shell Downtown",
      address: "123 Main St",
      createdAt: 1700000000000,
    },
    {
      id: "station-2",
      name: "BP Uptown",
      address: "456 Oak Ave",
      createdAt: 1700000001000,
    },
  ];

  async function renderClient() {
    await act(async () => {
      root.render(<FavoritesClient />);
    });
  }

  function findButton(label: string, index = 0) {
    const buttons = Array.from(container.querySelectorAll("button"));
    return buttons.filter((button) => button.textContent?.trim() === label)[index] ?? null;
  }

  function findInputByIdPrefix(prefix: string) {
    return container.querySelector(`input[id^="${prefix}"]`) as HTMLInputElement | null;
  }

  async function clickButton(label: string, index = 0) {
    const button = findButton(label, index);
    expect(button).not.toBeNull();

    await act(async () => {
      button!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
  }

  async function clickElement(element: Element | null) {
    expect(element).not.toBeNull();

    await act(async () => {
      element!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
  }

  async function updateInputValue(input: HTMLInputElement | null, value: string) {
    expect(input).not.toBeNull();

    const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;

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
    saveFavorites(favorites);
    saveFavoriteGroups([]);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    saveFavorites([]);
    saveFavoriteGroups([]);
  });

  it("shows an edit option for a saved favorite", async () => {
    await renderClient();

    expect(findButton("Edit")).not.toBeNull();
  });

  it("saves a new custom name after confirm", async () => {
    await renderClient();

    await clickButton("Edit");
    await updateInputValue(findInputByIdPrefix("favorite-rename-"), "Weekday Commute Stop");
    await clickButton("Confirm");

    expect(loadFavorites()[0].name).toBe("Weekday Commute Stop");
    expect(container.textContent).toContain("Weekday Commute Stop");
  });

  it("trims a commuter custom name before saving", async () => {
    await renderClient();

    await clickButton("Edit");
    await updateInputValue(findInputByIdPrefix("favorite-rename-"), "  Weekday Commute Stop  ");
    await clickButton("Confirm");

    expect(loadFavorites()[0].name).toBe("Weekday Commute Stop");
    expect(container.textContent).toContain("Weekday Commute Stop");
  });

  it("shows inline validation when name is empty", async () => {
    await renderClient();

    await clickButton("Edit");
    await updateInputValue(findInputByIdPrefix("favorite-rename-"), "   ");
    await clickButton("Confirm");

    const alert = container.querySelector('[role="alert"]');
    expect(alert?.textContent).toBe("Please enter a valid station name.");
    expect(loadFavorites()[0].name).toBe("Shell Downtown");
  });

  it("shows inline validation when name exceeds max length", async () => {
    await renderClient();

    await clickButton("Edit");
    await updateInputValue(findInputByIdPrefix("favorite-rename-"), "x".repeat(MAX_FAVORITE_NAME_LENGTH + 1));
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
    await updateInputValue(findInputByIdPrefix("favorite-rename-"), "Do Not Save This");
    await clickButton("Cancel");

    expect(loadFavorites()[0].name).toBe("Shell Downtown");
    expect(container.textContent).toContain("Shell Downtown");
  });

  it("creates a new list from the favorites tab", async () => {
    await renderClient();

    await clickButton("Create New List");
    await updateInputValue(container.querySelector("#new-group-name") as HTMLInputElement | null, "Home Route");
    await clickButton("Save List");

    expect(loadFavoriteGroups()).toHaveLength(1);
    expect(loadFavoriteGroups()[0].name).toBe("Home Route");
    expect(container.textContent).toContain("Home Route");
  });

  it("shows an error when the user tries to create a duplicate list", async () => {
    saveFavoriteGroups([{ id: "group-1", name: "Home Route", stationIds: [], createdAt: 10 }]);
    await renderClient();

    await clickButton("Create New List");
    await updateInputValue(container.querySelector("#new-group-name") as HTMLInputElement | null, "home route");
    await clickButton("Save List");

    expect(container.textContent).toContain("A list with that name already exists.");
    expect(loadFavoriteGroups()).toHaveLength(1);
  });

  it("adds a station to a specific list from the plus button", async () => {
    saveFavoriteGroups([{ id: "group-1", name: "Home Route", stationIds: [], createdAt: 10 }]);
    await renderClient();

    const plusButtons = Array.from(container.querySelectorAll('button[aria-label^="Add "]'));
    await clickElement(plusButtons[0]);
    await clickButton("Add to List");

    expect(loadFavoriteGroups()[0].stationIds).toEqual(["station-1"]);
    expect(container.textContent).toContain("1 station in this list.");
  });

  it("does not add the same station to a list twice from the UI", async () => {
    saveFavoriteGroups([{ id: "group-1", name: "Home Route", stationIds: [], createdAt: 10 }]);
    await renderClient();

    const plusButtons = Array.from(container.querySelectorAll('button[aria-label^="Add "]'));
    await clickElement(plusButtons[0]);
    await clickButton("Add to List");
    expect(findButton("Added")).not.toBeNull();

    expect(loadFavoriteGroups()[0].stationIds).toEqual(["station-1"]);
  });

  it("removes a station from a list without deleting the favorite", async () => {
    saveFavoriteGroups([
      { id: "group-1", name: "Home Route", stationIds: ["station-1"], createdAt: 10 },
    ]);
    await renderClient();

    await clickButton("Remove from List");

    expect(loadFavoriteGroups()[0].stationIds).toEqual([]);
    expect(loadFavorites()).toHaveLength(2);
  });

  it("renames a list", async () => {
    saveFavoriteGroups([{ id: "group-1", name: "Home Route", stationIds: [], createdAt: 10 }]);
    await renderClient();

    await clickButton("Rename");
    await updateInputValue(findInputByIdPrefix("rename-group-"), "Work Route");
    await clickButton("Save");

    expect(loadFavoriteGroups()[0].name).toBe("Work Route");
    expect(container.textContent).toContain("Work Route");
  });

  it("deletes a list without deleting favorites", async () => {
    saveFavoriteGroups([{ id: "group-1", name: "Home Route", stationIds: ["station-1"], createdAt: 10 }]);
    await renderClient();

    await clickButton("Delete");

    expect(loadFavoriteGroups()).toEqual([]);
    expect(loadFavorites()).toHaveLength(2);
    expect(container.textContent).toContain("No lists yet.");
  });
});
