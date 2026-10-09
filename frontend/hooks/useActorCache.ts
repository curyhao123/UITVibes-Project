/**
 * useActorCache — On-demand cache for notification actor info.
 *
 * BE's NotificationDto currently doesn't include actor.avatar / displayName,
 * so we fetch them lazily via getUserById whenever a new actorId appears.
 * Results are cached in a Map so the same actor doesn't trigger duplicate requests.
 */

import { useCallback, useEffect, useState } from 'react';
import { getUserById } from '../services/api';

export interface ActorMini {
  id: string;
  username: string;
  displayName: string;
  avatar: string;
}

const inflightRef = new Map<string, Promise<ActorMini | null>>();

function toActorMini(user: any): ActorMini {
  return {
    id: user.id,
    username: user.username || user.handle || '',
    displayName: user.displayName || user.fullName || user.username || 'User',
    avatar: user.avatar || '',
  };
}

export function useActorCache(actorIds: string[]) {
  const [cache, setCache] = useState<Map<string, ActorMini>>(new Map());
  const idsKey = actorIds.filter(Boolean).join('|');

  useEffect(() => {
    let cancelled = false;
    const unique = Array.from(new Set(actorIds.filter(Boolean)));

    (async () => {
      for (const id of unique) {
        if (cache.has(id)) continue;
        if (inflightRef.has(id)) {
          const result = await inflightRef.get(id);
          if (!cancelled && result) {
            setCache((prev) => {
              if (prev.has(id)) return prev;
              const next = new Map(prev);
              next.set(id, result);
              return next;
            });
          }
          continue;
        }

        const promise = (async (): Promise<ActorMini | null> => {
          try {
            const user = await getUserById(id);
            if (!user) return null;
            return toActorMini(user);
          } catch (err) {
            console.warn('[useActorCache] failed to fetch actor', id, err);
            return null;
          } finally {
            inflightRef.delete(id);
          }
        })();

        inflightRef.set(id, promise);
        const result = await promise;
        if (cancelled) continue;
        if (result) {
          setCache((prev) => {
            if (prev.has(id)) return prev;
            const next = new Map(prev);
            next.set(id, result);
            return next;
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // We intentionally re-run when the set of ids changes (stringified).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey]);

  const getActor = useCallback(
    (id: string): ActorMini | null => cache.get(id) ?? null,
    [cache],
  );

  return { getActor };
}
