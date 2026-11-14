import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';
import type { SupportedLanguage } from '@/config';

export type HomeTileIcon = ComponentProps<typeof Ionicons>['name'];

export interface HomeTile {
  id: 'hospital' | 'feeling' | 'family' | 'tip' | 'medicines';
  enabled: boolean;
  label: Record<SupportedLanguage, string>;
  icon: HomeTileIcon;
  route: '/(app)/hospitals' | null;
}

export const HOME_TILES: readonly HomeTile[] = [
  {
    id: 'hospital',
    enabled: true,
    label: { en: 'Nearest hospital', tl: 'Pinakamalapit na ospital' },
    icon: 'medkit-outline',
    route: '/(app)/hospitals',
  },
  {
    id: 'feeling',
    enabled: false,
    label: { en: 'How do you feel?', tl: 'Kumusta ang pakiramdam ninyo?' },
    icon: 'heart-outline',
    route: null,
  },
  {
    id: 'family',
    enabled: false,
    label: { en: 'Family', tl: 'Pamilya' },
    icon: 'people-outline',
    route: null,
  },
  {
    id: 'tip',
    enabled: false,
    label: { en: 'Tip of the day', tl: 'Paalala para sa araw na ito' },
    icon: 'bulb-outline',
    route: null,
  },
  {
    id: 'medicines',
    enabled: false,
    label: { en: 'Medicines', tl: 'Mga gamot' },
    icon: 'medical-outline',
    route: null,
  },
];

export function getEnabledHomeTiles(tiles: readonly HomeTile[] = HOME_TILES): HomeTile[] {
  return tiles.filter((tile) => tile.enabled);
}

export function isHomeTileFullWidth(index: number, count: number): boolean {
  return count % 2 === 1 && index === count - 1;
}
