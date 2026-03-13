
export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  isInitial?: boolean;
}

export type ExperienceLevel = 'Beginner' | 'Intermediate';
export type VisualizationPreference = 'Text Only' | 'Show Visualization';
export type DetailPreference = 'Short' | 'Long';

export interface TutorSession {
  input: string;
  level: ExperienceLevel;
  visualization: VisualizationPreference;
  detail: DetailPreference;
}

export type ThemePreference = 'Dark' | 'Light' | 'System';
export type FontSizePreference = 'Small' | 'Medium' | 'Large';
export type AccentColorPreference = 'Yellow' | 'Green' | 'Red' | 'Cyan' | 'Purple';

export interface AppearanceSettings {
  theme: ThemePreference;
  fontSize: FontSizePreference;
  accent: AccentColorPreference;
}

