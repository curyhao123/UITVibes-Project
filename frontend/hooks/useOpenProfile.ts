import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { useApp } from '../context/AppContext';

// Own profile lives in the Profile tab: return to it instead of stacking a second profile screen.
export function useOpenProfile() {
  const router = useRouter();
  const { currentUser } = useApp();
  const currentUserId = currentUser?.id;

  return useCallback(
    (userId: string) => {
      if (userId === currentUserId) {
        router.dismissTo('/(tabs)/profile');
      } else {
        router.push({ pathname: '/profile/[id]', params: { id: userId } });
      }
    },
    [router, currentUserId],
  );
}
