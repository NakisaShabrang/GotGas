const VISITED_KEY = "visitedStations";

export type VisitedStation = {
  id: string;
  name: string;
  address?: string;
};

export function getVisitedStations(): VisitedStation[] {
  const data = localStorage.getItem(VISITED_KEY);
  return data ? JSON.parse(data) : [];
}

export function saveVisitedStations(list: VisitedStation[]) {
  localStorage.setItem(VISITED_KEY, JSON.stringify(list));
}

export function isStationVisited(stationId: string): boolean {
  return getVisitedStations().some((station) => station.id === stationId);
}

export function toggleVisitedStation(station: VisitedStation) {
  let visited = getVisitedStations();

  if (visited.some((s) => s.id === station.id)) {
    visited = visited.filter((s) => s.id !== station.id);
  } else {
    visited.push(station);
  }

  saveVisitedStations(visited);
}