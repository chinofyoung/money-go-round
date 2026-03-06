"use client";

import { useAuth, useClerk } from "@clerk/nextjs";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function SignInPage() {
  const clerk = useClerk();
  const { isSignedIn, isLoaded: authLoaded } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const didRedirect = useRef(false);

  // Clerk instance itself is the load indicator
  const isLoaded = !!clerk && authLoaded;
  const signIn = (clerk as any)?.client?.signIn;

  useEffect(() => {
    // Wait for Clerk to load
    if (!isLoaded || !signIn) return;

    // If already signed in, go home
    if (isSignedIn) {
      router.replace("/");
      return;
    }

    // Only attempt automatic redirect once
    if (didRedirect.current) return;

    const startSignIn = async () => {
      try {
        didRedirect.current = true;
        console.log("Starting Google sign-in redirect...");
        await signIn.authenticateWithRedirect({
          strategy: "oauth_google",
          redirectUrl: "/sso-callback",
          redirectUrlComplete: "/",
        });
      } catch (err: any) {
        console.error("Google sign-in error:", err);
        didRedirect.current = false;
        setError(
          err?.errors?.[0]?.longMessage ??
          err?.message ??
          "Sign-in failed. Please try again."
        );
      }
    };

    startSignIn();
  }, [isLoaded, signIn, isSignedIn, router]);

  const handleManualSignIn = async () => {
    if (!signIn) return;
    try {
      setError(null);
      didRedirect.current = true;
      await signIn.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: "/sso-callback",
        redirectUrlComplete: "/",
      });
    } catch (err: any) {
      console.error("Manual sign-in error:", err);
      didRedirect.current = false;
      setError(
        err?.errors?.[0]?.longMessage ??
        err?.message ??
        "Sign-in failed. Please try again."
      );
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-6">
      {/* Required by Clerk for CAPTCHA bot protection in custom flows */}
      <div id="clerk-captcha" />
      <div className="w-full max-w-sm text-center space-y-8">
        {/* Spinner or Error */}
        <div className="flex flex-col items-center gap-6">
          {error ? (
            <>
              <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
                <span className="text-red-500 text-xl">!</span>
              </div>
              <div className="space-y-2">
                <p className="text-white font-medium">Authentication Error</p>
                <p className="text-red-400/80 text-sm leading-relaxed">{error}</p>
              </div>
              <button
                onClick={handleManualSignIn}
                className="w-full py-3 bg-[#4ade80] hover:bg-[#22c55e] text-black font-semibold rounded-2xl transition-all active:scale-[0.98]"
              >
                Try Again
              </button>
              <button
                onClick={() => router.push("/")}
                className="text-[#6b7280] text-sm hover:text-white transition-colors"
              >
                Go back to home
              </button>
            </>
          ) : (
            <>
              <div className="relative w-12 h-12">
                <div className="absolute inset-0 border-2 border-[#4ade80]/20 rounded-full" />
                <div className="absolute inset-0 border-2 border-[#4ade80] border-t-transparent rounded-full animate-spin" />
              </div>
              <div className="space-y-2">
                <p className="text-white font-medium">Redirecting to Google…</p>
                <p className="text-[#6b7280] text-sm">Please wait while we connect you.</p>
              </div>
              {/* Fallback button if it takes too long */}
              <button
                onClick={handleManualSignIn}
                className="text-[#4ade80] text-sm hover:underline mt-4 opacity-50 hover:opacity-100"
              >
                Not redirecting? Click here
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
