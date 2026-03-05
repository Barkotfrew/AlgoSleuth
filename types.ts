
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
