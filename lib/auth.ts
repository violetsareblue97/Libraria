import { useEffect, useState } from "react";
import { supabase } from "./supabase";

export function useAuth() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Ambil sesi awal
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleUser(session?.user ?? null);
    });

    // Pantau perubahan auth
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
    
    // Ambil profil dari tabel 'profiles'
    let { data: prof, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", currentUser.id)
      .maybeSingle();

    // AUTO-CREATE: Jika profil belum ada di tabel, buatkan otomatis
    if (!prof && !error) {
      const { data: newProf } = await supabase
        .from("profiles")
        .insert({
          id: currentUser.id,
          full_name: currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0],
          email: currentUser.email,
          role: "member" // default role
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