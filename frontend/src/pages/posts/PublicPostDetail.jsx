import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  MdClose,
  MdFavorite,
  MdOutlineBookmarkBorder,
  MdOutlineChatBubbleOutline,
  MdOutlineFavoriteBorder,
} from "react-icons/md";
import { PiShareFatLight } from "react-icons/pi";
import { toast } from "react-toastify";
import api from "../../lib/api";
import noProfile from "../../assets/noProfile.png";
import { AuthAccessPrompt } from "../../components/auth/AuthAccessPrompt";
import { PostCommentsPanel } from "../../components/public/PostCommentsPanel";
import { PublicShareSheet } from "../../components/public/PublicShareSheet";
import { PhotoShortPlayer } from "../../components/media/PhotoShortPlayer";
import { usePageMetadata } from "../../hooks/usePageMetadata";
import styles from "./PublicPostDetail.module.css";

const PUBLIC_POST_CACHE_TTL_MS = 60 * 1000;
const publicPostCache = new Map();
const publicPostPlaylistsCache = new Map();
const publicPostLikesCache = new Map();

const formatDisplayValue = (value) => {
  if (!value) return "";

  return `${value}`
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

const formatRelativeTime = (value) => {
  if (!value) {
    return "Just now";
  }

  const timestamp = new Date(value).getTime();

  if (Number.isNaN(timestamp)) {
    return "Recently";
  }

  const diffMs = Date.now() - timestamp;
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;

  if (diffMs < hour) {
    const minutes = Math.max(1, Math.floor(diffMs / minute));
    return `${minutes}m ago`;
  }

  if (diffMs < day) {
    return `${Math.floor(diffMs / hour)}h ago`;
  }

  if (diffMs < week) {
    return `${Math.floor(diffMs / day)}d ago`;
  }

  return `${Math.floor(diffMs / week)}w ago`;
};

const shouldShowViewCount = (post) =>
  post?.postType === "video" || post?.contentFormat === "reel";

const isMusicPhotoShort = (post) =>
  post?.postType === "image" && post?.contentFormat === "reel" && Boolean(post?.musicUrl);

const PublicPostShellSkeleton = ({ video = false }) =>
  video ? (
    <article className={`${styles.videoShell} ${styles.skeletonBlock}`}>
      <div className={`${styles.videoHero} ${styles.skeletonMedia}`} />
      <section className={styles.videoContent}>
        <div className={styles.videoCreatorRow}>
          <span className={styles.skeletonAvatar} />
          <div className={styles.skeletonStack}>
            <span className={styles.skeletonTitleShort} />
            <span className={styles.skeletonTextShort} />
          </div>
        </div>
        <div className={styles.videoTitleBlock}>
          <span className={styles.skeletonTextShort} />
          <span className={styles.skeletonTitleLong} />
          <div className={styles.videoMetaRow}>
            <span className={styles.skeletonMetaPill} />
            <span className={styles.skeletonMetaPill} />
            <span className={styles.skeletonMetaPill} />
          </div>
        </div>
        <div className={styles.videoActionRail}>
          {Array.from({ length: 6 }).map((_, index) => (
            <span key={`video-action-skeleton-${index}`} className={styles.skeletonActionButton} />
          ))}
        </div>
        <section className={`${styles.videoPanel} ${styles.skeletonBlock}`}>
          <div className={styles.skeletonStack}>
            <span className={styles.skeletonTitleShort} />
            <span className={styles.skeletonTextLong} />
            <span className={styles.skeletonTextLong} />
          </div>
        </section>
      </section>
    </article>
  ) : (
    <article className={`${styles.card} ${styles.skeletonBlock}`}>
      <div className={styles.profileRow}>
        <span className={styles.skeletonAvatar} />
        <div className={styles.skeletonStack}>
          <span className={styles.skeletonTitleShort} />
          <span className={styles.skeletonTextShort} />
        </div>
      </div>
      <div className={`${styles.mediaFrame} ${styles.skeletonMedia}`} />
      <div className={`${styles.copy} ${styles.skeletonStack}`}>
        <span className={styles.skeletonTextShort} />
        <span className={styles.skeletonTitleLong} />
        <span className={styles.skeletonTextLong} />
        <span className={styles.skeletonTextLong} />
      </div>
      <div className={styles.statGroup}>
        {Array.from({ length: 4 }).map((_, index) => (
          <span key={`stat-skeleton-${index}`} className={styles.skeletonMetaPill} />
        ))}
      </div>
      <div className={styles.actionGroup}>
        {Array.from({ length: 4 }).map((_, index) => (
          <span key={`action-skeleton-${index}`} className={styles.skeletonActionButton} />
        ))}
      </div>
    </article>
  );

const PublicPickerListSkeleton = ({ count = 4, avatar = false }) => (
  <div className={styles.playlistPickerList}>
    {Array.from({ length: count }).map((_, index) => (
      <div key={`picker-list-skeleton-${index}`} className={`${styles.playlistPickerOption} ${styles.skeletonBlock}`}>
        {avatar ? <span className={styles.skeletonLikesAvatar} /> : <span className={styles.skeletonCheckbox} />}
        <div className={styles.skeletonStack}>
          <span className={styles.skeletonTitleShort} />
          <span className={styles.skeletonTextShort} />
        </div>
      </div>
    ))}
  </div>
);

export const PublicPostDetail = () => {
  const { postId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [watchLaterLoading, setWatchLaterLoading] = useState(false);
  const [likeLoading, setLikeLoading] = useState(false);
  const [ownerPlaylists, setOwnerPlaylists] = useState([]);
  const [playlistsLoading, setPlaylistsLoading] = useState(false);
  const [playlistPickerIds, setPlaylistPickerIds] = useState([]);
  const [playlistPickerOpen, setPlaylistPickerOpen] = useState(false);
  const [playlistPickerSaving, setPlaylistPickerSaving] = useState(false);
  const [playlistPickerClosing, setPlaylistPickerClosing] = useState(false);
  const [newPlaylistTitle, setNewPlaylistTitle] = useState("");
  const [newPlaylistDescription, setNewPlaylistDescription] = useState("");
  const [likesViewerOpen, setLikesViewerOpen] = useState(false);
  const [likesViewerLoading, setLikesViewerLoading] = useState(false);
  const [likesViewerItems, setLikesViewerItems] = useState([]);
  const [likesViewerError, setLikesViewerError] = useState("");
  const [commentsOverlayOpen, setCommentsOverlayOpen] = useState(false);
  const [commentsOverlayClosing, setCommentsOverlayClosing] = useState(false);
  const [shareSheetOpen, setShareSheetOpen] = useState(false);
  const commentsOverlayCloseTimeoutRef = useRef(null);
  const playlistPickerCloseTimeoutRef = useRef(null);

  usePageMetadata({
    title: post?.title ? formatDisplayValue(post.title) : "Public post",
    description:
      post?.description ||
      "Explore a public globMe post and open the creator profile before signing in.",
  });

  useEffect(() => {
    let ignore = false;

    const loadPost = async () => {
      try {
        const cachedEntry = publicPostCache.get(postId);
        const hasFreshCache =
          cachedEntry &&
          Date.now() - cachedEntry.updatedAt < PUBLIC_POST_CACHE_TTL_MS;

        if (hasFreshCache) {
          setPost(cachedEntry.payload || null);
          setLoading(false);
        } else {
          setLoading(true);
        }

        setError("");
        const response = await api.get(`/public/posts/${postId}`);
        const payload = response.data?.data || null;

        if (!ignore) {
          setPost(payload);
          publicPostCache.set(postId, {
            updatedAt: Date.now(),
            payload,
          });
        }
      } catch (loadError) {
        if (!ignore) {
          setPost(null);
          setError(loadError.response?.data?.message || "That post could not be loaded.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    loadPost();

    return () => {
      ignore = true;
    };
  }, [postId]);

  useEffect(() => {
    if (!postId || !post) {
      return;
    }

    publicPostCache.set(postId, {
      updatedAt: Date.now(),
      payload: post,
    });
  }, [post, postId]);

  useEffect(() => {
    let ignore = false;

    const recordView = async () => {
      try {
        const response = await api.post(`/public/posts/${postId}/view`);

        if (!ignore) {
          const nextViewCount = Number(response.data?.data?.viewCount ?? 0);
          setPost((prev) =>
            prev
              ? {
                  ...prev,
                  viewCount: nextViewCount,
                }
              : prev,
          );
        }
      } catch {
        // View tracking should not block the detail page.
      }
    };

    recordView();

    return () => {
      ignore = true;
    };
  }, [postId]);

  const isPlaylistPickerVisible = playlistPickerOpen || playlistPickerClosing;

  useEffect(() => {
    if (!isPlaylistPickerVisible) {
      return undefined;
    }

    const previousBodyOverflow = document.body.style.overflow;
    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !playlistPickerSaving) {
        setPlaylistPickerOpen(false);
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isPlaylistPickerVisible, playlistPickerSaving]);

  useEffect(() => {
    if (!likesViewerOpen) {
      return undefined;
    }

    const previousBodyOverflow = document.body.style.overflow;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setLikesViewerOpen(false);
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [likesViewerOpen]);

  const isCommentsOverlayVisible = commentsOverlayOpen || commentsOverlayClosing;

  useEffect(() => {
    if (!isCommentsOverlayVisible) {
      return undefined;
    }

    const previousBodyOverflow = document.body.style.overflow;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setCommentsOverlayOpen(false);
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isCommentsOverlayVisible]);

  useEffect(
    () => () => {
      if (commentsOverlayCloseTimeoutRef.current) {
        window.clearTimeout(commentsOverlayCloseTimeoutRef.current);
      }
      if (playlistPickerCloseTimeoutRef.current) {
        window.clearTimeout(playlistPickerCloseTimeoutRef.current);
      }
    },
    [],
  );

  const isOwnerOfPost = Boolean(user?._id && post?.user?._id && `${user._id}` === `${post.user._id}`);

  const handleShareOpen = () => setShareSheetOpen(true);

  const handleWatchLaterToggle = async () => {
    if (!post?._id) {
      return;
    }

    if (!isAuthenticated) {
      setShowAuthPrompt(true);
      return;
    }

    try {
      setWatchLaterLoading(true);
      const response = await api.post(`/user/watch-later/${post._id}`);
      const isSaved = Boolean(response.data?.data?.savedToWatchLater);

      setPost((prev) =>
        prev
          ? {
              ...prev,
              savedToWatchLater: isSaved,
            }
          : prev,
      );

      toast.success(response.data?.message || "Watch later updated");
    } catch (toggleError) {
      toast.error(toggleError.response?.data?.message || "Watch later update failed");
    } finally {
      setWatchLaterLoading(false);
    }
  };

  const handleLikeToggle = async () => {
    if (!post?._id) {
      return;
    }

    if (!isAuthenticated) {
      setShowAuthPrompt(true);
      return;
    }

    try {
      setLikeLoading(true);
      const response = await api.post(`/user/posts/${post._id}/like`);
      const liked = Boolean(response.data?.data?.liked);
      const likeCount = Number(response.data?.data?.likeCount ?? 0);

      setPost((prev) =>
        prev
          ? {
              ...prev,
              likedByViewer: liked,
              likeCount,
            }
          : prev,
      );
      toast.success(liked ? "Post liked" : "Like removed");
    } catch (toggleError) {
      toast.error(toggleError.response?.data?.message || "Post like could not be updated");
    } finally {
      setLikeLoading(false);
    }
  };

  const handleOpenLikesViewer = async () => {
    if (!post?._id || !isOwnerOfPost) {
      return;
    }

    try {
      setLikesViewerOpen(true);
      const cachedEntry = publicPostLikesCache.get(post._id);
      const hasFreshCache =
        cachedEntry &&
        Date.now() - cachedEntry.updatedAt < PUBLIC_POST_CACHE_TTL_MS;

      if (hasFreshCache) {
        setLikesViewerItems(Array.isArray(cachedEntry.payload) ? cachedEntry.payload : []);
        setLikesViewerLoading(false);
      } else {
        setLikesViewerLoading(true);
      }

      setLikesViewerError("");
      const response = await api.get(`/user/posts/${post._id}/likes`);
      const payload = response.data?.data || {};
      const nextLikes = Array.isArray(payload.likes) ? payload.likes : [];
      setLikesViewerItems(nextLikes);
      publicPostLikesCache.set(post._id, {
        updatedAt: Date.now(),
        payload: nextLikes,
      });
    } catch (loadError) {
      setLikesViewerItems([]);
      setLikesViewerError(loadError.response?.data?.message || "Likes could not be loaded");
    } finally {
      setLikesViewerLoading(false);
    }
  };

  const loadOwnerPlaylists = async () => {
    const ownerCacheKey = user?._id || "";
    const cachedEntry = ownerCacheKey ? publicPostPlaylistsCache.get(ownerCacheKey) : null;
    const hasFreshCache =
      cachedEntry &&
      Date.now() - cachedEntry.updatedAt < PUBLIC_POST_CACHE_TTL_MS;

    if (hasFreshCache) {
      const cachedPlaylists = Array.isArray(cachedEntry.payload) ? cachedEntry.payload : [];
      const cachedSelectedIds = post?._id
        ? cachedPlaylists
          .filter((playlist) =>
            Array.isArray(playlist.videos) &&
            playlist.videos.some((video) => video?._id === post._id),
          )
          .map((playlist) => playlist._id)
        : [];

      setOwnerPlaylists(cachedPlaylists);
      setPlaylistPickerIds(cachedSelectedIds);
      setNewPlaylistTitle("");
      setNewPlaylistDescription("");
      if (playlistPickerCloseTimeoutRef.current) {
        window.clearTimeout(playlistPickerCloseTimeoutRef.current);
        playlistPickerCloseTimeoutRef.current = null;
      }
      setPlaylistPickerClosing(false);
      setPlaylistPickerOpen(true);
      setPlaylistsLoading(false);
    } else {
      setPlaylistsLoading(true);
    }

    try {
      const response = await api.get("/user/playlists");
      const nextPlaylists = Array.isArray(response.data?.data) ? response.data.data : [];
      const nextSelectedIds = post?._id
        ? nextPlaylists
          .filter((playlist) =>
            Array.isArray(playlist.videos) &&
            playlist.videos.some((video) => video?._id === post._id),
          )
          .map((playlist) => playlist._id)
        : [];

      setOwnerPlaylists(nextPlaylists);
      if (ownerCacheKey) {
        publicPostPlaylistsCache.set(ownerCacheKey, {
          updatedAt: Date.now(),
          payload: nextPlaylists,
        });
      }
      setPlaylistPickerIds(nextSelectedIds);
      setNewPlaylistTitle("");
      setNewPlaylistDescription("");
      if (playlistPickerCloseTimeoutRef.current) {
        window.clearTimeout(playlistPickerCloseTimeoutRef.current);
        playlistPickerCloseTimeoutRef.current = null;
      }
      setPlaylistPickerClosing(false);
      setPlaylistPickerOpen(true);
    } catch (loadError) {
      toast.error(loadError.response?.data?.message || "Playlists could not be loaded");
    } finally {
      setPlaylistsLoading(false);
    }
  };

  const handleOpenPlaylistPicker = async () => {
    if (!post?._id) {
      return;
    }

    if (!isAuthenticated) {
      setShowAuthPrompt(true);
      return;
    }

    await loadOwnerPlaylists();
  };

  const handleClosePlaylistPicker = () => {
    setPlaylistPickerOpen(false);
    setPlaylistPickerClosing(true);

    if (playlistPickerCloseTimeoutRef.current) {
      window.clearTimeout(playlistPickerCloseTimeoutRef.current);
    }

    playlistPickerCloseTimeoutRef.current = window.setTimeout(() => {
      setPlaylistPickerClosing(false);
      playlistPickerCloseTimeoutRef.current = null;
    }, 220);
  };

  const handlePlaylistToggle = (playlistId) => {
    setPlaylistPickerIds((prev) =>
      prev.includes(playlistId)
        ? prev.filter((item) => item !== playlistId)
        : [...prev, playlistId],
    );
  };

  const handlePlaylistSave = async () => {
    if (!post?._id) {
      return;
    }

    const normalizedNewTitle = newPlaylistTitle.trim().toLowerCase();
    const normalizedNewDescription = newPlaylistDescription.trim();
    const updates = ownerPlaylists.reduce((items, playlist) => {
      const currentVideoIds = Array.isArray(playlist.videos)
        ? playlist.videos.map((video) => video._id)
        : [];
      const currentlyLinked = currentVideoIds.includes(post._id);
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
            ? Array.from(new Set([...currentVideoIds, post._id]))
            : currentVideoIds.filter((item) => item !== post._id),
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
          videoPostIds: [post._id],
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
    } catch (saveError) {
      toast.error(saveError.response?.data?.message || "Playlist update failed");
    } finally {
      setPlaylistPickerSaving(false);
    }
  };

  if (loading) {
    return (
      <main className={styles.page}>
        <PublicPostShellSkeleton />
      </main>
    );
  }

  if (!post) {
    return (
      <main className={styles.page}>
        <section className={styles.placeholder}>
          <h1>Post unavailable</h1>
          <p>{error || "This public post could not be found right now."}</p>
        </section>
      </main>
    );
  }

  const isVideoPost = post.postType === "video";
  const isPhotoShortPost = isMusicPhotoShort(post);
  const creatorLabel =
    formatDisplayValue(post.user?.profession) || "globMe creator";
  const publishedLabel = formatRelativeTime(post.createdAt || post.postDate);
  const handleCommentCountChange = (nextCommentCount) => {
    setPost((prev) =>
      prev
        ? {
            ...prev,
            commentCount: nextCommentCount,
          }
        : prev,
    );
  };
  const handleOpenComments = () => {
    if (commentsOverlayCloseTimeoutRef.current) {
      window.clearTimeout(commentsOverlayCloseTimeoutRef.current);
      commentsOverlayCloseTimeoutRef.current = null;
    }

    setCommentsOverlayClosing(false);
    setCommentsOverlayOpen(true);
  };

  const handleCloseComments = () => {
    setCommentsOverlayOpen(false);
    setCommentsOverlayClosing(true);

    if (commentsOverlayCloseTimeoutRef.current) {
      window.clearTimeout(commentsOverlayCloseTimeoutRef.current);
    }

    commentsOverlayCloseTimeoutRef.current = window.setTimeout(() => {
      setCommentsOverlayClosing(false);
      commentsOverlayCloseTimeoutRef.current = null;
    }, 220);
  };

  return (
    <>
      <main className={`${styles.page} ${isVideoPost ? styles.videoPage : ""}`}>
        {isVideoPost ? (
          <article className={styles.videoShell}>
            <div className={styles.videoHero}>
              <video
                src={post.url}
                className={styles.videoPlayer}
                controls
                autoPlay
                playsInline
                preload="metadata"
              />
            </div>

            <section className={styles.videoContent}>
              <button
                type="button"
                className={styles.videoCreatorRow}
                onClick={() => navigate(`/profile/${post.user?._id}`)}
              >
                <img
                  src={post.user?.avatar || noProfile}
                  alt={post.user?.username || "Profile"}
                  className={styles.videoAvatar}
                />
                <div className={styles.videoCreatorMeta}>
                  <strong>{post.user?.username || "globMe member"}</strong>
                  <span>{creatorLabel}</span>
                </div>
              </button>

              <div className={styles.videoTitleBlock}>
                <p className={styles.videoHandle}>
                  @{post.user?.username || "globme"}
                </p>
                <h1>{formatDisplayValue(post.title) || "Public video"}</h1>
                <div className={styles.videoMetaRow}>
                  <span>{creatorLabel}</span>
                  <span>{publishedLabel}</span>
                  {shouldShowViewCount(post) ? (
                    <span>{post.viewCount || 0} views</span>
                  ) : null}
                  {isOwnerOfPost ? (
                    <button
                      type="button"
                      className={styles.statButton}
                      onClick={handleOpenLikesViewer}
                    >
                      {post.likeCount || 0} likes
                    </button>
                  ) : (
                    <span>{post.likeCount || 0} likes</span>
                  )}
                </div>
              </div>

              <div className={styles.videoActionRail}>
                <button
                  type="button"
                  className={styles.videoChipPrimary}
                  onClick={() => navigate(`/profile/${post.user?._id}`)}
                >
                  Open profile
                </button>
                <button
                  type="button"
                  className={styles.videoChip}
                  onClick={handleWatchLaterToggle}
                >
                  <MdOutlineBookmarkBorder />
                  {watchLaterLoading
                    ? "Saving..."
                    : post.savedToWatchLater
                      ? "Saved"
                      : "Watch later"}
                </button>
                <button
                  type="button"
                  className={styles.videoChip}
                  onClick={handleOpenPlaylistPicker}
                  aria-label="Add to playlist"
                >
                  +
                </button>
                <button
                  type="button"
                  className={`${styles.videoChip} ${styles.videoIconOnly} ${post.likedByViewer ? styles.actionBtnActive : ""}`}
                  onClick={handleLikeToggle}
                  disabled={likeLoading}
                  aria-label="Like"
                >
                  {post.likedByViewer ? <MdFavorite /> : <MdOutlineFavoriteBorder />}
                </button>
                <button
                  type="button"
                  className={`${styles.videoChip} ${styles.videoIconOnly}`}
                  onClick={handleOpenComments}
                  aria-label="Comment"
                >
                  <MdOutlineChatBubbleOutline />
                </button>
                <button
                  type="button"
                  className={`${styles.videoChip} ${styles.videoIconOnly}`}
                  onClick={handleShareOpen}
                  aria-label="Share"
                >
                  <PiShareFatLight />
                </button>
              </div>

              <section className={styles.videoPanel}>
                <div className={styles.videoPanelHeader}>
                  <strong>About this video</strong>
                  <span>
                    {post.commentCount || 0} comments • {post.shareCount || 0} shares
                  </span>
                </div>
                <p>
                  {post.description ||
                    "This video is publicly visible on globMe."}
                </p>
              </section>

            </section>
          </article>
        ) : (
          <article className={styles.card}>
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
              <div>
                <strong>{post.user?.username || "globMe member"}</strong>
                <span>{creatorLabel}</span>
              </div>
            </button>

            <div className={styles.mediaFrame}>
              {isPhotoShortPost ? (
                <PhotoShortPlayer
                  imageUrl={post.url}
                  musicUrl={post.musicUrl}
                  musicSourceType={post.musicSourceType || "audio"}
                  durationSeconds={post.durationSeconds || post.musicDurationSeconds}
                  title={post.title || "Public photo short"}
                  imageClassName={styles.media}
                />
              ) : (
                <img
                  src={post.url}
                  alt={post.title || "Public post"}
                  className={styles.media}
                />
              )}
            </div>

            <div className={styles.copy}>
              <p className={styles.kicker}>
                {formatDisplayValue(post.postType) || "Post"}
                {post.contentFormat ? ` | ${formatDisplayValue(post.contentFormat)}` : ""}
              </p>
              <h1>{formatDisplayValue(post.title) || "Public post"}</h1>
              <p>{post.description || "This post is publicly visible on globMe."}</p>
            </div>

            <div className={styles.statGroup}>
              {shouldShowViewCount(post) ? (
                <span>{post.viewCount || 0} views</span>
              ) : null}
              {isOwnerOfPost ? (
                <button
                  type="button"
                  className={styles.statButton}
                  onClick={handleOpenLikesViewer}
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
              <button
                type="button"
                className={styles.actionBtn}
                onClick={handleOpenPlaylistPicker}
                aria-label="Add to playlist"
              >
                +
              </button>
              <button
                type="button"
                className={`${styles.actionBtn} ${styles.iconOnlyBtn} ${post.likedByViewer ? styles.actionBtnActive : ""}`}
                onClick={handleLikeToggle}
                disabled={likeLoading}
                aria-label="Like"
              >
                {post.likedByViewer ? <MdFavorite /> : <MdOutlineFavoriteBorder />}
              </button>
              <button
                type="button"
                className={`${styles.actionBtn} ${styles.iconOnlyBtn}`}
                onClick={handleOpenComments}
                aria-label="Comment"
              >
                <MdOutlineChatBubbleOutline />
              </button>
              <button
                type="button"
                className={`${styles.actionBtn} ${styles.iconOnlyBtn}`}
                onClick={handleShareOpen}
                aria-label="Share"
              >
                <PiShareFatLight />
              </button>
            </div>

          </article>
        )}
      </main>

      {isCommentsOverlayVisible ? (
        <div
          className={`${styles.commentsOverlay} ${isVideoPost ? styles.commentsOverlayVideo : ""} ${
            commentsOverlayClosing ? styles.commentsOverlayClosing : ""
          }`}
          onClick={handleCloseComments}
        >
          <div
            className={`${styles.commentsOverlayCard} ${isVideoPost ? styles.commentsOverlayCardVideo : ""} ${
              commentsOverlayClosing ? styles.commentsOverlayCardClosing : ""
            }`}
            role="dialog"
            aria-modal="true"
            aria-label="Post comments"
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.commentsOverlayHeader}>
              <div>
                <h2>{formatDisplayValue(post.title) || "Public post"}</h2>
              </div>
              <button
                type="button"
                className={styles.commentsOverlayClose}
                onClick={handleCloseComments}
                aria-label="Close comments"
              >
                <MdClose />
              </button>
            </div>

            <PostCommentsPanel
              postId={post._id}
              postOwnerId={post.user?._id}
              postOwnerUsername={post.user?.username || ""}
              commentCount={post.commentCount || 0}
              onCommentCountChange={handleCommentCountChange}
              onRequireAuth={() => setShowAuthPrompt(true)}
            />
          </div>
        </div>
      ) : null}

      {isPlaylistPickerVisible ? (
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
                <h2>{formatDisplayValue(post.title) || "Public post"}</h2>
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
              <PublicPickerListSkeleton />
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

      {likesViewerOpen ? (
        <div
          className={styles.playlistPickerOverlay}
          onClick={() => setLikesViewerOpen(false)}
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
                <h2>{formatDisplayValue(post.title) || "Public post"}</h2>
              </div>
              <button
                type="button"
                className={styles.playlistPickerClose}
                onClick={() => setLikesViewerOpen(false)}
                aria-label="Close likes viewer"
              >
                x
              </button>
            </div>

            {likesViewerLoading ? (
              <PublicPickerListSkeleton avatar />
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
        title="Log in to interact with this post"
        description="Guests can browse public posts, but reactions, comments, and shares need an account so your actions can be tracked."
      />

      <PublicShareSheet
        open={shareSheetOpen}
        onClose={() => setShareSheetOpen(false)}
        title={formatDisplayValue(post.title) || "globMe post"}
        description={post.description || `See this post from @${post.user?.username || "globme"}.`}
        shareUrl={
          typeof window !== "undefined"
            ? new URL(`/posts/${post._id}`, window.location.origin).toString()
            : ""
        }
      />
    </>
  );
};
