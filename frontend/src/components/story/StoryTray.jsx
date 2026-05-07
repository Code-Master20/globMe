import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { useSelector } from "react-redux";
import api from "../../lib/api";
import { StoryViewerModal } from "./StoryViewerModal";
import { VideoThumbnail } from "./VideoThumbnail";
import styles from "./StoryTray.module.css";

const getStoryPostedTime = (storyItem) => {
  const expiresAtMs = storyItem?.story?.expiresAt
    ? new Date(storyItem.story.expiresAt).getTime()
    : 0;

  return Number.isNaN(expiresAtMs) ? 0 : expiresAtMs;
};

const getOwnerStoryEntryTime = (storyEntry) => {
  const candidateValue = storyEntry?.createdAt || storyEntry?.expiresAt || "";

  if (!candidateValue) {
    return 0;
  }

  const dateValue = new Date(candidateValue);

  return Number.isNaN(dateValue.getTime()) ? 0 : dateValue.getTime();
};

const sortStoriesForTray = (storyItems, currentUserId) =>
  [...storyItems].sort((left, right) => {
    const leftIsOwner = currentUserId && `${left?.user?._id || ""}` === `${currentUserId}`;
    const rightIsOwner = currentUserId && `${right?.user?._id || ""}` === `${currentUserId}`;

    if (leftIsOwner && !rightIsOwner) {
      return -1;
    }

    if (!leftIsOwner && rightIsOwner) {
      return 1;
    }

    return getStoryPostedTime(right) - getStoryPostedTime(left);
  });

const buildOwnerViewerStories = (currentUser) => {
  if (!currentUser?._id) {
    return [];
  }

  const activeStory = currentUser.story
    ? {
        _id: currentUser.storyActiveHistoryId || "live",
        mediaUrl: currentUser.story,
        mediaType: currentUser.storyType || "image",
        audioUrl: currentUser.storyAudio || null,
        likeCount:
          typeof currentUser.storyLikeCount === "number"
            ? currentUser.storyLikeCount
            : 0,
        expiresAt: currentUser.storyExpiresAt || null,
        createdAt: null,
        isActive: true,
      }
    : null;

  const historyEntries = Array.isArray(currentUser.storyHistory)
    ? currentUser.storyHistory.filter((item) => item?.mediaUrl)
    : [];

  const activeHistoryEntry =
    historyEntries.find((item) => item?.isActive) ||
    historyEntries.find((item) => activeStory && `${item?._id || ""}` === `${activeStory._id}`) ||
    null;

  const ownerStoryEntries = [
    ...(activeStory && !activeHistoryEntry ? [activeStory] : []),
    ...historyEntries,
  ].sort((left, right) => {
    if (left?.isActive && !right?.isActive) {
      return -1;
    }

    if (!left?.isActive && right?.isActive) {
      return 1;
    }

    return getOwnerStoryEntryTime(right) - getOwnerStoryEntryTime(left);
  });

  return ownerStoryEntries.map((item) => ({
    user: {
      _id: currentUser._id,
      username: currentUser.username,
      avatar: currentUser.avatar,
      profession: currentUser.profession,
    },
    story: {
      storyEntryId: item?._id ? `${item._id}` : "",
      mediaUrl: item.mediaUrl,
      mediaType: item.mediaType || "image",
      audioUrl: item.audioUrl || null,
      likeCount: typeof item.likeCount === "number" ? item.likeCount : 0,
      likedByViewer: false,
      expiresAt: item.expiresAt || currentUser.storyExpiresAt || null,
    },
  }));
};

const buildViewerStories = (trayStories, currentUser) => {
  const currentUserId = currentUser?._id || "";
  const ownerViewerStories = buildOwnerViewerStories(currentUser);
  const friendStories = trayStories.filter(
    (item) => `${item?.user?._id || ""}` !== `${currentUserId}`,
  );

  if (!ownerViewerStories.length) {
    return trayStories;
  }

  return [...ownerViewerStories, ...friendStories];
};

export const StoryTray = ({ onRequireAuth }) => {
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  const viewerStories = buildViewerStories(stories, user);

  useEffect(() => {
    let ignore = false;

    const loadStories = async () => {
      try {
        setLoading(true);
        const response = await api.get("/public/stories");

        if (!ignore) {
          setStories(
            sortStoriesForTray(response.data?.data || [], user?._id || ""),
          );
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
                    const nextViewerIndex = viewerStories.findIndex(
                      (viewerItem) =>
                        `${viewerItem?.user?._id || ""}` === `${item.user?._id || ""}` &&
                        `${viewerItem?.story?.storyEntryId || ""}` ===
                          `${item.story?.storyEntryId || ""}`,
                    );

                    setViewerIndex(nextViewerIndex >= 0 ? nextViewerIndex : index);
                    setViewerOpen(true);
                  }}
                >
                  <div className={styles.storyPreviewFrame}>
                    {item.story?.mediaType === "video" ? (
                      <VideoThumbnail
                        src={item.story?.mediaUrl}
                        className={styles.storyPreviewMedia}
                        alt={`${item.user?.username || "globMe member"} story video`}
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
        stories={viewerStories}
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
        onStoriesChange={(nextStories) => {
          const nextTrayStories = stories.map((storyItem) => {
            const matchedStory = nextStories.find(
              (nextStory) =>
                `${nextStory?.user?._id || ""}` === `${storyItem?.user?._id || ""}` &&
                `${nextStory?.story?.storyEntryId || ""}` ===
                  `${storyItem?.story?.storyEntryId || ""}`,
            );

            return matchedStory || storyItem;
          });

          setStories(sortStoriesForTray(nextTrayStories, user?._id || ""));
        }}
      />
    </>
  );
};
