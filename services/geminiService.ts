import { GoogleGenAI, Modality } from "@google/genai";
import { base64ToArrayBuffer, pcmToAudioBuffer } from "./audioUtils";

const API_KEY = process.env.API_KEY || '';

export interface TTSRequest {
  text: string;
  voiceName: string;
  isSSML: boolean;
}

export const generateSpeech = async (request: TTSRequest): Promise<{ audioBuffer: AudioBuffer, base64: string }> => {
  if (!API_KEY) {
    throw new Error("API Key is missing. Please ensure process.env.API_KEY is available.");
  }

  const ai = new GoogleGenAI({ apiKey: API_KEY });
  
  // Clean SSML if needed, or pass text directly
  const contentText = request.text;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: contentText }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: request.voiceName },
          },
        },
      },
    });

    const candidate = response.candidates?.[0];
    const audioPart = candidate?.content?.parts?.find(p => p.inlineData);

    if (!audioPart || !audioPart.inlineData || !audioPart.inlineData.data) {
      throw new Error("No audio data returned from Gemini.");
    }

    const base64Audio = audioPart.inlineData.data;
    
    // Decode logic
    const arrayBuffer = base64ToArrayBuffer(base64Audio);
    
    // Gemini returns raw PCM data, not a WAV file.
    // Standard web decodeAudioData expects a file header (WAV/MP3).
    // We must manually convert the raw PCM samples into an AudioBuffer.
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Gemini 2.5 Flash TTS uses 24kHz sample rate for audio output
    const audioBuffer = pcmToAudioBuffer(arrayBuffer, audioContext, 24000);

    return { audioBuffer, base64: base64Audio };

  } catch (error) {
    console.error("Gemini TTS Error:", error);
    throw error;
  }
};