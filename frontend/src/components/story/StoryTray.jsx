import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { useSelector } from "react-redux";
import api from "../../lib/api";
import { StoryViewerModal } from "./StoryViewerModal";
import styles from "./StoryTray.module.css";

const STORY_CARD_PREVIEW_SECONDS = 3;

export const StoryTray = ({ onRequireAuth }) => {
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  useEffect(() => {
    let ignore = false;

    const loadStories = async () => {
      try {
        setLoading(true);
        const response = await api.get("/public/stories");

        if (!ignore) {
          setStories(response.data?.data || []);
        }
      } catch {
        if (!ignore) {
          setStories([]);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    loadStories();

    return () => {
      ignore = true;
    };
  }, []);

  if (!loading && stories.length === 0) {
    return null;
  }

  const handleVideoPreviewTimeUpdate = (event) => {
    const videoElement = event.currentTarget;

    if (videoElement.currentTime >= STORY_CARD_PREVIEW_SECONDS) {
      videoElement.currentTime = 0;

      const nextPlay = videoElement.play();

      if (nextPlay?.catch) {
        nextPlay.catch(() => {});
      }
    }
  };

  return (
    <>
      <section className={styles.tray}>
        <div className={styles.trayHeader}>
          <div>
            <p>Stories</p>
            <h2>
              {isAuthenticated
                ? "Live status/stories from your friends"
                : "Live updates from people on globMe"}
            </h2>
          </div>
          <span>{loading ? "Loading..." : `${stories.length} live`}</span>
        </div>

        <div className={styles.trayScroller}>
          {loading
            ? [0, 1, 2, 3].map((item) => (
                <div key={item} className={styles.storyCardSkeleton} />
              ))
            : stories.map((item, index) => (
                <button
                  type="button"
                  key={item.user?._id || index}
                  className={styles.storyCard}
                  onClick={() => {
                    setViewerIndex(index);
                    setViewerOpen(true);
                  }}
                >
                  <div className={styles.storyPreviewFrame}>
                    {item.story?.mediaType === "video" ? (
                      <video
                        key={item.story?.mediaUrl}
                        src={item.story?.mediaUrl}
                        className={styles.storyPreviewMedia}
                        autoPlay
                        muted
                        playsInline
                        preload="metadata"
                        onTimeUpdate={handleVideoPreviewTimeUpdate}
                      />
                    ) : (
                      <img
                        src={item.story?.mediaUrl}
                        alt={`${item.user?.username || "globMe member"} story`}
                        className={styles.storyPreviewMedia}
                      />
                    )}
                  </div>
                  <strong>{item.user?.username || "globMe member"}</strong>
                  <span>{item.story?.likeCount || 0} likes</span>
                </button>
              ))}
        </div>
      </section>

      <StoryViewerModal
        open={viewerOpen}
        stories={stories}
        initialIndex={viewerIndex}
        onClose={() => setViewerOpen(false)}
        isAuthenticated={isAuthenticated}
        currentUserId={user?._id || ""}
        onRequireAuth={(message) => {
          if (message) {
            toast.info(message);
          }

          onRequireAuth?.();
        }}
        onStoriesChange={setStories}
      />
    </>
  );
};
