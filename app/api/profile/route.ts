import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.uid || !body.email) {
      return NextResponse.json(
        { error: 'Missing required fields: uid and email' },
        { status: 400 }
      );
    }

    // Check if profile already exists
    const profileRef = db.collection('profiles').doc(body.uid);
    const existingProfile = await profileRef.get();
    
    if (existingProfile.exists) {
      return NextResponse.json(
        { error: 'Profile already exists for this user' },
        { status: 409 }
      );
    }

    // Create the profile document
    const profileData = {
      uid: body.uid,
      email: body.email,
      username: body.username || body.email.split('@')[0],
      bio: body.bio || '',
      preferredThemeId: body.preferredThemeId || 'default',
      preferredFontId: body.preferredFontId || 'fira-code',
      settings: {
        keyboardSounds: body.settings?.keyboardSounds ?? true,
        visualFeedback: body.settings?.visualFeedback ?? true,
        autoSaveAiTests: body.settings?.autoSaveAiTests ?? false
      },
      stats: {
        rank: body.stats?.rank || 'E',
        avgAcc: body.stats?.avgAcc || 0,
        avgWpm: body.stats?.avgWpm || 0,
        testsCompleted: body.stats?.testsCompleted || 0
      },
      bestWpm: body.bestWpm || 0,
      testsCompleted: body.testsCompleted || 0,
      averageAccuracy: body.averageAccuracy || 0,
      createdAt: body.createdAt || new Date().toISOString()
    };

    await profileRef.set(profileData);

    return NextResponse.json({
      success: true,
      message: 'Profile created successfully',
      profile: profileData
    });

  } catch (error) {
    console.error('Error creating profile:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}