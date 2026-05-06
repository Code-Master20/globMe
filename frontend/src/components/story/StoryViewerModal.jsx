import { useEffect, useState } from "react";
import { MdChevronLeft, MdChevronRight, MdClose, MdOutlineFavoriteBorder } from "react-icons/md";
import { IoHeart } from "react-icons/io5";
import api from "../../lib/api";
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

  useEffect(() => {
    if (open) {
      setActiveIndex(initialIndex);
    }
  }, [initialIndex, open]);

  if (!open || !stories?.length) {
    return null;
  }

  const currentStory = stories[activeIndex];
  const isOwnStory = currentUserId && `${currentUserId}` === `${currentStory?.user?._id}`;

  if (!currentStory) {
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
                controls
                preload="metadata"
                className={styles.audioPlayer}
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
      </div>
    </div>
  );
};
