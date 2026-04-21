'use client';

/**
 * Simple Mode Redirect Page
 * /test/simple
 * 
 * This page redirects to the main test configuration page with Simple Mode tab active.
 * Maintains backward compatibility for users with bookmarks or direct links to /test/simple.
 * 
 * The actual Simple Mode functionality is now integrated into /app/test/page.tsx as a tab.
 * This redirect ensures a seamless user experience without breaking existing links.
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function SimpleModeRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to main test page with Simple Mode tab active
    console.log('[Simple Mode Redirect] Redirecting to /test with simple tab');
    router.replace('/test?tab=simple');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Redirecting to Simple Mode...</p>
      </div>
    </div>
  );
}
