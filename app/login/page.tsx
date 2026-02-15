"use client";

import CustomButton from "@/Components/CustomButton";
import { createClient } from "@/lib/client/supabaseClient";

export default function LoginPage() {
  const supabase = createClient();

  const loginWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${location.origin}/auth/callback`,
      },
    });
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background px-4">
      <div className="card w-full max-w-md p-10 rounded-2xl flex flex-col items-center gap-8">

        <div className="text-center space-y-4">
           <p className="text-xl lg:text-3xl tracking-widest text-muted">
            Bookmark Manager
          </p>

          
        </div>
        <div className="text-center space-y-3 max-w-sm">
          <p className="text-sm text-muted">
            A focused space to store, organize, and revisit the links that matter.
          </p>
          <p className="text-xs text-muted">
            Fast. Private. Distraction-free.
          </p>
        </div>

        <form action={loginWithGoogle} className="w-full">
          <CustomButton
            type="submit"
            className="
              group relative w-full overflow-hidden rounded-xl p-4
              bg-linear-to-r from-accent to-accent/90 text-white font-medium
              transition-all duration-300 hover:shadow-lg hover:shadow-accent/25
              active:scale-[0.98]
            "
          >
            <span className="relative z-10 flex items-center justify-center gap-3">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </span>
            
            <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-linear-to-r from-transparent via-white/20 to-transparent" />
          </CustomButton>
        </form>

        <p className="text-xs text-muted text-center leading-relaxed">
          By continuing, you agree to our Terms of Service and acknowledge our
          Privacy Policy.
        </p>

      </div>
    </div>
  );
}
