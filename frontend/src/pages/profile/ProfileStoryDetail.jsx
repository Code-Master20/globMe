import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { deleteStory } from "../../store/auth/authThunks";
import { deleteStoryHistory } from "../../store/auth/authThunks";
import { usePageMetadata } from "../../hooks/usePageMetadata";
import api from "../../lib/api";
import styles from "./ProfileStoryDetail.module.css";
import noProfile from "../../assets/noProfile.png";

const formatDateLabel = (value) => {
  if (!value) return "";

  const dateValue = new Date(value);

  if (Number.isNaN(dateValue.getTime())) {
    return "";
  }

  return dateValue.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

export const ProfileStoryDetail = () => {
  const { storyEntryId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const audioRef = useRef(null);
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsError, setCommentsError] = useState("");
  const { user, checkingAuth, loading } = useSelector((state) => state.auth);
  const isLiveRoute = storyEntryId === "live";

  const stories = Array.isArray(user?.storyHistory)
    ? user.storyHistory.filter((item) => item?._id && item?.mediaUrl)
    : [];

  const storyEntryFromHistory =
    stories.find((item) => `${item._id}` === `${storyEntryId}`) || null;
  const storyEntry =
    storyEntryFromHistory ||
    (isLiveRoute && user?.story && user?.storyExpiresAt
      ? {
          _id: "live",
          mediaUrl: user.story,
          mediaType: user.storyType || "image",
          audioUrl: user.storyAudio || null,
          likeCount: typeof user.storyLikeCount === "number" ? user.storyLikeCount : 0,
          createdAt: null,
          expiresAt: user.storyExpiresAt,
          isLive: true,
          isActive: true,
        }
      : null);

  usePageMetadata({
    title: storyEntry ? "Your story" : "Story",
    description: "Open one of your recent stories with full media playback.",
    robots: "noindex, nofollow",
  });

  useEffect(() => {
    if (!storyEntry?.audioUrl || !audioRef.current) {
      return undefined;
    }

    const audioElement = audioRef.current;
    const playPromise = audioElement.play();

    if (playPromise?.catch) {
      playPromise.catch(() => {});
    }

    return () => {
      audioElement.pause();
      audioElement.currentTime = 0;
    };
  }, [storyEntry?.audioUrl, storyEntry?._id]);

  useEffect(() => {
    if (!storyEntry?._id || storyEntry._id === "live") {
      setComments([]);
      setCommentsError("");
      setCommentsLoading(false);
      return undefined;
    }

    let ignore = false;

    const loadComments = async () => {
      try {
        setCommentsLoading(true);
        setCommentsError("");
        const response = await api.get(`/user/story-history/${storyEntry._id}/comments`);

        if (!ignore) {
          setComments(response.data?.data || []);
        }
      } catch (error) {
        if (!ignore) {
          setComments([]);
          setCommentsError(
            error.response?.data?.message || "Story comments could not be loaded",
          );
        }
      } finally {
        if (!ignore) {
          setCommentsLoading(false);
        }
      }
    };

    loadComments();

    return () => {
      ignore = true;
    };
  }, [storyEntry?._id]);

  if (checkingAuth) {
    return null;
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (!storyEntry) {
    return (
      <main className={styles.page}>
        <section className={styles.emptyState}>
          <h1>Story unavailable</h1>
          <p>That story could not be found in your recent story list.</p>
          <Link to="/profile" className={styles.backLink}>
            Back to profile
          </Link>
        </section>
      </main>
    );
  }

  const createdLabel = formatDateLabel(storyEntry.createdAt);
  const expiryLabel = formatDateLabel(storyEntry.expiresAt);

  const handleRemove = async () => {
    const resultAction = isLiveRoute
      ? await dispatch(deleteStory())
      : await dispatch(deleteStoryHistory(storyEntry._id));

    const rejected = isLiveRoute
      ? deleteStory.rejected.match(resultAction)
      : deleteStoryHistory.rejected.match(resultAction);

    if (rejected) {
      toast.error(resultAction.payload?.message || "Story could not be removed");
      return;
    }

    toast.success(resultAction.payload?.message || "Story removed successfully");
    navigate("/profile", { replace: true });
  };

  return (
    <main className={styles.page}>
      <section className={styles.shell}>
        <div className={styles.header}>
          <div>
            <p className={styles.eyebrow}>Story detail</p>
            <h1>{storyEntry.isActive ? "Your live story" : "Your saved story"}</h1>
          </div>

          <Link to="/profile" className={styles.backLink}>
            Back to profile
          </Link>
        </div>

        <div className={styles.mediaCard}>
          {storyEntry.mediaType === "video" ? (
            <video
              key={storyEntry.mediaUrl}
              src={storyEntry.mediaUrl}
              className={styles.media}
              controls
              autoPlay
              playsInline
              preload="metadata"
            />
          ) : (
            <img
              src={storyEntry.mediaUrl}
              alt="Your story"
              className={styles.media}
            />
          )}

          {storyEntry.audioUrl ? (
            <audio
              key={storyEntry.audioUrl}
              ref={audioRef}
              src={storyEntry.audioUrl}
              autoPlay
              loop
              preload="metadata"
              className={styles.storyAudio}
            />
          ) : null}
        </div>

        <div className={styles.metaCard}>
          <div className={styles.pills}>
            <span className={styles.pill}>{storyEntry.isActive ? "Live" : "Saved"}</span>
            <span className={styles.pill}>{storyEntry.mediaType === "video" ? "Video" : "Photo"}</span>
            {storyEntry.audioUrl ? <span className={styles.pill}>Audio on</span> : null}
          </div>

          <p className={styles.metaCopy}>
            {storyEntry.isActive && expiryLabel
              ? `This story is live until ${expiryLabel}.`
              : createdLabel
                ? `This story was shared on ${createdLabel}.`
                : "This story is part of your recent story list."}
          </p>

          <div className={styles.statsRow}>
            <span>{storyEntry.likeCount || 0} likes</span>
            {createdLabel ? <span>Shared {createdLabel}</span> : null}
          </div>

          <button
            type="button"
            className={styles.removeButton}
            onClick={handleRemove}
            disabled={loading}
          >
            {loading ? "Removing..." : "Remove story"}
          </button>
        </div>

        <section className={styles.commentsCard}>
          <div className={styles.commentsHeader}>
            <div>
              <p className={styles.commentsEyebrow}>Private comments</p>
              <h2>Visible only to you</h2>
            </div>
            <span>
              {comments.length} {comments.length === 1 ? "comment" : "comments"}
            </span>
          </div>

          {commentsLoading ? (
            <div className={styles.commentsState}>Loading private comments...</div>
          ) : commentsError ? (
            <div className={styles.commentsState}>{commentsError}</div>
          ) : comments.length === 0 ? (
            <div className={styles.commentsState}>
              Friends have not left any private comments on this story yet.
            </div>
          ) : (
            <div className={styles.commentsList}>
              {comments.map((item) => (
                <article key={item._id} className={styles.commentCard}>
                  <div className={styles.commentHeader}>
                    <img
                      src={item.user?.avatar || noProfile}
                      alt={item.user?.username || "Comment author"}
                      className={styles.commentAvatar}
                    />
                    <div>
                      <strong>{item.user?.username || "globMe friend"}</strong>
                      <span>
                        {item.createdAt ? formatDateLabel(item.createdAt) : "Recently"}
                      </span>
                    </div>
                  </div>
                  <p className={styles.commentBody}>{item.comment}</p>
                </article>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
};
