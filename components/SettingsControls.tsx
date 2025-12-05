import React from 'react';
import { VoiceSettings, EmotionType } from '../types';
import { Sliders, Zap, Smile, Volume2 } from 'lucide-react';

interface SettingsControlsProps {
  settings: VoiceSettings;
  onChange: (newSettings: VoiceSettings) => void;
  disabled: boolean;
}

export const SettingsControls: React.FC<SettingsControlsProps> = ({ settings, onChange, disabled }) => {
  
  const updateSetting = <K extends keyof VoiceSettings>(key: K, value: VoiceSettings[K]) => {
    onChange({ ...settings, [key]: value });
  };

  const getEmotionIcon = (emotion: EmotionType) => {
    switch(emotion) {
      case EmotionType.Happy: return <Smile size={16} />;
      case EmotionType.Sad: return <div className="rotate-180"><Smile size={16} /></div>;
      case EmotionType.Energetic: return <Zap size={16} />;
      default: return <Smile size={16} className="text-gray-500" />;
    }
  };

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 transition-opacity ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
      
      {/* Emotion */}
      <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
        <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-3">
          <Smile size={16} className="text-indigo-400" /> Emotion & Style
        </label>
        <div className="grid grid-cols-3 gap-2">
          {Object.values(EmotionType).map((emotion) => (
            <button
              key={emotion}
              onClick={() => updateSetting('emotion', emotion)}
              className={`px-3 py-2 text-xs font-medium rounded-md transition-all ${
                settings.emotion === emotion
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50'
                  : 'bg-gray-800 hover:bg-gray-700 text-gray-400'
              }`}
            >
              {emotion}
            </button>
          ))}
        </div>
      </div>

      {/* Speed */}
      <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
        <div className="flex justify-between mb-2">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
            <Zap size={16} className="text-yellow-400" /> Speed (Rate)
          </label>
          <span className="text-xs text-indigo-300 font-mono">{settings.speed.toFixed(1)}x</span>
        </div>
        <input
          type="range"
          min="0.5"
          max="2.0"
          step="0.1"
          value={settings.speed}
          onChange={(e) => updateSetting('speed', parseFloat(e.target.value))}
          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
        />
        <div className="flex justify-between text-[10px] text-gray-500 mt-1">
          <span>Slow</span>
          <span>Fast</span>
        </div>
      </div>

      {/* Pitch */}
      <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
        <div className="flex justify-between mb-2">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
            <Sliders size={16} className="text-green-400" /> Pitch
          </label>
          <span className="text-xs text-indigo-300 font-mono">
            {settings.pitch > 0 ? '+' : ''}{settings.pitch}%
          </span>
        </div>
        <input
          type="range"
          min="-50"
          max="50"
          step="5"
          value={settings.pitch}
          onChange={(e) => updateSetting('pitch', parseInt(e.target.value))}
          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
        />
        <div className="flex justify-between text-[10px] text-gray-500 mt-1">
          <span>Deep</span>
          <span>High</span>
        </div>
      </div>

      {/* Clarity */}
      <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
        <div className="flex justify-between mb-2">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
            <Volume2 size={16} className="text-blue-400" /> Clarity
          </label>
          <span className="text-xs text-indigo-300 font-mono">{settings.clarity}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          step="10"
          value={settings.clarity}
          onChange={(e) => updateSetting('clarity', parseInt(e.target.value))}
          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
        />
      </div>

    </div>
  );
};