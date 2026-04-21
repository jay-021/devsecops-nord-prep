import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load environment variables from .env file
const envPath = path.resolve(__dirname, '../.env');

if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
  console.log('Environment variables loaded from:', envPath);
} else {
  console.warn('No .env file found at:', envPath);
  // Try to load from parent directory (project root)
  const rootEnvPath = path.resolve(__dirname, '../../.env.local');
  if (fs.existsSync(rootEnvPath)) {
    dotenv.config({ path: rootEnvPath });
    console.log('Environment variables loaded from root:', rootEnvPath);
  } else {
    console.warn('No .env.local file found at root:', rootEnvPath);
  }
}

// Export environment variables
// For Firebase Functions v2, try multiple sources for the API key
export const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 
  process.env.GOOGLE_GENAI_API_KEY;

// Validate required environment variables
if (!GEMINI_API_KEY) {
  console.warn('GEMINI_API_KEY is not defined in environment variables');
} else {
  console.log('GEMINI_API_KEY loaded successfully');
}