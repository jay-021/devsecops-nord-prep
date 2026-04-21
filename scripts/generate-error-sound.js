/**
 * Generate a simple error beep sound
 * Creates a short, descending tone (440Hz to 220Hz over 150ms)
 * Saves as WAV file
 */

const fs = require('fs');
const path = require('path');

// WAV file parameters
const SAMPLE_RATE = 44100;
const DURATION = 0.15; // 150ms
const START_FREQ = 440; // A4
const END_FREQ = 220;   // A3 (one octave down)
const SAMPLES = Math.floor(SAMPLE_RATE * DURATION);

// Generate samples for descending tone
const samples = [];
for (let i = 0; i < SAMPLES; i++) {
  const progress = i / SAMPLES;
  // Frequency sweep from START_FREQ to END_FREQ
  const freq = START_FREQ + (END_FREQ - START_FREQ) * progress;
  // Generate sine wave
  const sample = Math.sin(2 * Math.PI * freq * i / SAMPLE_RATE);
  // Apply envelope (fade in/out) to avoid clicks
  const envelope = Math.sin(Math.PI * progress);
  // Convert to 16-bit PCM
  const pcm = Math.floor(sample * envelope * 32767 * 0.5); // 50% volume
  samples.push(pcm);
}

// Create WAV file buffer
function createWavBuffer(samples) {
  const numChannels = 1; // Mono
  const bitsPerSample = 16;
  const byteRate = SAMPLE_RATE * numChannels * bitsPerSample / 8;
  const blockAlign = numChannels * bitsPerSample / 8;
  const dataSize = samples.length * 2; // 2 bytes per sample (16-bit)
  
  const buffer = Buffer.alloc(44 + dataSize);
  let offset = 0;
  
  // RIFF header
  buffer.write('RIFF', offset); offset += 4;
  buffer.writeUInt32LE(36 + dataSize, offset); offset += 4;
  buffer.write('WAVE', offset); offset += 4;
  
  // fmt chunk
  buffer.write('fmt ', offset); offset += 4;
  buffer.writeUInt32LE(16, offset); offset += 4; // fmt chunk size
  buffer.writeUInt16LE(1, offset); offset += 2;  // audio format (1 = PCM)
  buffer.writeUInt16LE(numChannels, offset); offset += 2;
  buffer.writeUInt32LE(SAMPLE_RATE, offset); offset += 4;
  buffer.writeUInt32LE(byteRate, offset); offset += 4;
  buffer.writeUInt16LE(blockAlign, offset); offset += 2;
  buffer.writeUInt16LE(bitsPerSample, offset); offset += 2;
  
  // data chunk
  buffer.write('data', offset); offset += 4;
  buffer.writeUInt32LE(dataSize, offset); offset += 4;
  
  // Write samples
  for (const sample of samples) {
    buffer.writeInt16LE(sample, offset);
    offset += 2;
  }
  
  return buffer;
}

const wavBuffer = createWavBuffer(samples);

// Save to public/sounds/error.wav
const outputPath = path.join(__dirname, '..', 'public', 'sounds', 'error.wav');
fs.writeFileSync(outputPath, wavBuffer);

console.log(`✅ Generated error sound: ${outputPath}`);
console.log(`   Duration: ${DURATION * 1000}ms`);
console.log(`   Frequency: ${START_FREQ}Hz → ${END_FREQ}Hz`);
console.log(`   File size: ${(wavBuffer.length / 1024).toFixed(2)} KB`);
