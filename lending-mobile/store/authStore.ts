import type { Session } from "@supabase/supabase-js";
import { create } from "zustand";

export type ProfileRole = "admin" | "staff" | "customer";

export type Profile = {
  id: string;
  email: string | null;
  role: ProfileRole;
  mobile_number?: string | null;
  address?: string | null;
  reference_person_mobile?: string | null;
  reference_relationship?: string | null;
};

type AuthState = {
  session: Session | null;
  profile: Profile | null;
  initialized: boolean;
  setSession: (s: Session | null) => void;
  setProfile: (p: Profile | null) => void;
  setInitialized: (v: boolean) => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  profile: null,
  initialized: false,
  setSession: (session) => set({ session }),
  setProfile: (profile) => set({ profile }),
  setInitialized: (initialized) => set({ initialized }),
}));
