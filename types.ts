export interface VoiceOption {
  id: string;
  name: string;
  gender: 'Male' | 'Female';
  type: 'Narrator' | 'Character' | 'Standard' | 'Child' | 'Teen';
  geminiVoiceName: string; // Maps to 'Puck', 'Kore', etc.
}

export interface VoiceSettings {
  pitch: number; // -20 to +20 (percentage in SSML)
  speed: number; // 0.5 to 2.0 (rate in SSML)
  emotion: EmotionType;
  clarity: number; // 0-100 (Conceptual mapping)
}

export enum EmotionType {
  Calm = 'Calm',
  Happy = 'Happy',
  Dramatic = 'Dramatic',
  Energetic = 'Energetic',
  Sad = 'Sad'
}

export interface DialectOption {
  code: string; // e.g., 'ar-EG'
  label: string;
  nativeLabel: string;
}

export const SUPPORTED_DIALECTS: DialectOption[] = [
  { code: 'ar-XA', label: 'Modern Standard Arabic', nativeLabel: 'الفصحى' },
  { code: 'ar-EG', label: 'Egyptian (Cairo)', nativeLabel: 'مصر - قاهري' },
  { code: 'ar-EG-Saidi', label: 'Egyptian (Sa\'idi)', nativeLabel: 'مصر - صعيدي' },
];

export const AVAILABLE_VOICES: VoiceOption[] = [
  { id: 'v_boy_7', name: 'Boy (7 yrs)', gender: 'Male', type: 'Child', geminiVoiceName: 'Puck' },
  { id: 'v_girl_7', name: 'Girl (7 yrs)', gender: 'Female', type: 'Child', geminiVoiceName: 'Zephyr' },
  { id: 'v_boy_17', name: 'Teen Boy (17 yrs)', gender: 'Male', type: 'Teen', geminiVoiceName: 'Puck' },
  { id: 'v_girl_17', name: 'Teen Girl (17 yrs)', gender: 'Female', type: 'Teen', geminiVoiceName: 'Kore' },
  { id: 'v_male_std', name: 'Male Standard', gender: 'Male', type: 'Standard', geminiVoiceName: 'Puck' },
  { id: 'v_female_clear', name: 'Female Clear', gender: 'Female', type: 'Standard', geminiVoiceName: 'Zephyr' },
  { id: 'v_narrator', name: 'Narrator', gender: 'Male', type: 'Narrator', geminiVoiceName: 'Charon' },
  { id: 'v_male_deep', name: 'Male Deep', gender: 'Male', type: 'Character', geminiVoiceName: 'Fenrir' },
];