export * from './types';
export * from './provider';
export * from './utils';

// Export theme configs
export { baseThemeConfig } from '../base/config';
export { minimalThemeConfig } from '../minimal/config';
export { magazineThemeConfig } from '../magazine/config';
export { boutiqueThemeConfig } from '../boutique/config';
export { professionalThemeConfig } from '../professional/config';
export { playfulThemeConfig } from '../playful/config';

import { ThemeConfig } from './types';
import { baseThemeConfig } from '../base/config';
import { minimalThemeConfig } from '../minimal/config';
import { magazineThemeConfig } from '../magazine/config';
import { boutiqueThemeConfig } from '../boutique/config';
import { professionalThemeConfig } from '../professional/config';
import { playfulThemeConfig } from '../playful/config';

export const themes: Record<string, ThemeConfig> = {
  base: baseThemeConfig,
  minimal: minimalThemeConfig,
  magazine: magazineThemeConfig,
  boutique: boutiqueThemeConfig,
  professional: professionalThemeConfig,
  playful: playfulThemeConfig,
};

export function getThemeById(id: string): ThemeConfig | undefined {
  return themes[id];
}

export function getAllThemes(): ThemeConfig[] {
  return Object.values(themes);
}

export function getThemesByCategory(category: string): ThemeConfig[] {
  return Object.values(themes).filter(theme => theme.category === category);
}