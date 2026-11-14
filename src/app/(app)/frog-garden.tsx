import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { AccessiblePressable } from '@/components/ui';
import { FROG_INTRO_COPY } from '@/features/frogs/introCopy';
import { useAppFlow } from '@/providers/app-flow-provider';
import { fontFamily, profileScreenColors, colors } from '@/theme/tokens';

const MAX_CONTENT_WIDTH = 528;
const SIDE_PADDING = 24;

function GardenIllustration({ accessibilityLabel }: { accessibilityLabel: string }) {
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={accessibilityLabel} style={styles.illustration}>
      <View style={styles.sky} />
      <View style={styles.sun} />
      <View style={styles.farHill} />
      <View style={styles.nearHill} />

      <View style={styles.flowerOne}>
        <View style={styles.flowerPetal} />
        <View style={[styles.flowerPetal, styles.flowerPetalRight]} />
        <View style={[styles.flowerPetal, styles.flowerPetalTop]} />
        <View style={styles.flowerCenter} />
        <View style={styles.flowerStem} />
      </View>
      <View style={styles.flowerTwo}>
        <View style={styles.flowerPetal} />
        <View style={[styles.flowerPetal, styles.flowerPetalRight]} />
        <View style={[styles.flowerPetal, styles.flowerPetalTop]} />
        <View style={styles.flowerCenter} />
        <View style={styles.flowerStem} />
      </View>

      <View style={styles.pot}>
        <View style={styles.potPlantOne} />
        <View style={styles.potPlantTwo} />
        <View style={styles.potBody} />
      </View>

      <View style={styles.frog}>
        <View style={styles.frogFootLeft} />
        <View style={styles.frogFootRight} />
        <View style={styles.frogBody} />
        <View style={styles.frogHead} />
        <View style={styles.frogEyeLeft}>
          <View style={styles.frogPupil} />
        </View>
        <View style={styles.frogEyeRight}>
          <View style={styles.frogPupil} />
        </View>
        <View style={styles.frogSmile} />
      </View>

      <View style={styles.ground} />
    </View>
  );
}

export default function FrogGardenIntroScreen() {
  const { language } = useAppFlow();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const copy = FROG_INTRO_COPY[language];
  const frameWidth = Math.min(width || 390, MAX_CONTENT_WIDTH);
  const artWidth = frameWidth - SIDE_PADDING * 2;

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: Math.max(insets.top, 24),
            paddingBottom: Math.max(insets.bottom, 24) + 112,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.column, { width: frameWidth }]}>
          <View style={styles.brand}>
            <Text accessibilityRole="header" style={styles.brandTitle}>{copy.title}</Text>
            <Text style={styles.brandSubtitle}>{copy.subtitle}</Text>
          </View>

          <GardenIllustration accessibilityLabel={copy.illustration} />
          <View accessibilityElementsHidden style={[styles.progressRule, { width: artWidth }]} />

          <Text accessibilityRole="header" style={styles.todayTitle}>{copy.todaysFrog}</Text>
          <Text style={styles.instructions}>{copy.instructions}</Text>

          <AccessiblePressable
            accessibilityRole="button"
            accessibilityLabel={copy.start}
            onPress={() => undefined}
            style={styles.startButton}
          >
            <Text style={styles.startButtonText}>{copy.start}</Text>
          </AccessiblePressable>

          <AccessiblePressable
            accessibilityRole="button"
            accessibilityLabel={copy.album}
            onPress={() => undefined}
            style={styles.albumButton}
          >
            <Text style={styles.albumText}>{copy.album}</Text>
          </AccessiblePressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: profileScreenColors.background },
  scrollContent: { width: '100%', flexGrow: 1, alignItems: 'center' },
  column: {
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: 'center',
    paddingHorizontal: SIDE_PADDING,
    boxSizing: 'border-box',
  },
  brand: { alignItems: 'flex-start', marginBottom: 20 },
  brandTitle: {
    color: profileScreenColors.ink,
    fontFamily,
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '700',
  },
  brandSubtitle: {
    color: profileScreenColors.secondaryText,
    fontFamily,
    fontSize: 20,
    lineHeight: 28,
  },
  illustration: {
    width: '100%',
    height: 300,
    overflow: 'hidden',
    backgroundColor: '#F8F2E8',
    position: 'relative',
  },
  sky: { position: 'absolute', top: 0, left: 0, right: 0, height: '52%', backgroundColor: '#DCEAF0' },
  sun: { position: 'absolute', width: 36, height: 36, borderRadius: 18, top: 24, right: 38, backgroundColor: '#F5DCA0' },
  farHill: {
    position: 'absolute',
    left: -40,
    right: -20,
    top: '37%',
    height: 112,
    borderRadius: 100,
    backgroundColor: '#B9CEB5',
    transform: [{ rotate: '-4deg' }],
  },
  nearHill: {
    position: 'absolute',
    left: -24,
    right: -30,
    top: '55%',
    height: 140,
    borderRadius: 100,
    backgroundColor: '#93B18F',
    transform: [{ rotate: '3deg' }],
  },
  flowerOne: { position: 'absolute', left: '17%', top: '27%', width: 36, height: 130, alignItems: 'center' },
  flowerTwo: { position: 'absolute', right: '17%', top: '36%', width: 36, height: 100, alignItems: 'center' },
  flowerPetal: { position: 'absolute', width: 15, height: 15, borderRadius: 8, left: 3, top: 3, backgroundColor: '#F8F4E9' },
  flowerPetalRight: { left: 18, top: 3 },
  flowerPetalTop: { left: 11, top: -5 },
  flowerCenter: { position: 'absolute', left: 11, top: 5, width: 14, height: 14, borderRadius: 7, backgroundColor: '#E6B85C' },
  flowerStem: { position: 'absolute', top: 18, width: 4, height: 105, borderRadius: 2, backgroundColor: '#5F8763' },
  pot: { position: 'absolute', left: '8%', bottom: '9%', width: 70, height: 100, alignItems: 'center' },
  potPlantOne: { position: 'absolute', top: 5, left: 10, width: 37, height: 47, borderRadius: 28, backgroundColor: '#668B6B', transform: [{ rotate: '-26deg' }] },
  potPlantTwo: { position: 'absolute', top: 13, right: 7, width: 34, height: 44, borderRadius: 24, backgroundColor: '#7FA17B', transform: [{ rotate: '22deg' }] },
  potBody: { position: 'absolute', top: 47, width: 64, height: 50, borderBottomLeftRadius: 14, borderBottomRightRadius: 14, backgroundColor: '#D8B895', borderTopWidth: 9, borderTopColor: '#B98D68' },
  frog: { position: 'absolute', alignSelf: 'center', top: '41%', width: 166, height: 150 },
  frogBody: { position: 'absolute', bottom: 10, left: 18, width: 130, height: 95, borderRadius: 66, backgroundColor: '#6E9871' },
  frogHead: { position: 'absolute', top: 23, left: 24, width: 118, height: 80, borderRadius: 50, backgroundColor: '#78A47A' },
  frogFootLeft: { position: 'absolute', bottom: 4, left: 1, width: 50, height: 23, borderRadius: 16, backgroundColor: '#5F8763' },
  frogFootRight: { position: 'absolute', bottom: 4, right: 1, width: 50, height: 23, borderRadius: 16, backgroundColor: '#5F8763' },
  frogEyeLeft: { position: 'absolute', top: 8, left: 38, width: 37, height: 38, borderRadius: 20, borderWidth: 3, borderColor: '#5F8763', backgroundColor: '#F8F4E9', alignItems: 'center', justifyContent: 'center' },
  frogEyeRight: { position: 'absolute', top: 8, right: 38, width: 37, height: 38, borderRadius: 20, borderWidth: 3, borderColor: '#5F8763', backgroundColor: '#F8F4E9', alignItems: 'center', justifyContent: 'center' },
  frogPupil: { width: 10, height: 13, borderRadius: 6, backgroundColor: profileScreenColors.ink },
  frogSmile: { position: 'absolute', top: 70, left: 60, width: 46, height: 17, borderBottomWidth: 3, borderBottomColor: '#456E50', borderRadius: 24 },
  ground: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 16, backgroundColor: '#799A70' },
  progressRule: { height: 3, alignSelf: 'center', marginBottom: 28, backgroundColor: colors.homeOrange },
  todayTitle: {
    color: profileScreenColors.ink,
    fontFamily,
    fontSize: 32,
    lineHeight: 40,
    fontWeight: '700',
    marginBottom: 12,
  },
  instructions: {
    color: profileScreenColors.secondaryText,
    fontFamily,
    fontSize: 20,
    lineHeight: 30,
    marginBottom: 24,
  },
  startButton: {
    minHeight: 64,
    borderRadius: 999,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.homeOrange,
    paddingHorizontal: 24,
  },
  startButtonText: { color: colors.homeOrangeText, fontFamily, fontSize: 22, lineHeight: 30, fontWeight: '700' },
  albumButton: { minHeight: 64, justifyContent: 'center', alignItems: 'center', marginTop: 8, paddingHorizontal: 24 },
  albumText: { color: profileScreenColors.ink, fontFamily, fontSize: 20, lineHeight: 28, fontWeight: '600', textDecorationLine: 'underline' },
});
