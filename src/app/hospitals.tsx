import { router } from 'expo-router';
import * as Linking from 'expo-linking';
import { useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import hospitalsJson from '@/data/hospitals.json';
import { HOSPITAL_TEXT } from '@/constants/hospitalCopy';
import { LanguageToggle } from '@/components/language-toggle';
import { useLanguageSetting } from '@/hooks/use-language-setting';
import { getDeviceLocation, type DeviceLocationResult } from '@/services/hospitalLocation';
import { sortHospitals } from '@/services/distance';
import type { Hospital } from '@/types/hospital';

const hospitals = hospitalsJson as Hospital[];

export default function HospitalsScreen() {
  const { language, changeLanguage } = useLanguageSetting();
  const [location, setLocation] = useState<DeviceLocationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [directionsFailureId, setDirectionsFailureId] = useState<string | null>(null);
  const text = HOSPITAL_TEXT[language];

  useEffect(() => {
    let active = true;
    getDeviceLocation().then((result) => {
      if (active) {
        setLocation(result);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const sortedHospitals = useMemo(
    () => sortHospitals(hospitals, location?.status === 'available' ? location.coordinates : undefined),
    [location],
  );
  const allCoordinatesMissing = hospitals.every((hospital) => hospital.lat === null || hospital.lng === null);

  const openDirections = async (hospital: Hospital) => {
    if (hospital.lat === null || hospital.lng === null) return;
    setDirectionsFailureId(null);
    if (Platform.OS === 'android') {
      const query = `${hospital.lat},${hospital.lng}(${encodeURIComponent(hospital.name)})`;
      try {
        await Linking.openURL(`geo:0,0?q=${query}`);
        return;
      } catch {
        // Try the web map below when no Android map app handles geo:.
      }
    }

    const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${hospital.lat},${hospital.lng}`;
    try {
      await Linking.openURL(mapsUrl);
    } catch {
      setDirectionsFailureId(hospital.id);
    }
  };

  const callHospital = (phone: string) => {
    if (!phone.trim()) return;
    const dialablePhone = phone.replace(/[^\d+]/g, '');
    if (!dialablePhone) return;
    void Linking.openURL(`tel:${dialablePhone}`).catch(() => undefined);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={text.back}
          onPress={() => router.replace('/')}
          style={styles.backButton}
        >
          <Text style={styles.backText}>‹  {text.back}</Text>
        </Pressable>

        <LanguageToggle language={language} onChange={changeLanguage} />
        <Text accessibilityRole="header" style={styles.title}>{text.title}</Text>
        <Text style={styles.mapsNote}>{text.mapsOfflineNote}</Text>
        <Text style={styles.mapsNote}>{text.facilitySourceNote}</Text>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={text.osmAttribution}
          onPress={() => void Linking.openURL('https://www.openstreetmap.org/copyright').catch(() => undefined)}
        >
          <Text style={styles.attribution}>{text.osmAttribution}</Text>
        </Pressable>

        {loading ? <Text style={styles.notice}>{text.loading}</Text> : null}
        {!loading && location?.status === 'denied' ? <Text style={styles.notice}>{text.permissionDenied}</Text> : null}
        {!loading && location?.status === 'unavailable' ? <Text style={styles.notice}>{text.locationUnavailable}</Text> : null}
        {!loading && location?.status === 'available' && allCoordinatesMissing ? (
          <Text style={styles.notice}>{text.sampleLocation}</Text>
        ) : null}
        {hospitals.length === 0 ? <Text style={styles.notice}>{text.noHospitals}</Text> : null}

        {sortedHospitals.map((hospital) => {
          const hasCoordinates = hospital.lat !== null && hospital.lng !== null;
          const distance = hospital.distanceKm === null
            ? text.distanceUnavailable
            : `${hospital.distanceKm.toFixed(1)} km`;
          const address = hospital.id.startsWith('sample-') && language === 'tl'
            ? 'SAMPLE na address — palitan ng beripikadong address'
            : hospital.address;
          return (
            <View key={hospital.id} style={styles.card}>
              <Text style={styles.hospitalName}>{hospital.name}</Text>
              <Text style={styles.detailLabel}>{text.addressLabel}</Text>
              <Text style={styles.detailText}>{address}</Text>
              {hospital.phone.trim() ? (
                <View>
                  <Text style={styles.detailLabel}>{text.phoneLabel}</Text>
                  <Text style={styles.detailText}>{hospital.phone}</Text>
                </View>
              ) : null}
              <Text style={styles.distance}>{distance}</Text>
              {directionsFailureId === hospital.id ? (
                <View
                  accessibilityLiveRegion="polite"
                  style={styles.addressFallback}
                >
                  <Text style={styles.addressFallbackLabel}>{text.addressFallback}</Text>
                  <Text
                    accessibilityLabel={`${hospital.name}. ${text.addressLabel}: ${address}`}
                    style={styles.addressFallbackText}
                  >
                    {address}
                  </Text>
                </View>
              ) : null}
              {hospital.phone.trim() ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={text.callHospitalLabel(hospital.name)}
                  onPress={() => callHospital(hospital.phone)}
                  style={[styles.actionButton, styles.callButton]}
                >
                  <Text style={styles.callButtonText}>{text.call}</Text>
                </Pressable>
              ) : null}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={hasCoordinates
                  ? text.directionsLabel(hospital.name)
                  : `${text.directionsUnavailable}: ${hospital.name}`}
                accessibilityState={{ disabled: !hasCoordinates }}
                disabled={!hasCoordinates}
                onPress={() => openDirections(hospital)}
                style={[styles.actionButton, styles.directionsButton, !hasCoordinates && styles.disabledButton]}
              >
                <Text style={styles.directionsButtonText}>
                  {hasCoordinates ? text.directions : text.directionsUnavailable}
                </Text>
              </Pressable>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFF9F4' },
  scrollView: { flex: 1 },
  content: {
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    gap: 16,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 24,
  },
  backButton: {
    minHeight: 56,
    alignSelf: 'flex-start',
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#F0E3DA',
  },
  backText: { color: '#32251F', fontSize: 18, fontWeight: '700' },
  title: { color: '#32251F', fontSize: 28, lineHeight: 36, fontWeight: '800' },
  notice: {
    color: '#49382F',
    backgroundColor: '#F0E8E2',
    borderRadius: 14,
    padding: 14,
    fontSize: 18,
    lineHeight: 26,
  },
  mapsNote: { color: '#49382F', fontSize: 18, lineHeight: 26 },
  attribution: { color: '#194D8C', fontSize: 18, lineHeight: 26, textDecorationLine: 'underline' },
  card: {
    gap: 10,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#D7C5B8',
    backgroundColor: '#FFFFFF',
  },
  hospitalName: { color: '#32251F', fontSize: 22, lineHeight: 30, fontWeight: '800' },
  detailLabel: { color: '#49382F', fontSize: 18, fontWeight: '700' },
  detailText: { color: '#32251F', fontSize: 18, lineHeight: 26 },
  distance: { color: '#32251F', fontSize: 20, lineHeight: 28, fontWeight: '700' },
  addressFallback: {
    gap: 8,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#70421F',
    backgroundColor: '#FFF5E8',
    padding: 14,
  },
  addressFallbackLabel: { color: '#32251F', fontSize: 18, lineHeight: 26, fontWeight: '700' },
  addressFallbackText: { color: '#1F1713', fontSize: 22, lineHeight: 30, fontWeight: '800' },
  actionButton: {
    minHeight: 60,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    paddingHorizontal: 16,
  },
  callButton: { backgroundColor: '#56301F' },
  callButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: '800' },
  directionsButton: { backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: '#56301F' },
  directionsButtonText: { color: '#32251F', fontSize: 18, fontWeight: '800' },
  disabledButton: { backgroundColor: '#EDE8E4', borderColor: '#87786F' },
});
