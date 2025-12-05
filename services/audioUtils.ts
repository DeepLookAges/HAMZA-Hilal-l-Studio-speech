// Utility to convert Base64 to ArrayBuffer
export const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
};

// Convert raw PCM (Int16) data to an AudioBuffer
export const pcmToAudioBuffer = (
  buffer: ArrayBuffer, 
  ctx: AudioContext, 
  sampleRate: number = 24000
): AudioBuffer => {
  // Create Int16 view of the raw buffer
  const pcm16 = new Int16Array(buffer);
  
  // Create Float32 buffer for AudioContext
  const float32 = new Float32Array(pcm16.length);
  
  // Convert Int16 [-32768, 32767] to Float32 [-1.0, 1.0]
  for (let i = 0; i < pcm16.length; i++) {
    float32[i] = pcm16[i] / 32768.0;
  }
  
  // Create the AudioBuffer
  // Mono channel (1) is standard for current TTS models
  const audioBuffer = ctx.createBuffer(1, float32.length, sampleRate);
  audioBuffer.copyToChannel(float32, 0);
  
  return audioBuffer;
};

// Simple WAV encoder
export const audioBufferToWav = (buffer: AudioBuffer): Blob => {
  const numOfChan = buffer.numberOfChannels;
  const length = buffer.length * numOfChan * 2 + 44;
  const bufferArray = new ArrayBuffer(length);
  const view = new DataView(bufferArray);
  const channels = [];
  let i;
  let sample;
  let offset = 0;
  let pos = 0;

  // write WAVE header
  setUint32(0x46464952); // "RIFF"
  setUint32(length - 8); // file length - 8
  setUint32(0x45564157); // "WAVE"

  setUint32(0x20746d66); // "fmt " chunk
  setUint32(16); // length = 16
  setUint16(1); // PCM (uncompressed)
  setUint16(numOfChan);
  setUint32(buffer.sampleRate);
  setUint32(buffer.sampleRate * 2 * numOfChan); // avg. bytes/sec
  setUint16(numOfChan * 2); // block-align
  setUint16(16); // 16-bit (hardcoded in this encoder)

  setUint32(0x61746164); // "data" - chunk
  setUint32(length - pos - 4); // chunk length

  // write interleaved data
  for (i = 0; i < buffer.numberOfChannels; i++)
    channels.push(buffer.getChannelData(i));

  while (pos < buffer.length) {
    for (i = 0; i < numOfChan; i++) {
      // interleave channels
      sample = Math.max(-1, Math.min(1, channels[i][pos])); // clamp
      sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0; // scale to 16-bit signed int
      view.setInt16(44 + offset, sample, true);
      offset += 2;
    }
    pos++;
  }

  return new Blob([bufferArray], { type: "audio/wav" });

  function setUint16(data: number) {
    view.setUint16(pos, data, true);
    pos += 2;
  }

  function setUint32(data: number) {
    view.setUint32(pos, data, true);
    pos += 4;
  }
};

// Declare global lamejs
declare const lamejs: any;

// MP3 Encoder using lamejs
export const audioBufferToMp3 = (buffer: AudioBuffer): Blob => {
  if (typeof lamejs === 'undefined') {
    throw new Error("MP3 encoder library (lamejs) not loaded.");
  }

  const channels = 1; // Assuming mono for TTS
  const sampleRate = buffer.sampleRate;
  const kbps = 128;
  
  const mp3encoder = new lamejs.Mp3Encoder(channels, sampleRate, kbps);
  const mp3Data = [];
  
  // Get raw float samples
  const rawData = buffer.getChannelData(0);
  
  // Convert float samples to Int16
  const samples = new Int16Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    // Clamp values between -1 and 1
    const s = Math.max(-1, Math.min(1, rawData[i]));
    // Scale to 16-bit integer range
    samples[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  
  // Encode in blocks
  const blockSize = 1152;
  for (let i = 0; i < samples.length; i += blockSize) {
    const chunk = samples.subarray(i, i + blockSize);
    const mp3buf = mp3encoder.encodeBuffer(chunk);
    if (mp3buf.length > 0) {
      mp3Data.push(mp3buf);
    }
  }
  
  // Flush the encoder
  const mp3buf = mp3encoder.flush();
  if (mp3buf.length > 0) {
    mp3Data.push(mp3buf);
  }
  
  return new Blob(mp3Data, { type: 'audio/mp3' });
};
