export interface UserProfile {
  uid: string;
  screenName: string | null;
  profileVisibility: 'public' | 'private';
  createdAt: number;
}
