import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { NavLink, useNavigate } from "react-router-dom";
import {
  MdAlternateEmail,
  MdLockReset,
  MdLogout,
  MdOutlineOndemandVideo,
  MdOutlinePlaylistPlay,
  MdOutlineWatchLater,
  MdRefresh,
} from "react-icons/md";
import { toast } from "react-toastify";
import styles from "./Dashboard.module.css";
import { usePageMetadata } from "../../hooks/usePageMetadata";
import api from "../../lib/api";
import { checkMe, logOut } from "../../store/auth/authThunks";

const formatLabel = (value) => {
  if (!value) {
    return "Uncategorized";
  }

  return `${value}`
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

const groupVideosByCategory = (posts) =>
  posts.reduce((accumulator, post) => {
    const category = post.category || "uncategorized";

    if (!accumulator[category]) {
      accumulator[category] = [];
    }

    accumulator[category].push(post);
    return accumulator;
  }, {});

const initialEmailForm = {
  newEmail: "",
  currentEmailOtp: "",
  newEmailOtp: "",
};

const initialPlaylistForm = {
  title: "",
  description: "",
  selectedVideoIds: [],
};

const formatDuration = (seconds) => {
  const totalSeconds = Math.max(0, Math.round(Number(seconds) || 0));
  const minutes = Math.floor(totalSeconds / 60);
  const remainder = totalSeconds % 60;
  return `${minutes}:${`${remainder}`.padStart(2, "0")}`;
};

export const Dashboard = () => {
  usePageMetadata({
    title: "Owner dashboard",
    description: "Manage profile-owner tools, account controls, and your video workspace.",
    robots: "noindex, nofollow",
  });

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, loading } = useSelector((state) => state.auth);

  const [ownerPosts, setOwnerPosts] = useState([]);
  const [videoLibrary, setVideoLibrary] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [watchLaterVideos, setWatchLaterVideos] = useState([]);
  const [videoCategories, setVideoCategories] = useState([]);
  const [libraryLoading, setLibraryLoading] = useState(true);
  const [libraryError, setLibraryError] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [categoryDrafts, setCategoryDrafts] = useState({});
  const [savingCategoryId, setSavingCategoryId] = useState("");
  const [watchLaterBusyId, setWatchLaterBusyId] = useState("");
  const [playlistForm, setPlaylistForm] = useState(initialPlaylistForm);
  const [editingPlaylistId, setEditingPlaylistId] = useState("");
  const [playlistLoading, setPlaylistLoading] = useState(false);

  const [emailForm, setEmailForm] = useState(initialEmailForm);
  const [emailStep, setEmailStep] = useState("request");
  const [emailMeta, setEmailMeta] = useState({
    currentEmail: "",
    newEmail: "",
  });
  const [emailLoading, setEmailLoading] = useState(false);

  const groupedVideos = groupVideosByCategory(
    selectedCategory === "all"
      ? videoLibrary
      : videoLibrary.filter((post) => (post.category || "uncategorized") === selectedCategory),
  );

  const loadDashboardData = async () => {
    try {
      setLibraryLoading(true);
      setLibraryError("");

      const [postsResponse, libraryResponse, watchLaterResponse, playlistsResponse] =
        await Promise.all([
          api.get("/user/posts"),
        api.get("/user/videos"),
        api.get("/user/watch-later"),
        api.get("/user/playlists"),
        ]);

      setOwnerPosts(Array.isArray(postsResponse.data?.data) ? postsResponse.data.data : []);
      const libraryPayload = libraryResponse.data?.data || {};
      const nextPosts = Array.isArray(libraryPayload.posts) ? libraryPayload.posts : [];
      const nextCategories = Array.isArray(libraryPayload.categories)
        ? libraryPayload.categories
        : [];

      setVideoLibrary(nextPosts);
      setVideoCategories(nextCategories);
      setCategoryDrafts(
        nextPosts.reduce((accumulator, post) => {
          accumulator[post._id] =
            post.category && post.category !== "uncategorized" ? post.category : "";
          return accumulator;
        }, {}),
      );
      setWatchLaterVideos(Array.isArray(watchLaterResponse.data?.data) ? watchLaterResponse.data.data : []);
      setPlaylists(Array.isArray(playlistsResponse.data?.data) ? playlistsResponse.data.data : []);
    } catch (error) {
      setLibraryError(error.response?.data?.message || "Dashboard data could not be loaded.");
    } finally {
      setLibraryLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleLogout = async () => {
    const resultAction = await dispatch(logOut());

    if (logOut.rejected.match(resultAction)) {
      toast.error(resultAction.payload?.message || "Logout failed");
      return;
    }

    localStorage.removeItem("user");
    localStorage.removeItem("tries");
    localStorage.removeItem("timeRemains");
    localStorage.removeItem("otpResetTrigger");
    localStorage.removeItem("tryPassReset");
    localStorage.removeItem("tryRemains");
    localStorage.removeItem("runCount");

    toast.success(resultAction.payload?.message || "Logged out");
    navigate("/", { replace: true });
  };

  const handleEmailInputChange = (event) => {
    const { name, value } = event.target;

    setEmailForm((prev) => ({
      ...prev,
      [name]: name === "newEmail" ? value.trim().toLowerCase() : value.trim(),
    }));
  };

  const handleEmailRequest = async (event) => {
    event.preventDefault();
    setEmailLoading(true);

    try {
      const response = await api.post("/auth/change-email/request", {
        newEmail: emailForm.newEmail,
      });

      const payload = response.data?.data || {};
      setEmailMeta({
        currentEmail: payload.currentEmail || user?.email || "",
        newEmail: payload.newEmail || emailForm.newEmail,
      });
      setEmailStep("verify");
      toast.success(response.data?.message || "Verification codes sent");
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not send email OTPs");
    } finally {
      setEmailLoading(false);
    }
  };

  const handleEmailVerify = async (event) => {
    event.preventDefault();
    setEmailLoading(true);

    try {
      const response = await api.post("/auth/change-email/verify", {
        newEmail: emailMeta.newEmail || emailForm.newEmail,
        currentEmailOtp: emailForm.currentEmailOtp,
        newEmailOtp: emailForm.newEmailOtp,
      });

      await dispatch(checkMe());
      setEmailForm(initialEmailForm);
      setEmailMeta({ currentEmail: "", newEmail: "" });
      setEmailStep("request");
      toast.success(response.data?.message || "Email updated successfully");
    } catch (error) {
      toast.error(error.response?.data?.message || "Email could not be updated");
    } finally {
      setEmailLoading(false);
    }
  };

  const handleCategoryDraftChange = (postId, value) => {
    setCategoryDrafts((prev) => ({
      ...prev,
      [postId]: value.trim().toLowerCase(),
    }));
  };

  const handleCategorySave = async (postId) => {
    setSavingCategoryId(postId);

    try {
      const response = await api.patch(`/user/videos/${postId}/category`, {
        category: categoryDrafts[postId] || "",
      });
      const nextCategory = response.data?.data?.category || "uncategorized";

      setVideoLibrary((prev) =>
        prev.map((post) =>
          post._id === postId
            ? {
                ...post,
                category: nextCategory,
              }
            : post,
        ),
      );

      const nextPosts = videoLibrary.map((post) =>
        post._id === postId ? { ...post, category: nextCategory } : post,
      );
      const nextSummary = Object.entries(
        nextPosts.reduce((accumulator, post) => {
          const categoryKey = post.category || "uncategorized";
          accumulator[categoryKey] = (accumulator[categoryKey] || 0) + 1;
          return accumulator;
        }, {}),
      ).map(([category, count]) => ({ category, count }));

      setVideoCategories(nextSummary);
      toast.success(response.data?.message || "Video category updated");
    } catch (error) {
      toast.error(error.response?.data?.message || "Video category update failed");
    } finally {
      setSavingCategoryId("");
    }
  };

  const handleWatchLaterToggle = async (postId) => {
    setWatchLaterBusyId(postId);

    try {
      const response = await api.post(`/user/watch-later/${postId}`);
      const isSaved = Boolean(response.data?.data?.savedToWatchLater);

      if (isSaved) {
        const targetPost = videoLibrary.find((post) => post._id === postId);

        if (targetPost) {
          setWatchLaterVideos((prev) =>
            prev.some((post) => post._id === postId) ? prev : [targetPost, ...prev],
          );
        }
      } else {
        setWatchLaterVideos((prev) => prev.filter((post) => post._id !== postId));
      }

      toast.success(response.data?.message || "Watch later updated");
    } catch (error) {
      toast.error(error.response?.data?.message || "Watch later update failed");
    } finally {
      setWatchLaterBusyId("");
    }
  };

  const handlePlaylistFieldChange = (event) => {
    const { name, value } = event.target;

    setPlaylistForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handlePlaylistVideoToggle = (postId) => {
    setPlaylistForm((prev) => ({
      ...prev,
      selectedVideoIds: prev.selectedVideoIds.includes(postId)
        ? prev.selectedVideoIds.filter((item) => item !== postId)
        : [...prev.selectedVideoIds, postId],
    }));
  };

  const resetPlaylistForm = () => {
    setPlaylistForm(initialPlaylistForm);
    setEditingPlaylistId("");
  };

  const handlePlaylistEdit = (playlist) => {
    setEditingPlaylistId(playlist._id);
    setPlaylistForm({
      title: playlist.title || "",
      description: playlist.description || "",
      selectedVideoIds: Array.isArray(playlist.videos)
        ? playlist.videos.map((video) => video._id)
        : [],
    });
  };

  const handlePlaylistSubmit = async (event) => {
    event.preventDefault();
    setPlaylistLoading(true);

    const payload = {
      title: playlistForm.title.trim().toLowerCase(),
      description: playlistForm.description.trim(),
      videoPostIds: playlistForm.selectedVideoIds,
    };

    try {
      const response = editingPlaylistId
        ? await api.patch(`/user/playlists/${editingPlaylistId}`, payload)
        : await api.post("/user/playlists", payload);
      const nextPlaylist = response.data?.data;

      if (editingPlaylistId) {
        setPlaylists((prev) =>
          prev.map((playlist) =>
            playlist._id === editingPlaylistId ? nextPlaylist : playlist,
          ),
        );
      } else {
        setPlaylists((prev) => [nextPlaylist, ...prev]);
      }

      resetPlaylistForm();
      toast.success(response.data?.message || "Playlist saved successfully");
    } catch (error) {
      toast.error(error.response?.data?.message || "Playlist could not be saved");
    } finally {
      setPlaylistLoading(false);
    }
  };

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div>
          <p className={styles.kicker}>Profile owner workspace</p>
          <h1>Manage your account, videos, and private owner tools.</h1>
          <p className={styles.subcopy}>
            This is the first pass of the owner dashboard, so the important controls
            are live now and we can keep extending it together.
          </p>
        </div>

        <div className={styles.heroActions}>
          <NavLink to="/profile" className={styles.secondaryAction}>
            Open profile
          </NavLink>
          <button
            type="button"
            className={styles.secondaryAction}
            onClick={loadDashboardData}
            disabled={libraryLoading}
          >
            <MdRefresh />
            Refresh
          </button>
        </div>
      </section>

      <section className={styles.summaryGrid}>
        <article className={styles.summaryCard}>
          <span>Current email</span>
          <strong>{user?.email || "Unavailable"}</strong>
          <small>Use the email change panel below to move the account safely.</small>
        </article>

        <article className={styles.summaryCard}>
          <span>Your videos</span>
          <strong>{videoLibrary.length}</strong>
          <small>Grouped by category so you can organize them like a creator library.</small>
        </article>

        <article className={styles.summaryCard}>
          <span>Published posts</span>
          <strong>{ownerPosts.length}</strong>
          <small>Photo articles, photo reels, video reels, and long videos all count here.</small>
        </article>

        <article className={styles.summaryCard}>
          <span>Watch later</span>
          <strong>{watchLaterVideos.length}</strong>
          <small>Saved videos are collected here for your later viewing queue.</small>
        </article>

        <article className={styles.summaryCard}>
          <span>Public playlists</span>
          <strong>{playlists.length}</strong>
          <small>These playlist shelves are visible to visitors on your profile.</small>
        </article>
      </section>

      <section className={styles.grid}>
        <article className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <p>Account actions</p>
              <h2>Owner controls</h2>
            </div>
          </div>

          <div className={styles.actionStack}>
            <NavLink to="/reset-password" className={styles.primaryAction}>
              <MdLockReset />
              Reset password
            </NavLink>

            <button type="button" className={styles.primaryAction} onClick={handleLogout}>
              <MdLogout />
              {loading ? "Logging out..." : "Logout"}
            </button>
          </div>
        </article>

        <article className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <p>Email security</p>
              <h2>Change email with dual OTP</h2>
            </div>
          </div>

          {emailStep === "request" ? (
            <form className={styles.form} onSubmit={handleEmailRequest}>
              <label className={styles.field}>
                <span>New email address</span>
                <input
                  type="email"
                  name="newEmail"
                  placeholder="new-email@example.com"
                  value={emailForm.newEmail}
                  onChange={handleEmailInputChange}
                />
              </label>

              <button
                type="submit"
                className={styles.primarySubmit}
                disabled={emailLoading || !emailForm.newEmail}
              >
                <MdAlternateEmail />
                {emailLoading ? "Sending OTPs..." : "Send OTPs to old and new email"}
              </button>
            </form>
          ) : (
            <form className={styles.form} onSubmit={handleEmailVerify}>
              <div className={styles.noticeBox}>
                <strong>Verification codes sent</strong>
                <p>Current email: {emailMeta.currentEmail}</p>
                <p>New email: {emailMeta.newEmail}</p>
              </div>

              <label className={styles.field}>
                <span>OTP from current email</span>
                <input
                  type="text"
                  name="currentEmailOtp"
                  inputMode="numeric"
                  maxLength={8}
                  value={emailForm.currentEmailOtp}
                  onChange={handleEmailInputChange}
                />
              </label>

              <label className={styles.field}>
                <span>OTP from new email</span>
                <input
                  type="text"
                  name="newEmailOtp"
                  inputMode="numeric"
                  maxLength={8}
                  value={emailForm.newEmailOtp}
                  onChange={handleEmailInputChange}
                />
              </label>

              <div className={styles.formFooter}>
                <button
                  type="button"
                  className={styles.secondaryAction}
                  onClick={() => {
                    setEmailStep("request");
                    setEmailMeta({ currentEmail: "", newEmail: "" });
                    setEmailForm(initialEmailForm);
                  }}
                >
                  Start over
                </button>

                <button
                  type="submit"
                  className={styles.primarySubmit}
                  disabled={
                    emailLoading ||
                    !emailForm.currentEmailOtp ||
                    !emailForm.newEmailOtp
                  }
                >
                  <MdAlternateEmail />
                  {emailLoading ? "Verifying..." : "Verify and update email"}
                </button>
              </div>
            </form>
          )}
        </article>
      </section>

      <section className={styles.grid}>
        <article className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <p>Public playlists</p>
              <h2>Build creator-style video shelves</h2>
            </div>
          </div>

          <form className={styles.form} onSubmit={handlePlaylistSubmit}>
            <label className={styles.field}>
              <span>Playlist title</span>
              <input
                type="text"
                name="title"
                placeholder="frontend tutorials"
                value={playlistForm.title}
                onChange={handlePlaylistFieldChange}
              />
            </label>

            <label className={styles.field}>
              <span>Description</span>
              <input
                type="text"
                name="description"
                placeholder="Short description for visitors"
                value={playlistForm.description}
                onChange={handlePlaylistFieldChange}
              />
            </label>

            <div className={styles.playlistPicker}>
              {videoLibrary.length === 0 ? (
                <div className={styles.emptyState}>
                  Add video posts first, then you can arrange them into public playlists.
                </div>
              ) : (
                videoLibrary.map((post) => (
                  <label key={post._id} className={styles.playlistOption}>
                    <input
                      type="checkbox"
                      checked={playlistForm.selectedVideoIds.includes(post._id)}
                      onChange={() => handlePlaylistVideoToggle(post._id)}
                    />
                    <div>
                      <strong>{formatLabel(post.title) || "Untitled video"}</strong>
                      <small>{formatLabel(post.category)}</small>
                    </div>
                  </label>
                ))
              )}
            </div>

            <div className={styles.formFooter}>
              {editingPlaylistId ? (
                <button
                  type="button"
                  className={styles.secondaryAction}
                  onClick={resetPlaylistForm}
                >
                  Cancel edit
                </button>
              ) : null}

              <button
                type="submit"
                className={styles.primarySubmit}
                disabled={
                  playlistLoading ||
                  !playlistForm.title.trim() ||
                  playlistForm.selectedVideoIds.length === 0
                }
              >
                <MdOutlinePlaylistPlay />
                {playlistLoading
                  ? "Saving..."
                  : editingPlaylistId
                    ? "Update playlist"
                    : "Create playlist"}
              </button>
            </div>
          </form>
        </article>

        <article className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <p>Video library</p>
              <h2>Separate videos category-wise</h2>
            </div>
          </div>

          {libraryLoading ? (
            <div className={styles.emptyState}>Loading your video workspace...</div>
          ) : libraryError ? (
            <div className={styles.emptyState}>{libraryError}</div>
          ) : videoLibrary.length === 0 ? (
            <div className={styles.emptyState}>
              Your uploaded video posts will appear here once they exist.
            </div>
          ) : (
            <>
              <div className={styles.categoryFilterRow}>
                <button
                  type="button"
                  className={`${styles.categoryChip} ${
                    selectedCategory === "all" ? styles.categoryChipActive : ""
                  }`}
                  onClick={() => setSelectedCategory("all")}
                >
                  All videos
                </button>
                {videoCategories.map((entry) => (
                  <button
                    type="button"
                    key={entry.category}
                    className={`${styles.categoryChip} ${
                      selectedCategory === entry.category ? styles.categoryChipActive : ""
                    }`}
                    onClick={() => setSelectedCategory(entry.category)}
                  >
                    {formatLabel(entry.category)} ({entry.count})
                  </button>
                ))}
              </div>

              <div className={styles.videoGroupStack}>
                {Object.entries(groupedVideos).map(([category, posts]) => (
                  <section key={category} className={styles.videoGroup}>
                    <div className={styles.videoGroupHeader}>
                      <h3>{formatLabel(category)}</h3>
                      <span>{posts.length} videos</span>
                    </div>

                    <div className={styles.videoList}>
                      {posts.map((post) => (
                        <article key={post._id} className={styles.videoCard}>
                          <div className={styles.videoThumbFrame}>
                            <video src={post.url} className={styles.videoThumb} muted />
                          </div>

                          <div className={styles.videoBody}>
                            <div>
                              <strong>{formatLabel(post.title) || "Untitled video"}</strong>
                              <p>{post.description || "Add a tighter category label when needed."}</p>
                            </div>

                            <div className={styles.inlineForm}>
                              <input
                                type="text"
                                placeholder="category name"
                                value={categoryDrafts[post._id] || ""}
                                onChange={(event) =>
                                  handleCategoryDraftChange(post._id, event.target.value)
                                }
                              />
                              <button
                                type="button"
                                className={styles.inlineAction}
                                onClick={() => handleCategorySave(post._id)}
                                disabled={savingCategoryId === post._id}
                              >
                                <MdOutlineOndemandVideo />
                                {savingCategoryId === post._id ? "Saving..." : "Save category"}
                              </button>
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </>
          )}
        </article>

        <article className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <p>Saved queue</p>
              <h2>Watch later</h2>
            </div>
          </div>

          {libraryLoading ? (
            <div className={styles.emptyState}>Loading saved videos...</div>
          ) : watchLaterVideos.length === 0 ? (
            <div className={styles.emptyState}>
              Save a few videos to watch later and they will appear here.
            </div>
          ) : (
            <div className={styles.savedList}>
              {watchLaterVideos.map((post) => (
                <article key={post._id} className={styles.savedCard}>
                  <div className={styles.savedMeta}>
                    <strong>{formatLabel(post.title) || "Saved video"}</strong>
                    <p>
                      {post.user?.username ? `By ${formatLabel(post.user.username)}` : "Video creator"}
                    </p>
                    <small>{formatLabel(post.category)}</small>
                  </div>

                  <button
                    type="button"
                    className={styles.inlineAction}
                    onClick={() => handleWatchLaterToggle(post._id)}
                    disabled={watchLaterBusyId === post._id}
                  >
                    <MdOutlineWatchLater />
                    {watchLaterBusyId === post._id ? "Updating..." : "Remove"}
                  </button>
                </article>
              ))}
            </div>
          )}
        </article>

        <article className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <p>Playlist library</p>
              <h2>What visitors will see</h2>
            </div>
          </div>

          {playlists.length === 0 ? (
            <div className={styles.emptyState}>
              Public playlists will appear here after you create them from your videos.
            </div>
          ) : (
            <div className={styles.savedList}>
              {playlists.map((playlist) => (
                <article key={playlist._id} className={styles.playlistCard}>
                  <div className={styles.savedMeta}>
                    <strong>{formatLabel(playlist.title)}</strong>
                    <p>{playlist.description || "No description yet."}</p>
                    <small>{playlist.videoCount || 0} videos</small>
                  </div>

                  <button
                    type="button"
                    className={styles.inlineAction}
                    onClick={() => handlePlaylistEdit(playlist)}
                  >
                    <MdOutlinePlaylistPlay />
                    Edit
                  </button>
                </article>
              ))}
            </div>
          )}
        </article>

        <article className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <p>Recent uploads</p>
              <h2>Your latest posts</h2>
            </div>
          </div>

          {ownerPosts.length === 0 ? (
            <div className={styles.emptyState}>
              Publish your first photo or video post and it will show up here.
            </div>
          ) : (
            <div className={styles.recentPostGrid}>
              {ownerPosts.slice(0, 8).map((post) => (
                <article key={post._id} className={styles.recentPostCard}>
                  <div className={styles.recentPostFrame}>
                    {post.postType === "video" ? (
                      <video
                        src={post.url}
                        className={styles.recentPostMedia}
                        muted
                        preload="metadata"
                      />
                    ) : (
                      <img
                        src={post.url}
                        alt={post.title || "Published post"}
                        className={styles.recentPostMedia}
                      />
                    )}
                  </div>

                  <div className={styles.recentPostMeta}>
                    <strong>{formatLabel(post.title) || "Untitled post"}</strong>
                    <span>
                      {post.postType === "video"
                        ? `${formatLabel(post.contentFormat)}${post.durationSeconds ? ` | ${formatDuration(post.durationSeconds)}` : ""}`
                        : formatLabel(post.contentFormat) || "Article"}
                    </span>
                    {Array.isArray(post.tags) && post.tags.length ? (
                      <small>{post.tags.map(formatLabel).join(" | ")}</small>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          )}
        </article>
      </section>
    </main>
  );
};
