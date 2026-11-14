import type { SupportedLanguage } from '@/config';

export const HOSPITAL_TEXT: Record<
  SupportedLanguage,
  {
    homeTitle: string;
    homeSubtitle: string;
    talkToAikus: string;
    nearestHospital: string;
    title: string;
    loading: string;
    permissionDenied: string;
    locationUnavailable: string;
    sampleLocation: string;
    noHospitals: string;
    distanceUnavailable: string;
    addressLabel: string;
    phoneLabel: string;
    call: string;
    directions: string;
    directionsUnavailable: string;
    mapsOfflineNote: string;
    facilitySourceNote: string;
    osmAttribution: string;
    addressFallback: string;
    back: string;
    callHospitalLabel: (name: string) => string;
    directionsLabel: (name: string) => string;
  }
> = {
  en: {
    homeTitle: 'Welcome to Aikus',
    homeSubtitle: 'A kind companion, here when you need us.',
    talkToAikus: 'Talk to Aikus',
    nearestHospital: 'Nearest Hospital',
    title: 'Hospitals near you',
    loading: 'Checking your location…',
    permissionDenied: 'Location access was not allowed. You can still browse the hospital list alphabetically.',
    locationUnavailable: 'Your location is unavailable here. The hospital list is shown alphabetically. On web, location needs localhost or a secure connection.',
    sampleLocation: 'These are sample entries. Add verified coordinates to calculate distance and open directions.',
    noHospitals: 'No hospitals are listed yet.',
    distanceUnavailable: 'Distance unavailable',
    addressLabel: 'Address',
    phoneLabel: 'Phone',
    call: 'Call',
    directions: 'Directions',
    directionsUnavailable: 'Directions unavailable',
    mapsOfflineNote: 'Maps may need internet. You can download offline maps in your maps app.',
    facilitySourceNote: 'Hospital names, addresses, and listed numbers are from the City Government of Lipa and hospital websites.',
    osmAttribution: '© OpenStreetMap contributors',
    addressFallback: 'Directions did not open. Please use this address:',
    back: 'Back to Home',
    callHospitalLabel: (name) => `Call ${name}`,
    directionsLabel: (name) => `Directions to ${name}`,
  },
  tl: {
    homeTitle: 'Maligayang pagdating sa Aikus',
    homeSubtitle: 'Mabait na kasama ninyo, handang makinig.',
    talkToAikus: 'Kausapin si Aikus',
    nearestHospital: 'Pinakamalapit na Ospital',
    title: 'Mga ospital malapit sa inyo',
    loading: 'Hinahanap ang lokasyon ninyo…',
    permissionDenied: 'Hindi pinayagan ang lokasyon. Maaari pa rin ninyong tingnan ang listahan ayon sa alpabeto.',
    locationUnavailable: 'Hindi makita ang lokasyon ninyo rito. Nakaayos ayon sa alpabeto ang listahan. Sa web, kailangan ng localhost o ligtas na koneksyon para magamit ang lokasyon.',
    sampleLocation: 'Mga halimbawang tala ito. Maglagay ng beripikadong lokasyon para makalkula ang layo at mabuksan ang direksiyon.',
    noHospitals: 'Wala pang nakalistang ospital.',
    distanceUnavailable: 'Hindi matukoy ang layo',
    addressLabel: 'Address',
    phoneLabel: 'Telepono',
    call: 'Tumawag',
    directions: 'Direksiyon',
    directionsUnavailable: 'Walang direksiyon',
    mapsOfflineNote: 'Maaaring kailangan ng internet ang mapa. Maaari kayong mag-download ng offline na mapa sa inyong maps app.',
    facilitySourceNote: 'Mula sa Pamahalaang Lungsod ng Lipa at mga website ng ospital ang mga pangalan, address, at numerong nakalista.',
    osmAttribution: '© OpenStreetMap contributors',
    addressFallback: 'Hindi nabuksan ang direksiyon. Gamitin ang address na ito:',
    back: 'Bumalik sa Home',
    callHospitalLabel: (name) => `Tumawag sa ${name}`,
    directionsLabel: (name) => `Direksiyon papunta sa ${name}`,
  },
};
