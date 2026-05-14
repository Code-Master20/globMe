import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MdOutlineChatBubbleOutline, MdOutlineFavoriteBorder } from "react-icons/md";
import { PiShareFatLight } from "react-icons/pi";
import { toast } from "react-toastify";
import { useSelector } from "react-redux";
import api from "../../lib/api";
import { AuthAccessPrompt } from "../auth/AuthAccessPrompt";
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

export const PublicFeedView = ({
  title,
  description,
  filterType = "all",
  showStoryTray = false,
  emptyHeading,
  emptyCopy,
  seoTitle,
  seoDescription,
}) => {
  const navigate = useNavigate();
  const { isAuthenticated } = useSelector((state) => state.auth);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [watchLaterBusyId, setWatchLaterBusyId] = useState("");
  const [ownerPlaylists, setOwnerPlaylists] = useState([]);
  const [playlistsLoading, setPlaylistsLoading] = useState(false);
  const [playlistPickerPost, setPlaylistPickerPost] = useState(null);
  const [playlistPickerIds, setPlaylistPickerIds] = useState([]);
  const [playlistPickerSaving, setPlaylistPickerSaving] = useState(false);
  const [newPlaylistTitle, setNewPlaylistTitle] = useState("");
  const [newPlaylistDescription, setNewPlaylistDescription] = useState("");

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

  useEffect(() => {
    if (!playlistPickerPost) {
      return undefined;
    }

    const previousBodyOverflow = document.body.style.overflow;
    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !playlistPickerSaving) {
        setPlaylistPickerPost(null);
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [playlistPickerPost, playlistPickerSaving]);

  const handleProtectedAction = () => {
    if (isAuthenticated) {
      toast.info("This action will be wired next.");
      return;
    }

    setShowAuthPrompt(true);
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

  const handleOpenPlaylistPicker = async (post) => {
    if (!post?._id) {
      return;
    }

    if (!isAuthenticated) {
      setShowAuthPrompt(true);
      return;
    }

    try {
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
      setPlaylistPickerPost(null);
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
      setPlaylistPickerPost(null);
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

        {loading ? (
          <section className={styles.placeholder}>Loading public posts...</section>
        ) : posts.length === 0 ? (
          <section className={styles.placeholder}>
            <h2>{emptyHeading}</h2>
            <p>{emptyCopy}</p>
          </section>
        ) : (
          <section className={styles.feedGrid}>
            {posts.map((post) => (
              <article key={post._id} className={styles.feedCard}>
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
                        src={post.url}
                        className={styles.media}
                        muted
                        playsInline
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
                    <span>{post.likeCount || 0} likes</span>
                    <span>{post.commentCount || 0} comments</span>
                    <span>{post.shareCount || 0} shares</span>
                  </div>

                  <div className={styles.actionGroup}>
                    {post.postType === "video" ? (
                      <button
                        type="button"
                        className={styles.actionBtn}
                        onClick={() => handleWatchLaterToggle(post._id)}
                        disabled={watchLaterBusyId === post._id}
                      >
                        {watchLaterBusyId === post._id
                          ? "Saving..."
                          : post.savedToWatchLater
                            ? "Saved"
                            : "Watch later"}
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className={styles.actionBtn}
                      onClick={() => handleOpenPlaylistPicker(post)}
                    >
                      Add to playlist
                    </button>
                    <button
                      type="button"
                      className={styles.actionBtn}
                      onClick={handleProtectedAction}
                    >
                      <MdOutlineFavoriteBorder />
                      Like
                    </button>
                    <button
                      type="button"
                      className={styles.actionBtn}
                      onClick={handleProtectedAction}
                    >
                      <MdOutlineChatBubbleOutline />
                      Comment
                    </button>
                    <button
                      type="button"
                      className={styles.actionBtn}
                      onClick={handleProtectedAction}
                    >
                      <PiShareFatLight />
                      Share
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </section>
        )}
      </main>

      {playlistPickerPost ? (
        <div
          className={styles.playlistPickerOverlay}
          onClick={() => {
            if (!playlistPickerSaving) {
              setPlaylistPickerPost(null);
            }
          }}
        >
          <div
            className={styles.playlistPickerDialog}
            role="dialog"
            aria-modal="true"
            aria-label="Add public post to playlists"
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.playlistPickerHeader}>
              <div>
                <p>Add to playlist</p>
                <h2>{formatDisplayValue(playlistPickerPost.title) || "Public post"}</h2>
              </div>
              <button
                type="button"
                className={styles.playlistPickerClose}
                onClick={() => setPlaylistPickerPost(null)}
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
                onClick={() => setPlaylistPickerPost(null)}
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

      <AuthAccessPrompt
        open={showAuthPrompt}
        onClose={() => setShowAuthPrompt(false)}
        title="Log in to interact with posts"
        description="Guests can browse posts and profiles publicly. Create an account when you want to react, comment, share, or connect with people."
      />
    </>
  );
};
