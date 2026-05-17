import { useEffect, useEffectEvent, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  MdFavorite,
  MdBookmarkAdded,
  MdOutlineBookmarkBorder,
  MdOutlineChatBubbleOutline,
  MdOutlineFavoriteBorder,
  MdVolumeOff,
  MdVolumeUp,
} from "react-icons/md";
import { PiShareFatLight } from "react-icons/pi";
import { toast } from "react-toastify";
import { useSelector } from "react-redux";
import api from "../../lib/api";
import { AuthAccessPrompt } from "../auth/AuthAccessPrompt";
import { PublicShareSheet } from "./PublicShareSheet";
import { usePageMetadata } from "../../hooks/usePageMetadata";
import noProfile from "../../assets/noProfile.png";
import { StoryTray } from "../story/StoryTray";
import styles from "./PublicFeedView.module.css";

const formatDisplayValue = (value) => {
  if (!value) return "";

  return `${value}`
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

const getDescriptionText = (post) => {
  if (post.description) {
    return post.description;
  }

  if (post.title) {
    return post.title;
  }

  return "A fresh globMe post shared publicly.";
};

const shouldShowViewCount = (post) =>
  post?.postType === "video" || post?.contentFormat === "reel";

const FEED_SKELETON_COUNT = 6;

export const PublicFeedView = ({
  title,
  description,
  filterType = "all",
  showStoryTray = false,
  afterStoryContent = null,
  autoPlayVisibleVideos = false,
  emptyHeading,
  emptyCopy,
  seoTitle,
  seoDescription,
}) => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [watchLaterBusyId, setWatchLaterBusyId] = useState("");
  const [likeBusyId, setLikeBusyId] = useState("");
  const [ownerPlaylists, setOwnerPlaylists] = useState([]);
  const [playlistsLoading, setPlaylistsLoading] = useState(false);
  const [playlistPickerPost, setPlaylistPickerPost] = useState(null);
  const [playlistPickerClosingPost, setPlaylistPickerClosingPost] = useState(null);
  const [playlistPickerIds, setPlaylistPickerIds] = useState([]);
  const [playlistPickerSaving, setPlaylistPickerSaving] = useState(false);
  const [newPlaylistTitle, setNewPlaylistTitle] = useState("");
  const [newPlaylistDescription, setNewPlaylistDescription] = useState("");
  const [likesViewerPost, setLikesViewerPost] = useState(null);
  const [likesViewerLoading, setLikesViewerLoading] = useState(false);
  const [likesViewerItems, setLikesViewerItems] = useState([]);
  const [likesViewerError, setLikesViewerError] = useState("");
  const [shareSheetPost, setShareSheetPost] = useState(null);
  const [desktopHoverPreview, setDesktopHoverPreview] = useState(false);
  const [activePreviewPostId, setActivePreviewPostId] = useState("");
  const [previewControlPostId, setPreviewControlPostId] = useState("");
  const [mobileSoundPreviewPostId, setMobileSoundPreviewPostId] = useState("");
  const videoPreviewRefs = useRef(new Map());
  const videoVisibilityRatiosRef = useRef(new Map());
  const activeAutoplayVideoIdRef = useRef("");
  const hoverPreviewPostIdRef = useRef("");
  const previewAutoplayTimeoutRef = useRef(null);
  const playlistPickerCloseTimeoutRef = useRef(null);

  usePageMetadata({
    title: seoTitle || title,
    description: seoDescription || description,
  });

  useEffect(() => {
    let ignore = false;

    const loadPosts = async () => {
      try {
        setLoading(true);
        const response = await api.get("/public/posts", {
          params: {
            type: filterType,
            limit: 24,
          },
        });

        if (!ignore) {
          setPosts(response.data?.data || []);
        }
      } catch (error) {
        if (!ignore) {
          toast.error(error.response?.data?.message || "Could not load posts");
          setPosts([]);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    loadPosts();

    return () => {
      ignore = true;
    };
  }, [filterType]);

  const clearPreviewAutoplayTimeout = () => {
    if (previewAutoplayTimeoutRef.current) {
      window.clearTimeout(previewAutoplayTimeoutRef.current);
      previewAutoplayTimeoutRef.current = null;
    }
  };

  const pauseAllPreviewVideos = () => {
    videoPreviewRefs.current.forEach((node) => node?.pause());
    activeAutoplayVideoIdRef.current = "";
    setActivePreviewPostId("");
  };

  const playPreviewVideo = (postId, options = {}) => {
    const { muted = true } = options;

    if (!postId) {
      pauseAllPreviewVideos();
      return;
    }

    const targetNode = videoPreviewRefs.current.get(postId);

    videoPreviewRefs.current.forEach((node, currentPostId) => {
      if (!node) {
        return;
      }

      if (currentPostId !== postId) {
        node.muted = true;
        node.pause();
      }
    });

    if (!targetNode) {
      activeAutoplayVideoIdRef.current = "";
      setActivePreviewPostId("");
      return;
    }

    targetNode.muted = muted;
    targetNode.volume = muted ? 0 : 1;
    const playPromise = targetNode.play();

    if (playPromise?.catch) {
      playPromise.catch(() => {});
    }

    activeAutoplayVideoIdRef.current = postId;
    setActivePreviewPostId(postId);
    setPreviewControlPostId(postId);
  };

  const syncVisibleVideoPlayback = useEffectEvent(() => {
    if (desktopHoverPreview || hoverPreviewPostIdRef.current) {
      return;
    }

    const candidates = Array.from(videoPreviewRefs.current.entries())
      .map(([postId, node]) => ({
        postId,
        node,
        ratio: videoVisibilityRatiosRef.current.get(postId) || 0,
      }))
      .filter((item) => item.node && item.ratio >= 0.65);

    const nextActiveVideo = candidates.sort((left, right) => right.ratio - left.ratio)[0] || null;
    const nextActiveVideoId = nextActiveVideo?.postId || "";
    const shouldPlayWithSound =
      Boolean(nextActiveVideoId) && mobileSoundPreviewPostId === nextActiveVideoId;

    if (mobileSoundPreviewPostId && mobileSoundPreviewPostId !== nextActiveVideoId) {
      setMobileSoundPreviewPostId("");
    }

    playPreviewVideo(nextActiveVideoId, { muted: !shouldPlayWithSound });
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 1024px) and (hover: hover) and (pointer: fine)");
    const syncDesktopHoverPreview = (event) => {
      setDesktopHoverPreview(event.matches);
    };

    syncDesktopHoverPreview(mediaQuery);

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", syncDesktopHoverPreview);
      return () => {
        mediaQuery.removeEventListener("change", syncDesktopHoverPreview);
      };
    }

    mediaQuery.addListener(syncDesktopHoverPreview);
    return () => {
      mediaQuery.removeListener(syncDesktopHoverPreview);
    };
  }, []);

  useEffect(() => {
    clearPreviewAutoplayTimeout();

    if (!autoPlayVisibleVideos || desktopHoverPreview) {
      hoverPreviewPostIdRef.current = "";
      setPreviewControlPostId("");
      setMobileSoundPreviewPostId("");
      pauseAllPreviewVideos();
      videoVisibilityRatiosRef.current.clear();
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const postId = entry.target.getAttribute("data-post-id") || "";

          if (!postId) {
            return;
          }

          videoVisibilityRatiosRef.current.set(postId, entry.intersectionRatio);
        });

        clearPreviewAutoplayTimeout();
        previewAutoplayTimeoutRef.current = window.setTimeout(() => {
          syncVisibleVideoPlayback();
        }, 180);
      },
      {
        threshold: [0, 0.25, 0.5, 0.65, 0.8, 1],
      },
    );
    const previewRefs = videoPreviewRefs.current;
    const visibilityRatios = videoVisibilityRatiosRef.current;

    previewRefs.forEach((node, postId) => {
      if (!node) {
        return;
      }

      node.muted = true;
      node.playsInline = true;
      node.loop = true;
      node.setAttribute("data-post-id", postId);
      observer.observe(node);
    });

    return () => {
      observer.disconnect();
      clearPreviewAutoplayTimeout();
      pauseAllPreviewVideos();
      visibilityRatios.clear();
    };
  }, [autoPlayVisibleVideos, desktopHoverPreview, posts]);

  const registerVideoPreviewRef = (postId) => (node) => {
    if (!postId) {
      return;
    }

    if (node) {
      videoPreviewRefs.current.set(postId, node);
      return;
    }

    videoPreviewRefs.current.delete(postId);
    videoVisibilityRatiosRef.current.delete(postId);
  };

  const handleVideoPreviewMouseEnter = (postId) => {
    if (!desktopHoverPreview || !postId) {
      return;
    }

    clearPreviewAutoplayTimeout();
    hoverPreviewPostIdRef.current = postId;
    playPreviewVideo(postId, { muted: false });
  };

  const handleVideoPreviewMouseLeave = (postId) => {
    if (!desktopHoverPreview || hoverPreviewPostIdRef.current !== postId) {
      return;
    }

    hoverPreviewPostIdRef.current = "";
    pauseAllPreviewVideos();
    const targetNode = videoPreviewRefs.current.get(postId);

    if (targetNode) {
      targetNode.muted = true;
      targetNode.volume = 0;
    }
  };

  const handleMobilePreviewSoundToggle = (event, postId) => {
    event.preventDefault();
    event.stopPropagation();

    if (
      desktopHoverPreview ||
      (activePreviewPostId !== postId && previewControlPostId !== postId)
    ) {
      return;
    }

    const shouldEnableSound = mobileSoundPreviewPostId !== postId;
    setMobileSoundPreviewPostId(shouldEnableSound ? postId : "");
    playPreviewVideo(postId, { muted: !shouldEnableSound });
  };

  const activePlaylistPickerPost = playlistPickerPost || playlistPickerClosingPost;
  const playlistPickerClosing = Boolean(!playlistPickerPost && playlistPickerClosingPost);

  useEffect(() => {
    if (!activePlaylistPickerPost) {
      return undefined;
    }

    const previousBodyOverflow = document.body.style.overflow;
    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !playlistPickerSaving) {
        setPlaylistPickerClosingPost((prev) => prev || playlistPickerPost || activePlaylistPickerPost);
        setPlaylistPickerPost(null);

        if (playlistPickerCloseTimeoutRef.current) {
          window.clearTimeout(playlistPickerCloseTimeoutRef.current);
        }

        playlistPickerCloseTimeoutRef.current = window.setTimeout(() => {
          setPlaylistPickerClosingPost(null);
          playlistPickerCloseTimeoutRef.current = null;
        }, 220);
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activePlaylistPickerPost, playlistPickerPost, playlistPickerSaving]);

  useEffect(() => {
    if (!likesViewerPost) {
      return undefined;
    }

    const previousBodyOverflow = document.body.style.overflow;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setLikesViewerPost(null);
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [likesViewerPost]);

  useEffect(
    () => () => {
      if (playlistPickerCloseTimeoutRef.current) {
        window.clearTimeout(playlistPickerCloseTimeoutRef.current);
      }
    },
    [],
  );

  const isOwnerOfPost = (post) =>
    Boolean(user?._id && post?.user?._id && `${user._id}` === `${post.user._id}`);

  const handleShareOpen = (post) => {
    if (!post?._id) {
      return;
    }

    setShareSheetPost(post);
  };

  const handleOpenComments = (postId) => {
    if (!postId) {
      return;
    }

    navigate(`/posts/${postId}`);
  };

  const handleLikeToggle = async (postId) => {
    if (!isAuthenticated) {
      setShowAuthPrompt(true);
      return;
    }

    try {
      setLikeBusyId(postId);
      const response = await api.post(`/user/posts/${postId}/like`);
      const liked = Boolean(response.data?.data?.liked);
      const likeCount = Number(response.data?.data?.likeCount ?? 0);

      setPosts((prev) =>
        prev.map((post) =>
          post._id === postId
            ? {
                ...post,
                likedByViewer: liked,
                likeCount,
              }
            : post,
        ),
      );
      toast.success(liked ? "Post liked" : "Like removed");
    } catch (error) {
      toast.error(error.response?.data?.message || "Post like could not be updated");
    } finally {
      setLikeBusyId("");
    }
  };

  const handleOpenLikesViewer = async (post) => {
    if (!post?._id || !isOwnerOfPost(post)) {
      return;
    }

    try {
      setLikesViewerPost(post);
      setLikesViewerLoading(true);
      setLikesViewerError("");
      const response = await api.get(`/user/posts/${post._id}/likes`);
      const payload = response.data?.data || {};
      setLikesViewerItems(Array.isArray(payload.likes) ? payload.likes : []);
    } catch (error) {
      setLikesViewerItems([]);
      setLikesViewerError(error.response?.data?.message || "Likes could not be loaded");
    } finally {
      setLikesViewerLoading(false);
    }
  };

  const handleWatchLaterToggle = async (postId) => {
    if (!isAuthenticated) {
      setShowAuthPrompt(true);
      return;
    }

    try {
      setWatchLaterBusyId(postId);
      const response = await api.post(`/user/watch-later/${postId}`);
      const isSaved = Boolean(response.data?.data?.savedToWatchLater);

      setPosts((prev) =>
        prev.map((post) =>
          post._id === postId
            ? {
                ...post,
                savedToWatchLater: isSaved,
              }
            : post,
        ),
      );

      toast.success(response.data?.message || "Watch later updated");
    } catch (error) {
      toast.error(error.response?.data?.message || "Watch later update failed");
    } finally {
      setWatchLaterBusyId("");
    }
  };

  const handlePlaylistToggle = (playlistId) => {
    setPlaylistPickerIds((prev) =>
      prev.includes(playlistId)
        ? prev.filter((item) => item !== playlistId)
        : [...prev, playlistId],
    );
  };

  const handleClosePlaylistPicker = () => {
    const nextClosingPost = playlistPickerPost || playlistPickerClosingPost;

    if (!nextClosingPost) {
      return;
    }

    setPlaylistPickerClosingPost(nextClosingPost);
    setPlaylistPickerPost(null);

    if (playlistPickerCloseTimeoutRef.current) {
      window.clearTimeout(playlistPickerCloseTimeoutRef.current);
    }

    playlistPickerCloseTimeoutRef.current = window.setTimeout(() => {
      setPlaylistPickerClosingPost(null);
      playlistPickerCloseTimeoutRef.current = null;
    }, 220);
  };

  const handleOpenPlaylistPicker = async (post) => {
    if (!post?._id) {
      return;
    }

    if (!isAuthenticated) {
      setShowAuthPrompt(true);
      return;
    }

    try {
      if (playlistPickerCloseTimeoutRef.current) {
        window.clearTimeout(playlistPickerCloseTimeoutRef.current);
        playlistPickerCloseTimeoutRef.current = null;
      }
      setPlaylistPickerClosingPost(null);
      setPlaylistPickerPost(post);
      setPlaylistsLoading(true);
      const response = await api.get("/user/playlists");
      const nextPlaylists = Array.isArray(response.data?.data) ? response.data.data : [];
      const nextSelectedIds = nextPlaylists
        .filter((playlist) =>
          Array.isArray(playlist.videos) &&
          playlist.videos.some((video) => video?._id === post._id),
        )
        .map((playlist) => playlist._id);

      setOwnerPlaylists(nextPlaylists);
      setPlaylistPickerIds(nextSelectedIds);
      setNewPlaylistTitle("");
      setNewPlaylistDescription("");
    } catch (error) {
      setPlaylistPickerPost(null);
      toast.error(error.response?.data?.message || "Playlists could not be loaded");
    } finally {
      setPlaylistsLoading(false);
    }
  };

  const handlePlaylistSave = async () => {
    if (!playlistPickerPost?._id) {
      return;
    }

    const targetPostId = playlistPickerPost._id;
    const normalizedNewTitle = newPlaylistTitle.trim().toLowerCase();
    const normalizedNewDescription = newPlaylistDescription.trim();
    const updates = ownerPlaylists.reduce((items, playlist) => {
      const currentVideoIds = Array.isArray(playlist.videos)
        ? playlist.videos.map((video) => video._id)
        : [];
      const currentlyLinked = currentVideoIds.includes(targetPostId);
      const shouldBeLinked = playlistPickerIds.includes(playlist._id);

      if (currentlyLinked === shouldBeLinked) {
        return items;
      }

      items.push({
        playlistId: playlist._id,
        payload: {
          title: `${playlist.title || ""}`.trim().toLowerCase(),
          description: playlist.description || "",
          videoPostIds: shouldBeLinked
            ? Array.from(new Set([...currentVideoIds, targetPostId]))
            : currentVideoIds.filter((item) => item !== targetPostId),
        },
      });

      return items;
    }, []);

    if (!updates.length && !normalizedNewTitle) {
      handleClosePlaylistPicker();
      return;
    }

    try {
      setPlaylistPickerSaving(true);
      const responses = await Promise.all(
        updates.map(({ playlistId, payload }) =>
          api.patch(`/user/playlists/${playlistId}`, payload),
        ),
      );
      const createResponse = normalizedNewTitle
        ? await api.post("/user/playlists", {
          title: normalizedNewTitle,
          description: normalizedNewDescription,
          videoPostIds: [targetPostId],
        })
        : null;
      const updatedMap = new Map(
        responses
          .map((response) => response.data?.data)
          .filter(Boolean)
          .map((playlist) => [playlist._id, playlist]),
      );

      setOwnerPlaylists((prev) =>
        [
          ...(createResponse?.data?.data ? [createResponse.data.data] : []),
          ...prev.map((playlist) => updatedMap.get(playlist._id) || playlist),
        ],
      );
      handleClosePlaylistPicker();
      setNewPlaylistTitle("");
      setNewPlaylistDescription("");
      toast.success("Playlist selections updated");
    } catch (error) {
      toast.error(error.response?.data?.message || "Playlist update failed");
    } finally {
      setPlaylistPickerSaving(false);
    }
  };

  return (
    <>
      <main className={styles.page}>
        {showStoryTray ? (
          <StoryTray onRequireAuth={() => setShowAuthPrompt(true)} />
        ) : null}
        {afterStoryContent}

        {loading ? (
          <section className={styles.feedGrid} aria-label="Loading public posts">
            {Array.from({ length: FEED_SKELETON_COUNT }, (_, index) => (
              <article
                key={`feed-skeleton-${index}`}
                className={`${styles.feedCard} ${styles.feedCardSkeleton}`}
                aria-hidden="true"
              >
                <div className={styles.profileRow}>
                  <span className={`${styles.skeletonBlock} ${styles.skeletonAvatar}`} />
                  <div className={styles.skeletonProfileMeta}>
                    <span className={`${styles.skeletonBlock} ${styles.skeletonName}`} />
                    <span className={`${styles.skeletonBlock} ${styles.skeletonProfession}`} />
                  </div>
                </div>

                <div className={`${styles.mediaFrame} ${styles.skeletonBlock}`} />

                <div className={styles.cardBody}>
                  <div className={styles.skeletonTextGroup}>
                    <span className={`${styles.skeletonBlock} ${styles.skeletonTitle}`} />
                    <span className={`${styles.skeletonBlock} ${styles.skeletonLineFull}`} />
                    <span className={`${styles.skeletonBlock} ${styles.skeletonLineShort}`} />
                  </div>
                </div>

                <div className={styles.cardFooter}>
                  <div className={styles.statGroup}>
                    <span className={`${styles.skeletonBlock} ${styles.skeletonStat}`} />
                    <span className={`${styles.skeletonBlock} ${styles.skeletonStat}`} />
                    <span className={`${styles.skeletonBlock} ${styles.skeletonStatShort}`} />
                  </div>

                  <div className={styles.actionGroup}>
                    <span className={`${styles.skeletonBlock} ${styles.skeletonActionBtn}`} />
                    <span className={`${styles.skeletonBlock} ${styles.skeletonActionBtn}`} />
                    <span className={`${styles.skeletonBlock} ${styles.skeletonActionBtn}`} />
                    <span className={`${styles.skeletonBlock} ${styles.skeletonActionBtn}`} />
                  </div>
                </div>
              </article>
            ))}
          </section>
        ) : posts.length === 0 ? (
          <section className={styles.placeholder}>
            <h2>{emptyHeading}</h2>
            <p>{emptyCopy}</p>
          </section>
        ) : (
          <section className={styles.feedGrid}>
            {posts.map((post) => (
              <article
                key={post._id}
                className={styles.feedCard}
                onMouseEnter={() => handleVideoPreviewMouseEnter(post.postType === "video" ? post._id : "")}
                onMouseLeave={() => handleVideoPreviewMouseLeave(post._id)}
              >
                <button
                  type="button"
                  className={styles.profileRow}
                  onClick={() => navigate(`/profile/${post.user?._id}`)}
                >
                  <img
                    src={post.user?.avatar || noProfile}
                    alt={post.user?.username || "Profile"}
                    className={styles.avatar}
                  />
                  <div className={styles.profileMeta}>
                    <strong>{post.user?.username || "globMe member"}</strong>
                    <span>
                      {formatDisplayValue(post.user?.profession) || "Public profile"}
                    </span>
                  </div>
                </button>

                <div className={styles.mediaFrame}>
                  <button
                    type="button"
                    className={styles.mediaButton}
                    onClick={() => navigate(`/posts/${post._id}`)}
                  >
                    {post.postType === "video" ? (
                      <video
                        ref={registerVideoPreviewRef(post._id)}
                        src={post.url}
                        className={styles.media}
                        muted
                        playsInline
                        loop
                        preload="metadata"
                      />
                    ) : (
                      <img
                        src={post.url}
                        alt={post.title || post.description || "globMe post"}
                        className={styles.media}
                        loading="lazy"
                      />
                    )}
                  </button>
                  {post.postType === "video" &&
                  !desktopHoverPreview &&
                  previewControlPostId === post._id ? (
                    <button
                      type="button"
                      className={styles.previewSoundToggle}
                      onClick={(event) => handleMobilePreviewSoundToggle(event, post._id)}
                      aria-label={
                        mobileSoundPreviewPostId === post._id
                          ? "Mute preview sound"
                          : "Play preview sound"
                      }
                    >
                      {mobileSoundPreviewPostId === post._id ? (
                        <>
                          <MdVolumeUp />
                          Sound on
                        </>
                      ) : (
                        <>
                          <MdVolumeOff />
                          Tap for sound
                        </>
                      )}
                    </button>
                  ) : null}
                </div>

                <div className={styles.cardBody}>
                  <button
                    type="button"
                    className={styles.titleButton}
                    onClick={() => navigate(`/posts/${post._id}`)}
                  >
                    <h2>{formatDisplayValue(post.title) || "Public post"}</h2>
                  </button>
                  <p>{getDescriptionText(post)}</p>
                </div>

                <div className={styles.cardFooter}>
                  <div className={styles.statGroup}>
                    {shouldShowViewCount(post) ? (
                      <span>{post.viewCount || 0} views</span>
                    ) : null}
                    {isOwnerOfPost(post) ? (
                      <button
                        type="button"
                        className={styles.statButton}
                        onClick={() => handleOpenLikesViewer(post)}
                      >
                        {post.likeCount || 0} likes
                      </button>
                    ) : (
                      <span>{post.likeCount || 0} likes</span>
                    )}
                    <span>{post.commentCount || 0} comments</span>
                    <span>{post.shareCount || 0} shares</span>
                  </div>

                  <div className={styles.actionGroup}>
                    {post.postType === "video" ? (
                      <button
                        type="button"
                        className={`${styles.actionBtn} ${styles.iconOnlyBtn} ${post.savedToWatchLater ? styles.actionBtnActive : ""}`}
                        onClick={() => handleWatchLaterToggle(post._id)}
                        disabled={watchLaterBusyId === post._id}
                        aria-label={
                          watchLaterBusyId === post._id
                            ? "Saving to watch later"
                            : post.savedToWatchLater
                              ? "Saved to watch later"
                              : "Save to watch later"
                        }
                      >
                        {post.savedToWatchLater ? (
                          <MdBookmarkAdded />
                        ) : (
                          <MdOutlineBookmarkBorder />
                        )}
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className={styles.actionBtn}
                      onClick={() => handleOpenPlaylistPicker(post)}
                      aria-label="Add to playlist"
                    >
                      +
                    </button>
                    <button
                      type="button"
                      className={`${styles.actionBtn} ${styles.iconOnlyBtn} ${post.likedByViewer ? styles.actionBtnActive : ""}`}
                      onClick={() => handleLikeToggle(post._id)}
                      disabled={likeBusyId === post._id}
                      aria-label="Like"
                    >
                      {post.likedByViewer ? <MdFavorite /> : <MdOutlineFavoriteBorder />}
                    </button>
                    <button
                      type="button"
                      className={`${styles.actionBtn} ${styles.iconOnlyBtn}`}
                      onClick={() => handleOpenComments(post._id)}
                      aria-label="Comment"
                    >
                      <MdOutlineChatBubbleOutline />
                    </button>
                    <button
                      type="button"
                      className={`${styles.actionBtn} ${styles.iconOnlyBtn}`}
                      onClick={() => handleShareOpen(post)}
                      aria-label="Share"
                    >
                      <PiShareFatLight />
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </section>
        )}
      </main>

      {activePlaylistPickerPost ? (
        <div
          className={`${styles.playlistPickerOverlay} ${
            playlistPickerClosing ? styles.playlistPickerOverlayClosing : ""
          }`}
          onClick={() => {
            if (!playlistPickerSaving) {
              handleClosePlaylistPicker();
            }
          }}
        >
          <div
            className={`${styles.playlistPickerDialog} ${
              playlistPickerClosing ? styles.playlistPickerDialogClosing : ""
            }`}
            role="dialog"
            aria-modal="true"
            aria-label="Add public post to playlists"
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.playlistPickerHeader}>
              <div>
                <p>Add to playlist</p>
                <h2>{formatDisplayValue(activePlaylistPickerPost.title) || "Public post"}</h2>
              </div>
              <button
                type="button"
                className={styles.playlistPickerClose}
                onClick={handleClosePlaylistPicker}
                disabled={playlistPickerSaving}
                aria-label="Close playlist picker"
              >
                x
              </button>
            </div>

            {playlistsLoading ? (
              <div className={styles.playlistPickerEmpty}>Loading your playlists...</div>
            ) : ownerPlaylists.length === 0 ? (
              <div className={styles.playlistPickerEmpty}>
                You have not created any playlists yet.
              </div>
            ) : (
              <div className={styles.playlistPickerList}>
                {ownerPlaylists.map((playlist) => (
                  <label key={playlist._id} className={styles.playlistPickerOption}>
                    <input
                      type="checkbox"
                      checked={playlistPickerIds.includes(playlist._id)}
                      onChange={() => handlePlaylistToggle(playlist._id)}
                      disabled={playlistPickerSaving}
                    />
                    <div>
                      <strong>{formatDisplayValue(playlist.title) || "Untitled playlist"}</strong>
                      <small>{playlist.postCount || playlist.videoCount || 0} posts</small>
                    </div>
                  </label>
                ))}
              </div>
            )}

            <div className={styles.playlistPickerCreate}>
              <label className={styles.playlistPickerField}>
                <span>Create new playlist</span>
                <input
                  type="text"
                  value={newPlaylistTitle}
                  onChange={(event) => setNewPlaylistTitle(event.target.value)}
                  placeholder="travel reels, portraits, tutorials..."
                  disabled={playlistPickerSaving}
                />
              </label>
              <label className={styles.playlistPickerField}>
                <span>Description</span>
                <textarea
                  value={newPlaylistDescription}
                  onChange={(event) => setNewPlaylistDescription(event.target.value)}
                  placeholder="Tell people what belongs in this playlist"
                  disabled={playlistPickerSaving}
                />
              </label>
            </div>

            <div className={styles.playlistPickerActions}>
              <button
                type="button"
                className={styles.playlistPickerSecondary}
                onClick={handleClosePlaylistPicker}
                disabled={playlistPickerSaving}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.playlistPickerPrimary}
                onClick={handlePlaylistSave}
                disabled={
                  playlistPickerSaving ||
                  playlistsLoading ||
                  (ownerPlaylists.length === 0 && !newPlaylistTitle.trim())
                }
              >
                {playlistPickerSaving ? "Saving..." : "Save playlists"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {likesViewerPost ? (
        <div
          className={styles.playlistPickerOverlay}
          onClick={() => setLikesViewerPost(null)}
        >
          <div
            className={styles.playlistPickerDialog}
            role="dialog"
            aria-modal="true"
            aria-label="Post likes"
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.playlistPickerHeader}>
              <div>
                <p>Post likes</p>
                <h2>{formatDisplayValue(likesViewerPost.title) || "Untitled post"}</h2>
              </div>
              <button
                type="button"
                className={styles.playlistPickerClose}
                onClick={() => setLikesViewerPost(null)}
                aria-label="Close likes viewer"
              >
                x
              </button>
            </div>

            {likesViewerLoading ? (
              <div className={styles.playlistPickerEmpty}>Loading likes...</div>
            ) : likesViewerError ? (
              <div className={styles.playlistPickerEmpty}>{likesViewerError}</div>
            ) : likesViewerItems.length === 0 ? (
              <div className={styles.playlistPickerEmpty}>No one has liked this post yet.</div>
            ) : (
              <div className={styles.playlistPickerList}>
                {likesViewerItems.map((item) => (
                  <button
                    key={item._id}
                    type="button"
                    className={styles.playlistPickerOption}
                    onClick={() => navigate(`/profile/${item.user?._id}`)}
                  >
                    <img
                      src={item.user?.avatar || noProfile}
                      alt={item.user?.username || "Profile"}
                      className={styles.likesAvatar}
                    />
                    <div>
                      <strong>{item.user?.username || "globMe member"}</strong>
                      <small>
                        {formatDisplayValue(item.user?.profession) || "globMe member"}
                      </small>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}

      <AuthAccessPrompt
        open={showAuthPrompt}
        onClose={() => setShowAuthPrompt(false)}
        title="Log in to interact with posts"
        description="Guests can browse posts and profiles publicly. Create an account when you want to react, comment, share, or connect with people."
      />

      <PublicShareSheet
        open={Boolean(shareSheetPost)}
        onClose={() => setShareSheetPost(null)}
        title={formatDisplayValue(shareSheetPost?.title) || "globMe post"}
        description={
          shareSheetPost?.description ||
          `See this post from @${shareSheetPost?.user?.username || "globme"}.`
        }
        shareUrl={
          shareSheetPost?._id && typeof window !== "undefined"
            ? new URL(`/posts/${shareSheetPost._id}`, window.location.origin).toString()
            : ""
        }
      />
    </>
  );
};
