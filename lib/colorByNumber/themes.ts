export interface Theme {
  id: string;
  name: string;
  backgroundColor: string;
}

export const THEMES: Theme[] = [
  { id: 'light', name: 'Light', backgroundColor: '#ffffff' },
  { id: 'dark', name: 'Dark', backgroundColor: '#1a1a1a' },
  { id: 'navy', name: 'Navy', backgroundColor: '#1F2A44' },
  { id: 'deep-forest', name: 'Deep Forest', backgroundColor: '#1F3D2B' },
  { id: 'burgundy', name: 'Burgundy', backgroundColor: '#5A0F14' },
  { id: 'coffee-brown', name: 'Coffee Brown', backgroundColor: '#3A2B22' },
  { id: 'royal-purple', name: 'Royal Purple', backgroundColor: '#3B1E4D' },
  { id: 'sunset-orange', name: 'Sunset Orange', backgroundColor: '#C85A17' },
  { id: 'deep-teal', name: 'Deep Teal', backgroundColor: '#1E474D' },
  { id: 'deep-pink', name: 'Deep Pink', backgroundColor: '#8B1E4A' },
];

// Removed redundant ThemeId type alias

export const getThemeById = (id: string): Theme => {
  return THEMES.find(t => t.id === id) || THEMES[0];
};
