import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import * as logger from "firebase-functions/logger";
import { GEMINI_API_KEY } from './config';

// Initialize the Google Generative AI with API key
const getGeminiClient = () => {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not defined in environment variables');
  }
  return new GoogleGenerativeAI(GEMINI_API_KEY);
};

/**
 * Builds a system prompt for AI typing test generation based on difficulty and length
 * @param difficulty The difficulty level of the test (Easy, Medium, Hard)
 * @param timeLimit The time limit for the test in seconds (30, 60, 120, 300)
 * @returns A formatted system prompt for the AI
 */
const buildSystemPrompt = (difficulty: string, timeLimit: number): string => {
  // Calculate target word count based on time limit
  // Following TEST_GENERATION_GUIDE.md specifications:
  // 30s ≈ 50 words, 1m ≈ 100 words, 2m ≈ 200 words, 5m ≈ 500 words
  let targetWordCount = 100; // Default
  
  if (timeLimit === 30) targetWordCount = 50;
  else if (timeLimit === 60) targetWordCount = 100;
  else if (timeLimit === 120) targetWordCount = 200;
  else if (timeLimit === 300) targetWordCount = 500;
  
  const basePrompt = `You are an expert typing coach creating engaging typing tests for users to practice their typing skills. Your goal is to generate professional, educational, and engaging content.

CRITICAL REQUIREMENTS:
- Generate EXACTLY ~${targetWordCount} words (${targetWordCount-10}-${targetWordCount+10} words acceptable range)
- Content must be a single continuous paragraph with NO line breaks or special formatting
- Use proper punctuation, grammar, and natural sentence flow
- Content should be educational and informative about the given topic
- Avoid repetitive phrases or words
- Include varied sentence lengths for interesting typing practice`;

  let difficultyInstructions = "";
  
  // Add difficulty-specific instructions
  switch (difficulty) {
    case 'Easy':
      difficultyInstructions = `

DIFFICULTY LEVEL: EASY
- Use simple vocabulary and straightforward sentence structures
- Focus on common words and basic concepts
- Minimize technical jargon and complex terminology
- Keep sentences shorter and more direct
- Target a general audience with no specialized knowledge`;
      break;
    
    case 'Medium':
      difficultyInstructions = `

DIFFICULTY LEVEL: MEDIUM
- Use moderate vocabulary with some specialized terms
- Include a mix of simple and complex sentence structures
- Incorporate some industry-specific terminology
- Balance between accessibility and professional language
- Target an audience with basic familiarity of the subject`;
      break;
    
    case 'Hard':
      difficultyInstructions = `

DIFFICULTY LEVEL: HARD
- Use advanced vocabulary and professional terminology
- Include complex sentence structures with varied punctuation
- Incorporate specialized jargon and technical concepts
- Present nuanced ideas and sophisticated reasoning
- Target an audience with professional knowledge of the subject`;
      break;
    
    default:
      difficultyInstructions = `

DIFFICULTY LEVEL: MEDIUM
- Use moderate vocabulary with some specialized terms
- Include a mix of simple and complex sentence structures
- Incorporate some industry-specific terminology
- Balance between accessibility and professional language
- Target an audience with basic familiarity of the subject`;
  }
  
  return basePrompt + difficultyInstructions;
};

/**
 * Generates typing test content using Gemini AI
 * @param topic The topic for the typing test
 * @param difficulty The difficulty level (Easy, Medium, Hard)
 * @param timeLimit The time limit in seconds (30, 60, 120, 300)
 * @returns Generated text for typing practice
 */
export const generateTypingText = async (
  topic: string,
  difficulty: string,
  timeLimit: number,
  userInterests: string[] = []
): Promise<string> => {
  try {
    logger.debug("🔍 DEBUG: Initializing Gemini client", {
      apiKeyExists: !!GEMINI_API_KEY,
      apiKeyLength: GEMINI_API_KEY?.length || 0,
      topic,
      difficulty,
      timeLimit,
      userInterests: userInterests.length > 0 ? userInterests : 'none'
    });
    
    const genAI = getGeminiClient();
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    
    const prompt = buildSystemPrompt(difficulty, timeLimit);
    
    logger.debug("🔍 DEBUG: Sending request to Gemini", {
      promptLength: prompt.length,
      topic,
      difficulty,
      timeLimit,
      userInterests: userInterests.length > 0 ? userInterests : 'none'
    });
    
    // Prepare user interests context if available
    const userInterestsContext = userInterests && userInterests.length > 0 
      ? `\n\nUSER INTERESTS: ${userInterests.join(', ')}\n\nIf possible, relate the content to these interests while staying on topic.` 
      : '';

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: `${prompt}\n\nTOPIC: ${topic}${userInterestsContext}\n\nGenerate a typing test about this topic:` }] }],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
      },
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
      ],
    });

    const response = result.response;
    const text = response.text();
    
    logger.debug("✅ DEBUG: Received response from Gemini", {
      responseLength: text.length,
      responsePreview: text.substring(0, 50) + '...'
    });
    
    // Clean up any potential formatting issues
    return text.trim().replace(/\n+/g, ' ').replace(/\s+/g, ' ');
  } catch (error) {
    logger.error("🚨 DEBUG: Error generating typing text with Gemini:", error);
    throw new Error(`Failed to generate typing text: ${error instanceof Error ? error.message : String(error)}`);
  }
};