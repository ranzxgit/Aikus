export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface Hospital {
  id: string;
  name: string;
  lat: number | null;
  lng: number | null;
  phone: string;
  address: string;
}

export interface HospitalWithDistance extends Hospital {
  distanceKm: number | null;
}
