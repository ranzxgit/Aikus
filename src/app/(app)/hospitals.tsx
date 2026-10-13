import { colors } from '@/theme/tokens';
import { router } from 'expo-router';
import * as Linking from 'expo-linking';
import { useEffect, useMemo, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import hospitalsJson from '@/data/hospitals.json';
import { HOSPITAL_TEXT } from '@/constants/hospitalCopy';
import { LanguageToggle } from '@/components/language-toggle';
import { AccessiblePressable as Pressable, Card, LargeTitle, PrimaryButton, Screen, SecondaryButton } from '@/components/ui';
import { useAppFlow } from '@/providers/app-flow-provider';
import { getDeviceLocation, type DeviceLocationResult } from '@/services/hospitalLocation';
import { sortHospitals } from '@/services/distance';
import type { Hospital } from '@/types/hospital';

const hospitals = hospitalsJson as Hospital[];

export default function HospitalsScreen() {
  const { language, changeLanguage } = useAppFlow();
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
    <Screen style={styles.safeArea}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={text.back}
          onPress={() => router.replace('/(app)/home')}
          style={styles.backButton}
        >
          <Text style={styles.backText}>‹  {text.back}</Text>
        </Pressable>

        <LanguageToggle language={language} onChange={changeLanguage} />
        <LargeTitle style={styles.title}>{text.title}</LargeTitle>
        <Text style={styles.mapsNote}>{text.mapsOfflineNote}</Text>
        <Text style={styles.mapsNote}>{text.facilitySourceNote}</Text>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={text.osmAttribution}
          onPress={() => void Linking.openURL('https://www.openstreetmap.org/copyright').catch(() => undefined)}
          style={styles.attributionButton}
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
            <Card key={hospital.id} style={styles.card}>
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
                <PrimaryButton label={text.callHospitalLabel(hospital.name)} onPress={() => callHospital(hospital.phone)} style={[styles.actionButton, styles.callButton]}>
                  <Text style={styles.callButtonText}>{text.call}</Text>
                </PrimaryButton>
              ) : null}
              <SecondaryButton
                label={hasCoordinates ? text.directionsLabel(hospital.name) : `${text.directionsUnavailable}: ${hospital.name}`}
                disabled={!hasCoordinates}
                onPress={() => openDirections(hospital)}
                style={[styles.actionButton, styles.directionsButton, !hasCoordinates && styles.disabledButton]}
              >
                <Text style={styles.directionsButtonText}>
                  {hasCoordinates ? text.directions : text.directionsUnavailable}
                </Text>
              </SecondaryButton>
            </Card>
          );
        })}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  scrollView: { flex: 1 },
  content: {
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    gap: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },
  backButton: {
    minHeight: 60,
    alignSelf: 'flex-start',
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: '#F0E3DA',
  },
  backText: { color: colors.text, fontSize: 18,
    fontFamily: 'Inter', fontWeight: '700' },
  title: { color: colors.text, fontSize: 34,
    fontFamily: 'Inter', lineHeight: 42, fontWeight: '800' },
  notice: {
    color: colors.text,
    backgroundColor: '#F0E8E2',
    borderRadius: 16,
    padding: 14,
    fontSize: 18,
    fontFamily: 'Inter',
    lineHeight: 26,
  },
  mapsNote: { color: colors.secondaryText, fontSize: 18,
    fontFamily: 'Inter', lineHeight: 26 },
  attribution: { color: colors.accent, fontSize: 18,
    fontFamily: 'Inter', lineHeight: 26, textDecorationLine: 'underline' },
  attributionButton: { minHeight: 60, justifyContent: 'center' },
  card: {
    gap: 10,
    padding: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  hospitalName: { color: colors.text, fontSize: 22,
    fontFamily: 'Inter', lineHeight: 30, fontWeight: '800' },
  detailLabel: { color: colors.secondaryText, fontSize: 18,
    fontFamily: 'Inter', fontWeight: '700' },
  detailText: { color: colors.text, fontSize: 18,
    fontFamily: 'Inter', lineHeight: 26 },
  distance: { color: colors.text, fontSize: 20,
    fontFamily: 'Inter', lineHeight: 28, fontWeight: '700' },
  addressFallback: {
    gap: 8,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.secondaryText,
    backgroundColor: '#FFF5E8',
    padding: 14,
  },
  addressFallbackLabel: { color: colors.text, fontSize: 18,
    fontFamily: 'Inter', lineHeight: 26, fontWeight: '700' },
  addressFallbackText: { color: '#1F1713', fontSize: 22,
    fontFamily: 'Inter', lineHeight: 30, fontWeight: '800' },
  actionButton: {
    minHeight: 60,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    paddingHorizontal: 16,
  },
  callButton: { backgroundColor: colors.primary },
  callButtonText: { color: colors.card, fontSize: 18,
    fontFamily: 'Inter', fontWeight: '800' },
  directionsButton: { backgroundColor: colors.card, borderWidth: 2, borderColor: colors.primary },
  directionsButtonText: { color: colors.text, fontSize: 18,
    fontFamily: 'Inter', fontWeight: '800' },
  disabledButton: { backgroundColor: '#EDE8E4', borderColor: '#87786F' },
});
