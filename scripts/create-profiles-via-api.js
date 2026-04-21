// scripts/create-profiles-via-api.js
// Script to create profiles for existing Firebase Auth users via API calls

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const API_BASE_URL = 'http://localhost:3000/api';

// Users that need profiles created (from Firebase Auth list)
const usersNeedingProfiles = [
  {
    uid: 'DUjv70lYneMYuvPCRy27zLE98Wf2',
    email: 'test1@test.com'
  },
  {
    uid: 'wJae26XQ1NZD4xqbLsS650v7qZa2', 
    email: 'solo@solo.com'
  }
];

async function createProfileViaAPI(user) {
  try {
    console.log(`🔄 Creating profile for ${user.email} (${user.uid})`);
    
    // Create profile data
    const profileData = {
      uid: user.uid,
      email: user.email,
      username: user.email.split('@')[0], // Use email prefix as username
      bio: '',
      preferredThemeId: 'default',
      preferredFontId: 'fira-code',
      settings: {
        keyboardSounds: true,
        visualFeedback: true,
        autoSaveAiTests: false
      },
      stats: {
        rank: 'E',
        avgAcc: 0,
        avgWpm: 0,
        testsCompleted: 0
      },
      bestWpm: 0,
      testsCompleted: 0,
      averageAccuracy: 0,
      createdAt: new Date().toISOString()
    };

    // Make API call to create profile
    const response = await fetch(`${API_BASE_URL}/profile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(profileData)
    });

    if (response.ok) {
      const result = await response.json();
      console.log(`✅ Profile created successfully for ${user.email}`);
      return result;
    } else {
      const error = await response.text();
      console.error(`❌ Failed to create profile for ${user.email}: ${error}`);
      return null;
    }
  } catch (error) {
    console.error(`💥 Error creating profile for ${user.email}:`, error.message);
    return null;
  }
}

async function createMissingProfiles() {
  console.log('🚀 Starting to create missing profiles...\n');
  
  for (const user of usersNeedingProfiles) {
    await createProfileViaAPI(user);
    console.log(''); // Add spacing between users
  }
  
  console.log('✨ Profile creation process completed!');
}

// Run the script
createMissingProfiles().catch(console.error);