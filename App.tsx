import React, { useState, useCallback, useEffect, useRef } from 'react';
import { StepSection } from './components/StepSection';
import { SettingsControls } from './components/SettingsControls';
import { 
  AVAILABLE_VOICES, 
  VoiceSettings, 
  EmotionType, 
  VoiceOption, 
  DialectOption,
  SUPPORTED_DIALECTS
} from './types';
import { generateSpeech } from './services/geminiService';
import { audioBufferToWav, audioBufferToMp3 } from './services/audioUtils';
import { Mic, Code, Play, Download, Loader2, Volume2, User, StopCircle } from 'lucide-react';

const DEFAULT_TEXT_AR = "مرحباً بكم في العرض التوضيحي لمولد الصوت بالذكاء الاصطناعي. يمكننا التحدث بلهجات متعددة.";

type PreviewStatus = {
  id: string;
  status: 'loading' | 'playing';
} | null;

export default function App() {
  // State
  const [text, setText] = useState<string>(DEFAULT_TEXT_AR);
  const [isAdvancedMode, setIsAdvancedMode] = useState<boolean>(false);
  const [selectedVoice, setSelectedVoice] = useState<VoiceOption>(AVAILABLE_VOICES[0]);
  const [selectedDialect, setSelectedDialect] = useState<DialectOption>(SUPPORTED_DIALECTS[0]);
  const [settings, setSettings] = useState<VoiceSettings>({
    pitch: 0,
    speed: 1.0,
    emotion: EmotionType.Calm,
    clarity: 90
  });
  
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [wavUrl, setWavUrl] = useState<string | null>(null);
  const [mp3Url, setMp3Url] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Preview State
  const [previewState, setPreviewState] = useState<PreviewStatus>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  // Construct SSML based on settings
  const constructSSML = useCallback(() => {
    // If text is empty, return empty
    if (!text.trim()) return '';

    // Map emotion to prosody tweaks since standard SSML doesn't have a universal 'emotion' tag supported by all engines
    // We modify pitch/rate slightly for emotions if the user hasn't drastically overridden them
    let emotionPitchMod = 0;
    let emotionRateMod = 1.0;

    // These act as "presets" applied on top of user settings
    switch (settings.emotion) {
      case EmotionType.Happy:
        emotionPitchMod = 10;
        emotionRateMod = 1.1;
        break;
      case EmotionType.Sad:
        emotionPitchMod = -10;
        emotionRateMod = 0.85;
        break;
      case EmotionType.Energetic:
        emotionPitchMod = 5;
        emotionRateMod = 1.2;
        break;
      case EmotionType.Dramatic:
        emotionPitchMod = -5;
        emotionRateMod = 0.9;
        break;
      case EmotionType.Calm:
      default:
        break;
    }

    const finalPitch = settings.pitch + emotionPitchMod;
    const finalRate = settings.speed * emotionRateMod;

    // Sanitize text for XML
    const sanitizedText = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');

    return `
<speak version="1.1" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${selectedDialect.code}">
  <prosody rate="${finalRate.toFixed(2)}" pitch="${finalPitch > 0 ? '+' : ''}${finalPitch}%">
    ${sanitizedText}
  </prosody>
</speak>
    `.trim();
  }, [text, settings, selectedDialect]);

  const handlePreviewVoice = async (voice: VoiceOption, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent voice selection click

    // If currently previewing this voice, stop it
    if (previewState?.id === voice.id) {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current = null;
      }
      setPreviewState(null);
      return;
    }

    // Stop any existing audio
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
    }

    setPreviewState({ id: voice.id, status: 'loading' });

    try {
      const previewText = "أهلاً بك، هذا صوت تجريبي"; // "Welcome, this is a test voice"
      // Use SSML to ensure the correct dialect/lang code is sent
      const ssml = `<speak version="1.1" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${selectedDialect.code}">${previewText}</speak>`;

      const { audioBuffer } = await generateSpeech({
        text: ssml,
        voiceName: voice.geminiVoiceName,
        isSSML: true
      });

      const wavBlob = audioBufferToWav(audioBuffer);
      const url = URL.createObjectURL(wavBlob);
      const audio = new Audio(url);
      
      previewAudioRef.current = audio;
      
      audio.onended = () => {
        setPreviewState(null);
        previewAudioRef.current = null;
        URL.revokeObjectURL(url);
      };
      
      audio.onerror = () => {
        setPreviewState(null);
        previewAudioRef.current = null;
      };

      await audio.play();
      setPreviewState({ id: voice.id, status: 'playing' });

    } catch (err) {
      console.error("Preview failed:", err);
      setPreviewState(null);
      previewAudioRef.current = null;
    }
  };

  const handleGenerate = async () => {
    setError(null);
    setIsGenerating(true);
    // Cleanup previous URLs
    if (wavUrl) URL.revokeObjectURL(wavUrl);
    if (mp3Url) URL.revokeObjectURL(mp3Url);
    setWavUrl(null);
    setMp3Url(null);

    // Stop any preview audio if playing
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
      setPreviewState(null);
    }

    try {
      const payloadText = isAdvancedMode ? text : constructSSML();
      
      const { audioBuffer } = await generateSpeech({
        text: payloadText,
        voiceName: selectedVoice.geminiVoiceName,
        isSSML: true // We always send SSML (either constructed or raw)
      });

      // 1. Generate WAV
      const wavBlob = audioBufferToWav(audioBuffer);
      const wUrl = URL.createObjectURL(wavBlob);
      setWavUrl(wUrl);

      // 2. Generate MP3 (if available)
      try {
        const mp3Blob = audioBufferToMp3(audioBuffer);
        const mUrl = URL.createObjectURL(mp3Blob);
        setMp3Url(mUrl);
      } catch (mp3Err) {
        console.warn("MP3 Encoding failed:", mp3Err);
        // We do not fail the whole process if MP3 fails, just WAV is enough
      }

    } catch (err: any) {
      setError(err.message || "Failed to generate speech. Please check your API key and try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Cleanup object URLs on unmount or change
  useEffect(() => {
    return () => {
      if (wavUrl) URL.revokeObjectURL(wavUrl);
      if (mp3Url) URL.revokeObjectURL(mp3Url);
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current = null;
      }
    };
  }, [wavUrl, mp3Url]); // Clean up when URLs change to avoid leaks

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-8">
      
      {/* Header */}
      <header className="mb-10 text-center">
        <h1 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400 mb-2 font-arabic">
          HAMZA Hilal | Speech Studio
        </h1>
        <p className="text-gray-400 text-sm md:text-base">
          Professional Arabic Text-to-Speech Engine powered by Gemini
        </p>
      </header>

      {/* Step 1: Text Input */}
      <StepSection number={1} title="Enter Text">
        <div className="relative">
          <label className="block text-sm text-gray-400 mb-2 flex justify-between">
            <span>{isAdvancedMode ? "Raw SSML Input" : "Text to Convert"}</span>
            <span className="text-xs text-gray-500 uppercase tracking-wider">{selectedDialect.nativeLabel}</span>
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={isAdvancedMode ? "<speak>...</speak>" : "Type text here..."}
            className={`w-full h-40 bg-gray-950 border ${isAdvancedMode ? 'border-indigo-900 font-mono text-sm text-indigo-200' : 'border-gray-700 font-arabic text-lg text-white'} rounded-lg p-4 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all resize-none`}
            dir={isAdvancedMode ? "ltr" : "rtl"} // Arabic right-to-left for text
          />
          
          <div className="mt-4 flex items-center justify-between bg-gray-800/30 p-3 rounded-lg border border-gray-700/50">
            <div className="flex items-center gap-3">
              <Code size={18} className={isAdvancedMode ? "text-indigo-400" : "text-gray-500"} />
              <div className="flex flex-col">
                <span className="text-sm font-medium text-gray-200">Advanced Mode (SSML)</span>
                <span className="text-xs text-gray-500">Enable raw XML tagging control</span>
              </div>
            </div>
            <button 
              onClick={() => setIsAdvancedMode(!isAdvancedMode)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-900 ${isAdvancedMode ? 'bg-indigo-600' : 'bg-gray-700'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition transition-transform ${isAdvancedMode ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        </div>
      </StepSection>

      {/* Step 2: Voice & Dialect */}
      <StepSection number={2} title="Voice & Dialect">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Dialect Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-3">Target Dialect / Language</label>
            <div className="space-y-2">
              {SUPPORTED_DIALECTS.map(dialect => (
                <button
                  key={dialect.code}
                  onClick={() => setSelectedDialect(dialect)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border transition-all ${
                    selectedDialect.code === dialect.code
                      ? 'bg-indigo-900/40 border-indigo-500 text-indigo-100'
                      : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-750'
                  }`}
                >
                  <span className="text-sm font-medium">{dialect.label}</span>
                  <span className="text-xs font-arabic text-gray-500">{dialect.nativeLabel}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Voice Character Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-3">Voice Character</label>
            <div className="grid grid-cols-1 gap-2">
              {AVAILABLE_VOICES.map(voice => (
                <div
                  key={voice.id}
                  onClick={() => setSelectedVoice(voice)}
                  className={`relative flex items-center justify-between px-4 py-3 rounded-lg border transition-all cursor-pointer group ${
                    selectedVoice.id === voice.id
                      ? 'bg-purple-900/40 border-purple-500 text-purple-100 shadow-md'
                      : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-750'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${selectedVoice.id === voice.id ? 'bg-purple-800' : 'bg-gray-700'}`}>
                      <User size={16} />
                    </div>
                    <div className="flex flex-col items-start">
                      <span className="text-sm font-bold">{voice.name}</span>
                      <span className="text-xs opacity-70">{voice.gender} • {voice.type}</span>
                    </div>
                  </div>

                  {/* Preview Button */}
                  <button
                    onClick={(e) => handlePreviewVoice(voice, e)}
                    className={`p-2 rounded-full transition-colors z-10 hover:bg-white/10 ${
                      previewState?.id === voice.id ? 'text-indigo-400' : 'text-gray-500 hover:text-indigo-300'
                    }`}
                    title="Preview Voice"
                  >
                    {previewState?.id === voice.id ? (
                      previewState.status === 'loading' ? (
                        <Loader2 size={18} className="animate-spin" />
                      ) : (
                        <StopCircle size={18} />
                      )
                    ) : (
                      <Play size={18} />
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>

        </div>
      </StepSection>

      {/* Step 3: Settings */}
      <StepSection number={3} title="Fine-Tune Audio">
        <p className="text-sm text-gray-500 mb-4">
          {isAdvancedMode 
            ? "Settings are disabled in Advanced Mode. Use SSML tags in the text area to control pitch, rate, and breaks." 
            : "Adjust the parameters to shape the generated voice."}
        </p>
        <SettingsControls 
          settings={settings} 
          onChange={setSettings} 
          disabled={isAdvancedMode} 
        />
      </StepSection>

      {/* Step 4: Generate */}
      <div className="mb-12">
        <button
          onClick={handleGenerate}
          disabled={isGenerating || !text.trim()}
          className={`w-full py-5 rounded-xl font-bold text-lg flex items-center justify-center gap-3 shadow-xl transition-all transform hover:scale-[1.01] active:scale-[0.99]
            ${isGenerating 
              ? 'bg-gray-700 cursor-not-allowed text-gray-400' 
              : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white'
            }`}
        >
          {isGenerating ? (
            <>
              <Loader2 className="animate-spin" /> Generating High-Quality Audio...
            </>
          ) : (
            <>
              <Mic /> Generate Speech
            </>
          )}
        </button>

        {error && (
          <div className="mt-4 p-4 bg-red-900/30 border border-red-800 text-red-300 rounded-lg text-center text-sm">
            {error}
          </div>
        )}
      </div>

      {/* Step 5: Output */}
      {wavUrl && (
        <div className="fixed bottom-0 left-0 w-full bg-gray-900/95 backdrop-blur-lg border-t border-gray-800 p-4 md:p-6 shadow-2xl z-50 animate-slide-up">
          <div className="max-w-3xl mx-auto flex flex-col md:flex-row items-center gap-6">
            
            {/* Player Info */}
            <div className="hidden md:flex flex-col">
              <span className="text-indigo-400 text-xs font-bold uppercase tracking-wider">Ready to play</span>
              <span className="text-white font-medium text-sm truncate w-32">Generated Audio</span>
            </div>

            {/* Audio Element */}
            <audio 
              src={wavUrl} 
              controls 
              autoPlay 
              className="w-full h-10 outline-none accent-indigo-500"
              style={{ filter: 'invert(0.9)' }} // Quick hack to make default audio player look dark-mode friendly
            />

            {/* Actions */}
            <div className="flex gap-3 w-full md:w-auto">
              <a 
                href={wavUrl} 
                download={`hamza-speech-${Date.now()}.wav`}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2 bg-gray-100 hover:bg-white text-gray-900 rounded-full font-semibold text-sm transition-colors"
              >
                <Download size={16} /> WAV
              </a>
              
              {mp3Url && (
                <a 
                  href={mp3Url} 
                  download={`hamza-speech-${Date.now()}.mp3`}
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full font-semibold text-sm transition-colors"
                >
                  <Download size={16} /> MP3
                </a>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Spacer for sticky footer */}
      <div className="h-24"></div>
    </div>
  );
}