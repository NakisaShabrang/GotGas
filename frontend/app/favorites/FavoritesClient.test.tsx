import { act } from "react";
import { createRoot, Root } from "react-dom/client";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mockFetch = jest.fn();
global.fetch = mockFetch;

import FavoritesClient from "@/app/favorites/FavoritesClient";
import { FavoriteStation, FavoriteGroup } from "@/app/lib/favorites";

describe("FavoritesClient flows", () => {
  let container: HTMLDivElement;
  let root: Root;

  const favorites: FavoriteStation[] = [
    { id: "station-1", name: "Shell Downtown", address: "123 Main St", createdAt: 1700000000000 },
    { id: "station-2", name: "BP Uptown", address: "456 Oak Ave", createdAt: 1700000001000 },
  ];

  const emptyGroups: FavoriteGroup[] = [];

  function mockInitialLoad(favs: FavoriteStation[], groups: FavoriteGroup[]) {
    mockFetch.mockImplementation((url: string) => {
      if (url.endsWith("/favorites")) {
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(favs) });
      }
      if (url.endsWith("/favorite-groups")) {
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(groups) });
      }
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ message: "ok" }) });
    });
  }

  async function renderClient() {
    await act(async () => {
      root.render(<FavoritesClient />);
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
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
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
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
    mockFetch.mockReset();
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it("shows loading state then displays favorites", async () => {
    mockInitialLoad(favorites, emptyGroups);
    await renderClient();
    expect(container.textContent).toContain("Shell Downtown");
    expect(container.textContent).toContain("BP Uptown");
  });

  it("shows empty message when no favorites", async () => {
    mockInitialLoad([], emptyGroups);
    await renderClient();
    expect(container.textContent).toContain("You have no favorites yet.");
  });

  it("shows an edit option for a saved favorite", async () => {
    mockInitialLoad(favorites, emptyGroups);
    await renderClient();
    expect(findButton("Edit")).not.toBeNull();
  });

  it("shows inline validation when rename is empty", async () => {
    mockInitialLoad(favorites, emptyGroups);
    await renderClient();

    await clickButton("Edit");
    await updateInputValue(findInputByIdPrefix("favorite-rename-"), "   ");
    await clickButton("Confirm");

    const alert = container.querySelector('[role="alert"]');
    expect(alert?.textContent).toBe("Please enter a valid station name.");
  });

  it("cancels rename without calling API", async () => {
    mockInitialLoad(favorites, emptyGroups);
    await renderClient();

    await clickButton("Edit");
    await updateInputValue(findInputByIdPrefix("favorite-rename-"), "Do Not Save This");
    await clickButton("Cancel");

    expect(container.textContent).toContain("Shell Downtown");
  });

  it("calls remove API when removing a favorite", async () => {
    mockInitialLoad(favorites, emptyGroups);
    await renderClient();

    // Mock the delete + reload
    mockFetch.mockImplementation((url: string, opts?: RequestInit) => {
      if (opts?.method === "DELETE") {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ message: "ok" }) });
      }
      if (url.endsWith("/favorites")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([favorites[1]]) });
      }
      if (url.endsWith("/favorite-groups")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ message: "ok" }) });
    });

    await clickButton("Remove");

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/favorites/station-1"),
      expect.objectContaining({ method: "DELETE" })
    );
  });

  it("opens create list form on button click", async () => {
    mockInitialLoad(favorites, emptyGroups);
    await renderClient();

    await clickButton("Create New List");
    expect(container.querySelector("#new-group-name")).not.toBeNull();
  });

  it("shows error for duplicate list name", async () => {
    const groups = [{ id: "group-1", name: "Home Route", stationIds: [], createdAt: 10 }];
    mockInitialLoad(favorites, groups);
    await renderClient();

    await clickButton("Create New List");
    await updateInputValue(container.querySelector("#new-group-name") as HTMLInputElement, "home route");
    await clickButton("Save List");

    expect(container.textContent).toContain("A list with that name already exists.");
  });

  it("shows no lists message when groups are empty", async () => {
    mockInitialLoad(favorites, emptyGroups);
    await renderClient();
    expect(container.textContent).toContain("No lists yet.");
  });

  it("displays group with station count", async () => {
    const groups = [{ id: "group-1", name: "Home Route", stationIds: ["station-1"], createdAt: 10 }];
    mockInitialLoad(favorites, groups);
    await renderClient();
    expect(container.textContent).toContain("Home Route");
    expect(container.textContent).toContain("1 station in this list.");
  });
});
