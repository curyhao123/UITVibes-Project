import { useCallback, useState } from 'react';
import { User, Post, Comment } from '../data/mockData';
import * as api from '../services/api';
import type { Story } from '../services/storyService';
import type { Reel as APIReel } from '../services/postService';
import { clearReelsUserCache } from './reelsUserCache';

export const useFeedState = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [feedTab, setFeedTab] = useState<'foryou' | 'following'>('foryou');
  const [myPosts, setMyPosts] = useState<Post[]>([]);
  const [repostedPosts, setRepostedPosts] = useState<Post[]>([]);
  const [lastPostsFetch, setLastPostsFetch] = useState(0);
  const [lastStoriesFetch, setLastStoriesFetch] = useState(0);
  const [reels, setReels] = useState<APIReel[]>([]);

  const refreshPosts = useCallback(async () => {
    try {
      const data = await api.getPosts();
      setPosts(data);
      setLastPostsFetch(Date.now());
    } catch (error) {
      console.error('Failed to fetch posts:', error);
    }
  }, []);

  const refreshStories = useCallback(async () => {
    try {
      const data = await api.getStories();
      setStories(data);
      setLastStoriesFetch(Date.now());
    } catch (error) {
      console.error('Failed to fetch stories:', error);
    }
  }, []);

  const refreshMyPosts = useCallback(async () => {
    try {
      const data = await api.getMyPosts();
      setMyPosts(data);
    } catch (error: any) {
      console.error('[AppContext] refreshMyPosts: ERROR', error?.response?.status, error?.message);
    }
  }, []);

  const toggleLike = useCallback(
    async (postId: string, isCurrentlyLiked?: boolean): Promise<boolean> => {
      const currentlyLiked = isCurrentlyLiked ?? posts.find((p) => p.id === postId)?.isLiked ?? false;
      setPosts((prev) =>
        prev.map((post) => {
          if (post.id === postId) {
            return {
              ...post,
              isLiked: !currentlyLiked,
              likes: currentlyLiked ? post.likes - 1 : post.likes + 1,
            };
          }
          return post;
        }),
      );
      try {
        const newLikedState = await api.toggleLike(postId, currentlyLiked);
        setPosts((prev) =>
          prev.map((post) => {
            if (post.id === postId) {
              return { ...post, isLiked: newLikedState };
            }
            return post;
          }),
        );
        return newLikedState;
      } catch (error) {
        await refreshPosts();
        console.error('Failed to toggle like:', error);
        return currentlyLiked;
      }
    },
    [posts, refreshPosts],
  );

  const toggleBookmark = useCallback(
    async (postId: string) => {
      setPosts((prev) =>
        prev.map((post) => {
          if (post.id === postId) {
            return { ...post, isBookmarked: !post.isBookmarked };
          }
          return post;
        }),
      );
      try {
        await api.toggleBookmark(postId);
      } catch (error) {
        await refreshPosts();
        console.error('Failed to toggle bookmark:', error);
      }
    },
    [refreshPosts],
  );

  const toggleRepost = useCallback(
    async (postId: string) => {
      setPosts((prev) =>
        prev.map((post) => {
          if (post.id === postId) {
            const willRepost = !post.isReposted;
            return {
              ...post,
              isReposted: willRepost,
              repostCount: Math.max(0, (post.repostCount ?? 0) + (willRepost ? 1 : -1)),
            };
          }
          return post;
        }),
      );

      const targetPost = posts.find((p) => p.id === postId);
      if (!targetPost) return;

      const willRepost = !targetPost.isReposted;

      if (willRepost) {
        setRepostedPosts((prev) => {
          const exists = prev.some((p) => p.id === postId);
          if (exists) return prev;
          return [{ ...targetPost, isReposted: true, repostCount: (targetPost.repostCount ?? 0) + 1 }, ...prev];
        });
      } else {
        setRepostedPosts((prev) => prev.filter((p) => p.id !== postId));
      }
    },
    [posts],
  );

  const addComment = useCallback(
    async ({
      postId,
      text,
      parentCommentId,
      imageUrl,
    }: {
      postId: string;
      text: string;
      parentCommentId?: string;
      imageUrl?: string;
    }) => {
      try {
        const result = await api.addComment({ postId, text, parentCommentId, imageUrl });
        if (result.success && result.comment) {
          setPosts((prev) =>
            prev.map((post) => {
              if (post.id === postId) {
                return {
                  ...post,
                  comments: [result.comment!, ...post.comments],
                };
              }
              return post;
            }),
          );
          setMyPosts((prev) =>
            prev.map((post) => {
              if (post.id === postId) {
                return {
                  ...post,
                  comments: [result.comment!, ...post.comments],
                };
              }
              return post;
            }),
          );
        }
        return result.comment;
      } catch (error) {
        console.error('Failed to add comment:', error);
        throw error;
      }
    },
    [],
  );

  const deleteComment = useCallback(
    async (postId: string, commentId: string) => {
      try {
        await api.deleteComment(commentId);
        await refreshPosts();
      } catch (error) {
        console.error('Failed to delete comment:', error);
      }
    },
    [refreshPosts],
  );

  const createPost = useCallback(
    async (images: string[], caption: string, location?: string, visibility?: number): Promise<Post | null> => {
      try {
        const newPost = await api.createPost(images, caption, location, visibility);
        setPosts((prev) => [newPost, ...prev]);
        setMyPosts((prev) => [newPost, ...prev]);
        await refreshMyPosts();
        return newPost;
      } catch (error) {
        console.error('Failed to create post:', error);
        return null;
      }
    },
    [refreshMyPosts],
  );

  const createReel = useCallback(
    async (videoUri: string, caption: string, duration?: number): Promise<any> => {
      try {
        const newReel = await api.createReel(videoUri, caption, duration);
        return newReel;
      } catch (error) {
        console.error('Failed to create reel:', error);
        throw error;
      }
    },
    [],
  );

  const updatePost = useCallback(
    async (postId: string, caption: string) => {
      try {
        await api.updatePost(postId, caption);
        await refreshPosts();
      } catch (error) {
        console.error('Failed to update post:', error);
      }
    },
    [refreshPosts],
  );

  const deletePost = useCallback(async (postId: string) => {
    try {
      await api.deletePost(postId);
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      setMyPosts((prev) => prev.filter((p) => p.id !== postId));
    } catch (error) {
      console.error('Failed to delete post:', error);
    }
  }, []);

  const refreshReels = useCallback(async () => {
    try {
      const data = await api.getReels();
      setReels(data);
    } catch (error) {
      console.error('Failed to fetch reels:', error);
    }
  }, []);

  const toggleReelLike = useCallback(
    async (reelId: string, isCurrentlyLiked: boolean) => {
      setReels((prev) =>
        prev.map((reel) => {
          if (reel.id === reelId) {
            return {
              ...reel,
              isLiked: !isCurrentlyLiked,
              likeCount: isCurrentlyLiked ? reel.likeCount - 1 : reel.likeCount + 1,
            };
          }
          return reel;
        }),
      );
      try {
        await api.toggleReelLike(reelId, isCurrentlyLiked);
      } catch (error) {
        await refreshReels();
        console.error('Failed to toggle reel like:', error);
      }
    },
    [refreshReels],
  );

  const toggleReelBookmark = useCallback(
    async (reelId: string) => {
      const reel = reels.find((r) => r.id === reelId);
      if (!reel) return;

      setReels((prev) =>
        prev.map((r) =>
          r.id === reelId ? { ...r, isBookmarked: !(r as any).isBookmarked } : r,
        ),
      );
      try {
        await api.toggleReelBookmark(reelId);
      } catch (error) {
        await refreshReels();
        console.error('Failed to toggle reel bookmark:', error);
      }
    },
    [reels, refreshReels],
  );

  const addReelComment = useCallback(
    async (reelId: string, text: string, parentCommentId?: string) => {
      try {
        await api.addReelComment(reelId, text, parentCommentId);
      } catch (error) {
        console.error('Failed to add reel comment:', error);
      }
    },
    [],
  );

  const deleteReelComment = useCallback(async (commentId: string) => {
    try {
      await api.deleteReelComment(commentId);
    } catch (error) {
      console.error('Failed to delete reel comment:', error);
    }
  }, []);

  const toggleReelCommentLike = useCallback(async (commentId: string) => {
    try {
      await api.toggleReelCommentLike(commentId, false);
    } catch (error) {
      console.error('Failed to toggle reel comment like:', error);
    }
  }, []);

  const deleteReelFn = useCallback(async (reelId: string) => {
    try {
      await api.deleteReel(reelId);
      setReels((prev) => prev.filter((r) => r.id !== reelId));
    } catch (error) {
      console.error('Failed to delete reel:', error);
    }
  }, []);

  return {
    posts,
    stories,
    refreshPosts,
    refreshStories,
    lastPostsFetch,
    lastStoriesFetch,
    myPosts,
    refreshMyPosts,
    feedTab,
    setFeedTab,
    toggleLike,
    toggleBookmark,
    toggleRepost,
    repostedPosts,
    addComment,
    deleteComment,
    createPost,
    createReel,
    updatePost,
    deletePost,
    reels,
    refreshReels,
    toggleReelLike,
    toggleReelBookmark,
    addReelComment,
    deleteReelComment,
    toggleReelCommentLike,
    deleteReel: deleteReelFn,
    setPosts,
    setMyPosts,
    setRepostedPosts,
    setStories,
    setReels,
    clearReelsUserCache,
  };
};
