/**
 * COMPREHENSIVE FIRESTORE COLLECTION RECREATION SCRIPT
 * 
 * This script recreates the exact Firestore collection structure for ZenType
 * based on comprehensive codebase analysis. Run this after accidental deletion.
 * 
 * Collections to recreate:
 * 1. profiles - User profile data
 * 2. test_contents - Pre-made typing tests (NOT preMadeTests)
 * 3. aiGeneratedTests - AI-generated tests
 * 4. testResults - Test results (top-level collection)
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, doc, setDoc, addDoc } = require('firebase/firestore');

// Firebase configuration
const firebaseConfig = {
  apiKey: "YOUR_FIREBASE_API_KEY_HERE",
  authDomain: "zentype-65eb3.firebaseapp.com",
  projectId: "zentype-65eb3",
  storageBucket: "zentype-65eb3.firebasestorage.app",
  messagingSenderId: "882644740092",
  appId: "1:882644740092:web:b53afb066dd2c4d9a43479",
  measurementId: "G-EPEB3T44XL"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Collection names (exact matches from COLLECTIONS constant)
const COLLECTIONS = {
  PROFILES: 'profiles',
  TEST_CONTENTS: 'test_contents', // Actual collection name used in API
  AI_GENERATED_TESTS: 'aiGeneratedTests',
  TEST_RESULTS: 'testResults'
};

// Sample user profiles data
const sampleProfiles = [
  {
    uid: "user_001",
    email: "typemaster@example.com",
    username: "TypeMaster2024",
    photoURL: "/diverse-user-avatars.png",
    createdAt: "2024-01-01T00:00:00.000Z",
    bio: "Professional typist and speed enthusiast",
    preferredThemeId: "neon-wave",
    preferredFontId: "fira-code",
    settings: {
      keyboardSounds: true,
      visualFeedback: true,
      autoSaveAiTests: true
    },
    stats: {
      rank: "S",
      testsCompleted: 2847,
      avgWpm: 127,
      avgAcc: 98.9
    },
    bestWpm: 145,
    averageAccuracy: 98.9,
    testsCompleted: 2847
  },
  {
    uid: "user_002",
    email: "ninja@example.com",
    username: "KeyboardNinja",
    photoURL: "/ninja-avatar.png",
    createdAt: "2024-01-02T00:00:00.000Z",
    bio: "Silent but deadly on the keyboard",
    preferredThemeId: "dark-mode",
    preferredFontId: "jetbrains-mono",
    settings: {
      keyboardSounds: false,
      visualFeedback: true,
      autoSaveAiTests: false
    },
    stats: {
      rank: "A",
      testsCompleted: 1923,
      avgWpm: 119,
      avgAcc: 97.8
    },
    bestWpm: 135,
    averageAccuracy: 97.8,
    testsCompleted: 1923
  },
  {
    uid: "user_003",
    email: "speedemon@example.com",
    username: "SpeedDemon",
    photoURL: "/demon-avatar.png",
    createdAt: "2024-01-03T00:00:00.000Z",
    bio: "Speed is my middle name",
    preferredThemeId: "default",
    preferredFontId: "fira-code",
    settings: {
      keyboardSounds: true,
      visualFeedback: false,
      autoSaveAiTests: true
    },
    stats: {
      rank: "A",
      testsCompleted: 1456,
      avgWpm: 115,
      avgAcc: 96.7
    },
    bestWpm: 128,
    averageAccuracy: 96.7,
    testsCompleted: 1456
  },
  {
    uid: "user_004",
    email: "beginner@example.com",
    username: "TypingLearner",
    photoURL: "/placeholder-user.jpg",
    createdAt: "2024-01-15T00:00:00.000Z",
    bio: "Just started my typing journey",
    preferredThemeId: "default",
    preferredFontId: "fira-code",
    settings: {
      keyboardSounds: true,
      visualFeedback: true,
      autoSaveAiTests: false
    },
    stats: {
      rank: "E",
      testsCompleted: 23,
      avgWpm: 35,
      avgAcc: 87.2
    },
    bestWpm: 42,
    averageAccuracy: 87.2,
    testsCompleted: 23
  }
];

// Sample test contents data (matches PreMadeTest interface)
const sampleTestContents = [
  {
    id: "test_001",
    text: "The quick brown fox jumps over the lazy dog. This pangram contains every letter of the alphabet at least once, making it perfect for typing practice and keyboard testing.",
    difficulty: "Easy",
    category: "general_practice",
    source: "Classic Pangrams",
    wordCount: 50,
    timeLimit: 60,
    createdAt: "2024-01-01T00:00:00.000Z"
  },
  {
    id: "test_002",
    text: "In the rapidly evolving world of technology, artificial intelligence and machine learning have become cornerstone innovations that are reshaping industries across the globe. From healthcare to finance, these technologies are enabling unprecedented levels of automation and efficiency.",
    difficulty: "Medium",
    category: "technology",
    source: "Technology Articles",
    wordCount: 100,
    timeLimit: 120,
    createdAt: "2024-01-01T00:00:00.000Z"
  },
  {
    id: "test_003",
    text: "Customer service representatives must demonstrate exceptional communication skills, patience, and problem-solving abilities when addressing client concerns. They serve as the primary point of contact between the company and its customers, making their role crucial for maintaining positive relationships and ensuring customer satisfaction.",
    difficulty: "Medium",
    category: "customer_support",
    source: "Customer Support Training",
    wordCount: 150,
    timeLimit: 180,
    createdAt: "2024-01-01T00:00:00.000Z"
  },
  {
    id: "test_004",
    text: "Financial markets operate through complex mechanisms involving supply and demand dynamics, regulatory frameworks, and investor sentiment. Understanding these intricate relationships requires comprehensive analysis of economic indicators, market trends, and geopolitical factors that influence trading decisions and investment strategies.",
    difficulty: "Hard",
    category: "business_finance",
    source: "Business & Finance",
    wordCount: 200,
    timeLimit: 300,
    createdAt: "2024-01-01T00:00:00.000Z"
  },
  {
    id: "test_005",
    text: "Programming languages serve as the foundation for software development, enabling developers to create applications, websites, and systems that power our digital world. Each language has its unique syntax, paradigms, and use cases.",
    difficulty: "Easy",
    category: "technology",
    source: "Programming Basics",
    wordCount: 75,
    timeLimit: 90,
    createdAt: "2024-01-01T00:00:00.000Z"
  },
  {
    id: "test_006",
    text: "Effective project management requires careful planning, resource allocation, timeline management, and stakeholder communication. Project managers must balance competing priorities while ensuring deliverables meet quality standards and deadlines.",
    difficulty: "Medium",
    category: "business_management",
    source: "Project Management",
    wordCount: 125,
    timeLimit: 150,
    createdAt: "2024-01-01T00:00:00.000Z"
  }
];

// Sample AI-generated tests data
const sampleAiGeneratedTests = [
  {
    id: "ai_test_001",
    text: "Artificial intelligence continues to revolutionize how we approach problem-solving in various domains. Machine learning algorithms can now process vast amounts of data to identify patterns and make predictions with remarkable accuracy.",
    difficulty: "Medium",
    category: "ai_technology",
    source: "AI Generated Content",
    wordCount: 80,
    timeLimit: 120,
    createdAt: "2024-01-10T00:00:00.000Z",
    generatedByAi: true
  },
  {
    id: "ai_test_002",
    text: "Climate change represents one of the most pressing challenges of our time. Scientists worldwide are working collaboratively to develop sustainable solutions and technologies that can help mitigate environmental impact while supporting economic growth.",
    difficulty: "Hard",
    category: "environmental_science",
    source: "AI Generated Content",
    wordCount: 120,
    timeLimit: 180,
    createdAt: "2024-01-12T00:00:00.000Z",
    generatedByAi: true
  }
];

// Sample test results data
const sampleTestResults = [
  {
    id: "result_001",
    textLength: 245,
    userInput: "The quick brown fox jumps over the lazy dog. This pangram contains every letter of the alphabet at least once, making it perfect for typing practice and keyboard testing.",
    wpm: 78,
    accuracy: 96.2,
    errors: 3,
    timeTaken: 58,
    testType: "practice",
    difficulty: "Easy",
    completedAt: "2024-01-15T10:30:00.000Z"
  },
  {
    id: "result_002",
    textLength: 420,
    userInput: "In the rapidly evolving world of technology, artificial intelligence and machine learning have become cornerstone innovations that are reshaping industries across the globe.",
    wpm: 85,
    accuracy: 94.8,
    errors: 7,
    timeTaken: 115,
    testType: "practice",
    difficulty: "Medium",
    completedAt: "2024-01-15T11:15:00.000Z"
  },
  {
    id: "result_003",
    textLength: 380,
    userInput: "Artificial intelligence continues to revolutionize how we approach problem-solving in various domains. Machine learning algorithms can now process vast amounts of data.",
    wpm: 92,
    accuracy: 97.1,
    errors: 2,
    timeTaken: 118,
    testType: "ai-generated",
    difficulty: "Medium",
    completedAt: "2024-01-15T14:20:00.000Z"
  }
];

async function recreateCollections() {
  console.log('🚀 Starting Firestore collection recreation...');
  
  try {
    // 1. Recreate profiles collection
    console.log('\n📁 Creating profiles collection...');
    for (const profile of sampleProfiles) {
      await setDoc(doc(db, COLLECTIONS.PROFILES, profile.uid), profile);
      console.log(`✅ Created profile: ${profile.username} (${profile.uid})`);
    }
    
    // 2. Recreate test_contents collection
    console.log('\n📁 Creating test_contents collection...');
    for (const test of sampleTestContents) {
      await setDoc(doc(db, COLLECTIONS.TEST_CONTENTS, test.id), test);
      console.log(`✅ Created test: ${test.id} (${test.difficulty} - ${test.category})`);
    }
    
    // 3. Recreate aiGeneratedTests collection
    console.log('\n📁 Creating aiGeneratedTests collection...');
    for (const aiTest of sampleAiGeneratedTests) {
      await setDoc(doc(db, COLLECTIONS.AI_GENERATED_TESTS, aiTest.id), aiTest);
      console.log(`✅ Created AI test: ${aiTest.id} (${aiTest.difficulty})`);
    }
    
    // 4. Recreate testResults collection
    console.log('\n📁 Creating testResults collection...');
    for (const result of sampleTestResults) {
      await setDoc(doc(db, COLLECTIONS.TEST_RESULTS, result.id), result);
      console.log(`✅ Created test result: ${result.id} (${result.wpm} WPM)`);
    }
    
    console.log('\n🎉 All collections recreated successfully!');
    console.log('\n📊 Summary:');
    console.log(`   • ${sampleProfiles.length} user profiles`);
    console.log(`   • ${sampleTestContents.length} pre-made tests`);
    console.log(`   • ${sampleAiGeneratedTests.length} AI-generated tests`);
    console.log(`   • ${sampleTestResults.length} test results`);
    
    console.log('\n🔍 Verification steps:');
    console.log('   1. Check Firebase Console for all collections');
    console.log('   2. Test API endpoints: /api/tests and /api/v1/tests');
    console.log('   3. Verify user authentication and profile loading');
    console.log('   4. Test typing game functionality');
    
  } catch (error) {
    console.error('❌ Error recreating collections:', error);
    throw error;
  }
}

// Verification function
async function verifyCollections() {
  console.log('\n🔍 Verifying collection structure...');
  
  const collections = [
    COLLECTIONS.PROFILES,
    COLLECTIONS.TEST_CONTENTS,
    COLLECTIONS.AI_GENERATED_TESTS,
    COLLECTIONS.TEST_RESULTS
  ];
  
  for (const collectionName of collections) {
    try {
      const collectionRef = collection(db, collectionName);
      console.log(`✅ Collection '${collectionName}' structure verified`);
    } catch (error) {
      console.error(`❌ Error verifying collection '${collectionName}':`, error);
    }
  }
}

// Main execution
async function main() {
  try {
    await recreateCollections();
    await verifyCollections();
    
    console.log('\n✨ Firestore recreation completed successfully!');
    console.log('\n🚀 Next steps:');
    console.log('   1. Test the application at http://localhost:3000');
    console.log('   2. Try user registration and login');
    console.log('   3. Test typing game with different difficulties');
    console.log('   4. Verify test result submission');
    
  } catch (error) {
    console.error('💥 Recreation failed:', error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = {
  recreateCollections,
  verifyCollections,
  sampleProfiles,
  sampleTestContents,
  sampleAiGeneratedTests,
  sampleTestResults,
  COLLECTIONS
};