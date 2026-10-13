import type { Coordinates, Hospital, HospitalWithDistance } from '@/types/hospital';

const EARTH_RADIUS_KM = 6371.0088;

export function haversineDistanceKm(from: Coordinates, to: Coordinates): number {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const latitudeDifference = toRadians(to.latitude - from.latitude);
  const longitudeDifference = toRadians(to.longitude - from.longitude);
  const fromLatitude = toRadians(from.latitude);
  const toLatitude = toRadians(to.latitude);
  const haversine =
    Math.sin(latitudeDifference / 2) ** 2 +
    Math.cos(fromLatitude) * Math.cos(toLatitude) * Math.sin(longitudeDifference / 2) ** 2;

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(Math.min(1, haversine)));
}

export function sortHospitals(
  hospitals: readonly Hospital[],
  origin?: Coordinates,
): HospitalWithDistance[] {
  return hospitals
    .map((hospital) => ({
      ...hospital,
      distanceKm:
        origin && hospital.lat !== null && hospital.lng !== null
          ? haversineDistanceKm(origin, { latitude: hospital.lat, longitude: hospital.lng })
          : null,
    }))
    .sort((first, second) => {
      if (first.distanceKm !== null && second.distanceKm !== null) {
        return first.distanceKm - second.distanceKm || first.name.localeCompare(second.name);
      }
      if (first.distanceKm !== null) return -1;
      if (second.distanceKm !== null) return 1;
      return first.name.localeCompare(second.name);
    });
}
