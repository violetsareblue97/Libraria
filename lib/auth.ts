import { useEffect, useState } from "react";
import { supabase } from "./supabase";

// custom hook - handles session state and profile fetching
// used in most pages to get current user info
export function useAuth() {
  const [user, setUser]       = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // get current session on first load
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleUser(session?.user ?? null);
    });

    // listen for login/logout events
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        handleUser(session?.user ?? null);
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  async function handleUser(currentUser: any) {
    if (!currentUser) {
      setUser(null);
      setProfile(null);
      setLoading(false);
      return;
    }

    setUser(currentUser);
    
    // get the user's profile from the profiles table
    let { data: prof, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", currentUser.id)
      .maybeSingle();

    // if profile doesnt exist yet, create one automatically
    // this handles cases where user signed up but profile wasnt created
    if (!prof && !error) {
      const { data: newProf } = await supabase
        .from("profiles")
        .insert({
          id: currentUser.id,
          full_name: currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0],
          email: currentUser.email,
          role: "member"
        })
        .select()
        .single();
      prof = newProf;
    }

    setProfile(prof);
    setLoading(false);
  }

  return { user, profile, loading };
}

export const signOut = () => supabase.auth.signOut();