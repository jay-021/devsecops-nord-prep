import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { UserProfile } from '../types/database';

// Initialize the Google Generative AI with API key
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY;
  
  if (!apiKey) {
    console.error('Gemini API Key not found in environment variables');
    throw new Error('GEMINI_API_KEY is not defined in environment variables');
  }
  
  console.log('Initializing Gemini client with API key length:', apiKey.length);
  return new GoogleGenerativeAI(apiKey);
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
- Use everyday language accessible to most readers`;
      break;
    case 'Medium':
      difficultyInstructions = `

DIFFICULTY LEVEL: MEDIUM
- Use moderate vocabulary with some professional terminology
- Include occasional complex sentence structures
- Incorporate some field-specific terminology and concepts
- Balance between accessibility and professional language
- Present moderately complex ideas and relationships`;
      break;
    case 'Hard':
      difficultyInstructions = `

DIFFICULTY LEVEL: HARD
- Use sophisticated vocabulary and complex sentence structures
- Include advanced professional terminology and specialized jargon
- Incorporate technical concepts and detailed explanations
- Use varied punctuation and challenging word patterns
- Present complex ideas with precise, domain-specific language`;
      break;
    default:
      difficultyInstructions = `

DIFFICULTY LEVEL: MEDIUM
- Use moderate vocabulary with some professional terminology
- Include occasional complex sentence structures
- Incorporate some field-specific terminology and concepts
- Balance between accessibility and professional language
- Present moderately complex ideas and relationships`;
  }

  return basePrompt + difficultyInstructions;
};

/**
 * Generates typing test content using Gemini 2.5 Pro Flash API
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
    const genAI = getGeminiClient();
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    
    const prompt = buildSystemPrompt(difficulty, timeLimit);
    
    // Prepare user interests context if available
    let userInterestsContext = '';
    if (userInterests && userInterests.length > 0) {
      userInterestsContext = `\n\nUSER INTERESTS: ${userInterests.join(', ')}\n\nConsider incorporating elements related to these interests if they can naturally connect with the main topic.`;
    }
    
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
    
    // Clean up any potential formatting issues
    return text.trim().replace(/\n+/g, ' ').replace(/\s+/g, ' ');
  } catch (error) {
    console.error('Error generating typing text with Gemini:', error);
    throw new Error(`Failed to generate typing text: ${error instanceof Error ? error.message : String(error)}`);
  }
};

/**
 * Analyzes typing performance and provides feedback
 * @param testResults The results of a typing test
 * @returns Analysis and feedback for the user
 */
export const analyzeTypingPerformance = async (testResults: any): Promise<string> => {
  // TODO: Implement performance analysis with Gemini
  return 'Performance analysis feature coming soon!';
};

/**
 * Generates personalized content based on user profile
 * @param userProfile The user's profile data
 * @returns Personalized typing content
 */
export const generatePersonalizedContent = async (userProfile: UserProfile): Promise<string> => {
  // TODO: Implement personalized content generation
  return 'Personalized content feature coming soon!';
};
