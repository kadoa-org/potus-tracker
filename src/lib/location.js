export function hasMapCoordinates(location) {
  return Number.isFinite(location?.lat) && Math.abs(location.lat) <= 90
    && Number.isFinite(location?.lon) && Math.abs(location.lon) <= 180;
}
