import { create } from 'zustand';
import type { User } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { getUserProfile, createUserProfile } from '../lib/firestore';
import type { UserProfile } from '../types/user';

interface AuthState {
  user: User | null;
  userProfile: UserProfile | null;
  authLoading: boolean;
  setUser: (user: User | null) => void;
  setUserProfile: (profile: UserProfile | null) => void;
  setAuthLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      set({ user, authLoading: false });
      let profile = await getUserProfile(user.uid);
      if (!profile) {
        await createUserProfile(user.uid, {
          screenName: null,
          profileVisibility: 'private',
          createdAt: Date.now(),
        });
        profile = await getUserProfile(user.uid);
      }
      set({ userProfile: profile });
    } else {
      set({ user: null, userProfile: null, authLoading: false });
    }
  });

  return {
    user: null,
    userProfile: null,
    authLoading: true,
    setUser: (user) => set({ user }),
    setUserProfile: (userProfile) => set({ userProfile }),
    setAuthLoading: (authLoading) => set({ authLoading }),
  };
});
