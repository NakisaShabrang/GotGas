import {
  addFavorite,
  addStationToFavoriteGroup,
  createFavoriteGroup,
  deleteFavoriteGroup,
  FavoriteStation,
  getFavoriteGroupNameError,
  isValidFavoriteGroupName,
  isValidFavoriteName,
  loadFavoriteGroups,
  loadFavorites,
  MAX_FAVORITE_GROUP_NAME_LENGTH,
  MAX_FAVORITE_NAME_LENGTH,
  normalizeFavoriteGroupName,
  normalizeFavoriteName,
  removeFavorite,
  removeStationFromFavoriteGroup,
  renameFavoriteGroup,
  saveFavoriteGroups,
  saveFavorites,
  updateFavoriteName,
} from "@/app/lib/favorites";

describe("favorites utility functions", () => {
  beforeEach(() => {
    document.cookie.split(";").forEach((cookie) => {
      const name = cookie.split("=")[0].trim();
      document.cookie = `${name}=; max-age=0; path=/`;
    });
  });

  describe("normalizeFavoriteName", () => {
    it("trims whitespace from the name", () => {
      expect(normalizeFavoriteName("  Shell Station  ")).toBe("Shell Station");
    });

    it("returns empty string for whitespace-only input", () => {
      expect(normalizeFavoriteName("   ")).toBe("");
    });
  });

  describe("isValidFavoriteName", () => {
    it("returns true for a valid name", () => {
      expect(isValidFavoriteName("Shell Station")).toBe(true);
    });

    it("returns false for empty string", () => {
      expect(isValidFavoriteName("")).toBe(false);
    });

    it("returns false for whitespace-only string", () => {
      expect(isValidFavoriteName("   ")).toBe(false);
    });

    it("returns false for a name exceeding max length", () => {
      expect(isValidFavoriteName("x".repeat(MAX_FAVORITE_NAME_LENGTH + 1))).toBe(false);
    });

    it("returns true for name at exactly max length", () => {
      expect(isValidFavoriteName("x".repeat(MAX_FAVORITE_NAME_LENGTH))).toBe(true);
    });
  });

  describe("normalizeFavoriteGroupName", () => {
    it("trims whitespace from the list name", () => {
      expect(normalizeFavoriteGroupName("  Home Route  ")).toBe("Home Route");
    });
  });

  describe("isValidFavoriteGroupName", () => {
    it("returns true for a valid list name", () => {
      expect(isValidFavoriteGroupName("Work Stops")).toBe(true);
    });

    it("returns false for a blank list name", () => {
      expect(isValidFavoriteGroupName("   ")).toBe(false);
    });

    it("returns false for a list name that is too long", () => {
      expect(isValidFavoriteGroupName("x".repeat(MAX_FAVORITE_GROUP_NAME_LENGTH + 1))).toBe(false);
    });
  });

  describe("getFavoriteGroupNameError", () => {
    it("returns an error for duplicate list names regardless of case", () => {
      const groups = [
        { id: "group-1", name: "Home Route", stationIds: [], createdAt: 1 },
      ];

      expect(getFavoriteGroupNameError("home route", groups)).toBe(
        "A list with that name already exists."
      );
    });
  });

  describe("loadFavorites", () => {
    it("returns empty array when no cookie is set", () => {
      expect(loadFavorites()).toEqual([]);
    });

    it("returns saved favorites from cookie", () => {
      const favorites: FavoriteStation[] = [{ id: "1", name: "Station A", createdAt: 1000 }];
      saveFavorites(favorites);
      expect(loadFavorites()).toEqual(favorites);
    });

    it("returns empty array for invalid JSON in cookie", () => {
      document.cookie = `${encodeURIComponent("gotgas:favorites")}=not-json; path=/`;
      expect(loadFavorites()).toEqual([]);
    });
  });

  describe("loadFavoriteGroups", () => {
    it("returns empty array when no group cookie is set", () => {
      expect(loadFavoriteGroups()).toEqual([]);
    });

    it("returns saved groups from cookie", () => {
      const groups = [{ id: "group-1", name: "Home", stationIds: ["station-1"], createdAt: 1000 }];
      saveFavoriteGroups(groups);
      expect(loadFavoriteGroups()).toEqual(groups);
    });
  });

  describe("addFavorite", () => {
    it("adds a new favorite to the list", () => {
      const result = addFavorite({ id: "station-1", name: "BP Gas", address: "123 Main St" });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("station-1");
      expect(result[0].name).toBe("BP Gas");
      expect(result[0].address).toBe("123 Main St");
      expect(result[0].createdAt).toBeGreaterThan(0);
    });

    it("does not add a duplicate favorite", () => {
      addFavorite({ id: "station-1", name: "BP Gas" });
      const result = addFavorite({ id: "station-1", name: "BP Gas" });
      expect(result).toHaveLength(1);
    });

    it("prepends new favorites to the front of the list", () => {
      addFavorite({ id: "station-1", name: "First" });
      const result = addFavorite({ id: "station-2", name: "Second" });
      expect(result[0].name).toBe("Second");
      expect(result[1].name).toBe("First");
    });

    it("trims the name before saving", () => {
      const result = addFavorite({ id: "station-1", name: "  Shell  " });
      expect(result[0].name).toBe("Shell");
    });
  });

  describe("removeFavorite", () => {
    it("removes a favorite by id", () => {
      addFavorite({ id: "station-1", name: "Shell" });
      addFavorite({ id: "station-2", name: "BP" });
      const result = removeFavorite("station-1");
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("station-2");
    });

    it("returns empty array when removing the only favorite", () => {
      addFavorite({ id: "station-1", name: "Shell" });
      const result = removeFavorite("station-1");
      expect(result).toEqual([]);
    });

    it("does nothing when id does not exist", () => {
      addFavorite({ id: "station-1", name: "Shell" });
      const result = removeFavorite("nonexistent");
      expect(result).toHaveLength(1);
    });

    it("removes the station from every list as well", () => {
      saveFavorites([{ id: "station-1", name: "Shell", createdAt: 1 }]);
      saveFavoriteGroups([{ id: "group-1", name: "Home", stationIds: ["station-1"], createdAt: 2 }]);

      removeFavorite("station-1");

      expect(loadFavoriteGroups()[0].stationIds).toEqual([]);
    });
  });

  describe("updateFavoriteName", () => {
    it("updates the name of an existing favorite", () => {
      addFavorite({ id: "station-1", name: "Old Name" });
      const result = updateFavoriteName("station-1", "New Name");
      expect(result[0].name).toBe("New Name");
    });

    it("trims and persists a commuter custom name", () => {
      addFavorite({ id: "station-1", name: "Shell" });
      const result = updateFavoriteName("station-1", "  Weekday Commute Stop  ");
      expect(result[0].name).toBe("Weekday Commute Stop");
      expect(loadFavorites()[0].name).toBe("Weekday Commute Stop");
    });

    it("does not update if the new name is invalid (empty)", () => {
      addFavorite({ id: "station-1", name: "Shell" });
      const result = updateFavoriteName("station-1", "   ");
      expect(result[0].name).toBe("Shell");
    });

    it("does not update if the new name exceeds max length", () => {
      addFavorite({ id: "station-1", name: "Shell" });
      const result = updateFavoriteName("station-1", "x".repeat(MAX_FAVORITE_NAME_LENGTH + 1));
      expect(result[0].name).toBe("Shell");
    });

    it("does not modify other favorites", () => {
      addFavorite({ id: "station-1", name: "Shell" });
      addFavorite({ id: "station-2", name: "BP" });
      const result = updateFavoriteName("station-1", "Updated Shell");
      const bp = result.find((favorite) => favorite.id === "station-2");
      expect(bp?.name).toBe("BP");
    });

    it("leaves favorites unchanged when the station id does not exist", () => {
      addFavorite({ id: "station-1", name: "Shell" });
      const result = updateFavoriteName("missing-station", "Updated Shell");
      expect(result).toEqual(loadFavorites());
      expect(result[0].name).toBe("Shell");
    });
  });

  describe("favorite groups", () => {
    beforeEach(() => {
      saveFavorites([
        { id: "station-1", name: "Shell", createdAt: 1 },
        { id: "station-2", name: "BP", createdAt: 2 },
      ]);
    });

    it("creates a new list and trims the name", () => {
      const groups = createFavoriteGroup("  Home Route  ");
      expect(groups).toHaveLength(1);
      expect(groups[0].name).toBe("Home Route");
      expect(groups[0].stationIds).toEqual([]);
    });

    it("prevents duplicate group names", () => {
      createFavoriteGroup("Home Route");
      const groups = createFavoriteGroup("home route");
      expect(groups).toHaveLength(1);
    });

    it("renames an existing list", () => {
      const created = createFavoriteGroup("Home Route");
      const groups = renameFavoriteGroup(created[0].id, "Work Route");
      expect(groups[0].name).toBe("Work Route");
    });

    it("deletes a list without deleting favorites", () => {
      const created = createFavoriteGroup("Home Route");
      const groups = deleteFavoriteGroup(created[0].id);
      expect(groups).toEqual([]);
      expect(loadFavorites()).toHaveLength(2);
    });

    it("adds a station to a list", () => {
      const created = createFavoriteGroup("Home Route");
      const groups = addStationToFavoriteGroup(created[0].id, "station-1");
      expect(groups[0].stationIds).toEqual(["station-1"]);
    });

    it("does not add the same station to a list twice", () => {
      const created = createFavoriteGroup("Home Route");
      addStationToFavoriteGroup(created[0].id, "station-1");
      const groups = addStationToFavoriteGroup(created[0].id, "station-1");
      expect(groups[0].stationIds).toEqual(["station-1"]);
    });

    it("removes a station from a list only", () => {
      const created = createFavoriteGroup("Home Route");
      addStationToFavoriteGroup(created[0].id, "station-1");
      const groups = removeStationFromFavoriteGroup(created[0].id, "station-1");

      expect(groups[0].stationIds).toEqual([]);
      expect(loadFavorites()).toHaveLength(2);
    });

    it("does nothing when removing a station that is not in the list", () => {
      const created = createFavoriteGroup("Home Route");
      const groups = removeStationFromFavoriteGroup(created[0].id, "station-1");
      expect(groups[0].stationIds).toEqual([]);
    });
  });
});
