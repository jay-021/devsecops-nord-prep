// context/AuthProvider.tsx
"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase/client';
import { UserProfile, COLLECTIONS } from '@/lib/types/database';
import { getUserProfile, createUserProfile } from '@/lib/firebase/firestore';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Default to true to prevent hydration errors

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      console.log("Auth state changed:", currentUser?.uid);
      
      // Clean up previous profile listener if it exists
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }

      setUser(currentUser);
      
      if (currentUser) {
        console.log("🔐 AuthProvider - User authenticated:", currentUser.uid);
        
        try {
          // Try to get existing profile
          console.log("🔍 AuthProvider - Fetching profile...");
          let profile = await getUserProfile(currentUser.uid);
          
          if (profile) {
            console.log("✅ AuthProvider - Profile found and loaded:", profile);
            setProfile(profile);
          } else {
            console.log("❌ AuthProvider - No profile found, CREATING ONE NOW!");
            // If user is authenticated but no profile exists, create one immediately
            try {
              const newProfile = await createUserProfile(
                currentUser.uid,
                currentUser.email,
                currentUser.displayName || currentUser.email?.split('@')[0] || 'User',
                currentUser.photoURL || undefined  // Convert null to undefined
              );
              console.log("✅ AuthProvider - Emergency profile created:", newProfile);
              setProfile(newProfile);
            } catch (error) {
              console.error("💥 AuthProvider - Failed to create emergency profile:", error);
              setProfile(null);
            }
          }
          
          setIsLoading(false);
          console.log("🏁 AuthProvider - Initial loading complete");
          
          // Set up real-time listener for profile updates
          console.log("👂 AuthProvider - Setting up real-time listener...");
          const profileRef = doc(db, COLLECTIONS.PROFILES, currentUser.uid);
          unsubscribeProfile = onSnapshot(profileRef, (docSnap) => {
            console.log("📡 AuthProvider - Listener triggered, doc exists:", docSnap.exists());
            if (docSnap.exists()) {
              const profileData = docSnap.data() as UserProfile;
              console.log("✅ AuthProvider - Real-time update received:", profileData);
              setProfile(profileData);
            } else {
              console.log("❌ AuthProvider - Listener: Profile document doesn't exist");
              setProfile(null);
            }
          }, (error) => {
            console.error("💥 AuthProvider - Listener error:", error);
          });
          
        } catch (error) {
          console.error("💥 AuthProvider - Error handling user profile:", error);
          setProfile(null);
          setIsLoading(false);
        }
      } else {
        console.log("🚫 AuthProvider - No user authenticated");
        setProfile(null);
        setIsLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) {
        unsubscribeProfile();
      }
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
