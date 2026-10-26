import { createContext, useState, useContext, useEffect } from "react";
import supabase from "../supabase-client";

const AuthContext = createContext();

export const AuthContextProvider = ({ children }) => {
  //Session state (user info, sign-in status)
  const [session, setSession] = useState(undefined);

  const [profile, setProfile] = useState(undefined);

  useEffect(() => {
    async function getInitialSession() {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          throw error;
        }
        setSession(data.session);
      } catch (error) {
        console.error("Error getting session:", error.message);
      }
    }
    getInitialSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const userId = session?.user?.id;
  const sessionLoading = session === undefined;

  useEffect(() => {
    if (sessionLoading) return;

    if (!userId) {
      setProfile(null);
      return;
    }

    let cancelled = false;

    async function fetchProfile() {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("id, name, account_type")
        .eq("id", userId)
        .maybeSingle();

      if (cancelled) return;
      if (error) console.error("Error fetching profile:", error.message);
      setProfile(data ?? null);
    }
    fetchProfile();

    return () => {
      cancelled = true;
    };
  }, [sessionLoading, userId]);

  const isAdmin = profile?.account_type === "admin";

  //Auth functions
  const signInUser = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase(),
        password: password,
      });
      if (error) {
        console.error("Supabase sign-in error:", error.message);
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error) {
      console.error("Unexpected error during sign-in:", error.message);
      return {
        success: false,
        error: "An unexpected error occurred. Please try again.",
      };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut({ scope: "local" });
      if (error) {
        console.error("Supabase sign-out error:", error.message);
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (error) {
      console.error("Unexpected error during sign-out:", error.message);
      return {
        success: false,
        error: "An unexpected error occurred during sign out.",
      };
    }
  };

  const signUpNewUser = async (email, password, name, accountType) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.toLowerCase(),
        password: password,
        options: {
          data: {
            name: name,
            account_type: accountType,
          },
        },
      });
      if (error) {
        console.error("Supabase sign-up error:", error.message);
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error) {
      console.error("Unexpected error during sign-up:", error.message);
      return {
        success: false,
        error: "An unexpected error occurred. Please try again.",
      };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        profile,
        isAdmin,
        signInUser,
        signOut,
        signUpNewUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};
