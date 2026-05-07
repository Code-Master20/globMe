import { useEffect, useState } from "react";
import { MdChevronLeft, MdChevronRight, MdClose, MdOutlineFavoriteBorder } from "react-icons/md";
import { IoHeart } from "react-icons/io5";
import { toast } from "react-toastify";
import api from "../../lib/api";
import noProfile from "../../assets/noProfile.png";
import styles from "./StoryViewerModal.module.css";

const formatDisplayValue = (value) => {
  if (!value) return "";

  return `${value}`
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

const formatExpiry = (value) => {
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

const formatCommentTime = (value) => {
  if (!value) return "Recently";

  const dateValue = new Date(value);

  if (Number.isNaN(dateValue.getTime())) {
    return "Recently";
  }

  return dateValue.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

export const StoryViewerModal = ({
  open,
  stories,
  initialIndex = 0,
  onClose,
  isAuthenticated,
  currentUserId = "",
  onRequireAuth,
  onStoriesChange,
}) => {
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [likeLoading, setLikeLoading] = useState(false);
  const [commentDraft, setCommentDraft] = useState("");
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [ownerComments, setOwnerComments] = useState([]);
  const [ownerCommentsLoading, setOwnerCommentsLoading] = useState(false);
  const [ownerCommentsError, setOwnerCommentsError] = useState("");

  useEffect(() => {
    if (open) {
      setActiveIndex(initialIndex);
    }
  }, [initialIndex, open]);

  useEffect(() => {
    setCommentDraft("");
  }, [activeIndex, open]);

  const currentStory = stories?.[activeIndex] || null;
  const isOwnStory = currentUserId && `${currentUserId}` === `${currentStory?.user?._id}`;
  const canCommentOnStory = Boolean(currentStory?.story?.storyEntryId) && !isOwnStory;
  const ownerStoryEntryId = `${currentStory?.story?.storyEntryId || ""}`;
  const canLoadOwnerComments =
    isOwnStory && /^[a-f\d]{24}$/i.test(ownerStoryEntryId);

  useEffect(() => {
    if (!open || !canLoadOwnerComments) {
      setOwnerComments([]);
      setOwnerCommentsError("");
      setOwnerCommentsLoading(false);
      return undefined;
    }

    let ignore = false;

    const loadOwnerComments = async () => {
      try {
        setOwnerCommentsLoading(true);
        setOwnerCommentsError("");
        const response = await api.get(
          `/user/story-history/${ownerStoryEntryId}/comments`,
        );

        if (!ignore) {
          setOwnerComments(response.data?.data || []);
        }
      } catch (error) {
        if (!ignore) {
          setOwnerComments([]);
          setOwnerCommentsError(
            error.response?.data?.message || "Private messages could not be loaded",
          );
        }
      } finally {
        if (!ignore) {
          setOwnerCommentsLoading(false);
        }
      }
    };

    loadOwnerComments();

    return () => {
      ignore = true;
    };
  }, [canLoadOwnerComments, open, ownerStoryEntryId]);

  if (!open || !stories?.length || !currentStory) {
    return null;
  }

  const handleLike = async () => {
    if (!currentStory?.user?._id) {
      return;
    }

    if (!isAuthenticated) {
      onRequireAuth?.();
      return;
    }

    try {
      setLikeLoading(true);
      const response = await api.post(`/user/stories/${currentStory.user._id}/like`);
      const payload = response.data?.data || {};

      const nextStories = stories.map((item, index) =>
        index === activeIndex
          ? {
              ...item,
              story: {
                ...item.story,
                likedByViewer: Boolean(payload.liked),
                likeCount: payload.likeCount ?? item.story.likeCount,
              },
            }
          : item,
      );

      onStoriesChange?.(nextStories);
    } catch (error) {
      onRequireAuth?.(error.response?.data?.message || "Story like failed");
    } finally {
      setLikeLoading(false);
    }
  };

  const handleCommentSubmit = async (event) => {
    event.preventDefault();

    if (!currentStory?.user?._id || !currentStory?.story?.storyEntryId) {
      return;
    }

    if (!isAuthenticated) {
      onRequireAuth?.("Log in to comment on this story.");
      return;
    }

    if (!commentDraft.trim()) {
      toast.info("Write a comment first.");
      return;
    }

    try {
      setCommentSubmitting(true);
      const response = await api.post(`/user/stories/${currentStory.user._id}/comments`, {
        storyEntryId: currentStory.story.storyEntryId,
        comment: commentDraft.trim(),
      });

      toast.success(
        response.data?.message || "Private message sent to the story owner",
      );
      setCommentDraft("");
    } catch (error) {
      const message =
        error.response?.data?.message || "Story comment could not be added";

      if (error.response?.status === 401) {
        onRequireAuth?.(message);
        return;
      }

      toast.error(message);
    } finally {
      setCommentSubmitting(false);
    }
  };

  const canGoPrev = activeIndex > 0;
  const canGoNext = activeIndex < stories.length - 1;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.shell} onClick={(event) => event.stopPropagation()}>
        <button
          type="button"
          className={styles.closeButton}
          onClick={onClose}
          aria-label="Close story viewer"
        >
          <MdClose />
        </button>

        {stories.length > 1 ? (
          <div className={styles.progressRow}>
            {stories.map((item, index) => (
              <button
                type="button"
                key={`${item.user?._id}-${index}`}
                className={`${styles.progressPill} ${
                  index === activeIndex ? styles.progressPillActive : ""
                }`}
                onClick={() => setActiveIndex(index)}
                aria-label={`Open story ${index + 1}`}
              />
            ))}
          </div>
        ) : null}

        <div className={styles.header}>
          <div className={styles.identity}>
            <img
              src={currentStory.user?.avatar}
              alt={currentStory.user?.username || "Story owner"}
              className={styles.avatar}
            />
            <div>
              <strong>{currentStory.user?.username || "globMe member"}</strong>
              <span>
                {formatDisplayValue(currentStory.user?.profession) || "Active story"}
              </span>
            </div>
          </div>

          <div className={styles.expiry}>
            <strong>{currentStory.story?.mediaType === "video" ? "Video story" : "Photo story"}</strong>
            <span>Ends {formatExpiry(currentStory.story?.expiresAt)}</span>
          </div>
        </div>

        <div className={styles.viewerBody}>
          {canGoPrev ? (
            <button
              type="button"
              className={`${styles.navButton} ${styles.navLeft}`}
              onClick={() => setActiveIndex((value) => value - 1)}
              aria-label="Previous story"
            >
              <MdChevronLeft />
            </button>
          ) : null}

          <div className={styles.mediaCard}>
            {currentStory.story?.mediaType === "video" ? (
              <video
                src={currentStory.story?.mediaUrl}
                className={styles.media}
                controls
                autoPlay
                preload="metadata"
              />
            ) : (
              <img
                src={currentStory.story?.mediaUrl}
                alt={`${currentStory.user?.username || "globMe member"} story`}
                className={styles.media}
              />
            )}

            {currentStory.story?.audioUrl ? (
              <audio
                src={currentStory.story.audioUrl}
                autoPlay
                preload="metadata"
                className={styles.storyBackgroundAudio}
              />
            ) : null}
          </div>

          {canGoNext ? (
            <button
              type="button"
              className={`${styles.navButton} ${styles.navRight}`}
              onClick={() => setActiveIndex((value) => value + 1)}
              aria-label="Next story"
            >
              <MdChevronRight />
            </button>
          ) : null}
        </div>

        <div className={styles.footer}>
          <div className={styles.likeMeta}>
            <strong>{currentStory.story?.likeCount || 0} likes</strong>
            <span>
              {currentStory.story?.likedByViewer
                ? "You liked this story"
                : "React to this story"}
            </span>
          </div>

          {isOwnStory ? (
            <div className={styles.ownerLabel}>Your live story</div>
          ) : (
            <button
              type="button"
              className={`${styles.likeButton} ${
                currentStory.story?.likedByViewer ? styles.likeButtonActive : ""
              }`}
              onClick={handleLike}
              disabled={likeLoading}
            >
              {currentStory.story?.likedByViewer ? <IoHeart /> : <MdOutlineFavoriteBorder />}
              {likeLoading
                ? "Working..."
                : currentStory.story?.likedByViewer
                  ? "Unlike"
                  : "Like story"}
            </button>
          )}
        </div>

        {canCommentOnStory ? (
          <form className={styles.commentComposer} onSubmit={handleCommentSubmit}>
            <div className={styles.commentComposerHeader}>
              <strong>Private comment</strong>
              <span>Only the story owner can read this.</span>
            </div>

            <textarea
              value={commentDraft}
              onChange={(event) => setCommentDraft(event.target.value)}
              className={styles.commentInput}
              placeholder="Write something supportive or helpful..."
              maxLength={400}
            />

            <button
              type="submit"
              className={styles.commentSubmitButton}
              disabled={commentSubmitting}
            >
              {commentSubmitting ? "Sending..." : "Send private comment"}
            </button>
          </form>
        ) : null}

        {isOwnStory ? (
          <section className={styles.ownerCommentsPanel}>
            <div className={styles.ownerCommentsHeader}>
              <div>
                <strong>Private messages</strong>
                <span>Only you can read replies sent on this story.</span>
              </div>
              <span>
                {ownerComments.length} {ownerComments.length === 1 ? "message" : "messages"}
              </span>
            </div>

            {ownerCommentsLoading ? (
              <div className={styles.ownerCommentsState}>Loading private messages...</div>
            ) : ownerCommentsError ? (
              <div className={styles.ownerCommentsState}>{ownerCommentsError}</div>
            ) : !canLoadOwnerComments ? (
              <div className={styles.ownerCommentsState}>
                Private messages will appear here once this story is fully saved.
              </div>
            ) : ownerComments.length === 0 ? (
              <div className={styles.ownerCommentsState}>
                No private messages on this story yet.
              </div>
            ) : (
              <div className={styles.ownerCommentsList}>
                {ownerComments.map((item) => (
                  <article key={item._id} className={styles.ownerCommentCard}>
                    <div className={styles.ownerCommentHeader}>
                      <img
                        src={item.user?.avatar || noProfile}
                        alt={item.user?.username || "Friend"}
                        className={styles.ownerCommentAvatar}
                      />
                      <div>
                        <strong>{item.user?.username || "globMe friend"}</strong>
                        <span>{formatCommentTime(item.createdAt)}</span>
                      </div>
                    </div>
                    <p className={styles.ownerCommentBody}>{item.comment}</p>
                  </article>
                ))}
              </div>
            )}
          </section>
        ) : null}
      </div>
    </div>
  );
};
