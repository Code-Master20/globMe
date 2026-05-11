import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { useSelector } from "react-redux";
import api from "../../lib/api";
import { StoryRail } from "./StoryRail";
import { StoryViewerModal } from "./StoryViewerModal";
import styles from "./StoryTray.module.css";

const getStoryPostedTime = (storyItem) => {
  const expiresAtMs = storyItem?.story?.expiresAt
    ? new Date(storyItem.story.expiresAt).getTime()
    : 0;

  return Number.isNaN(expiresAtMs) ? 0 : expiresAtMs;
};

const hasFutureStoryExpiry = (value) => {
  if (!value) {
    return false;
  }

  const expiryDate = new Date(value);

  return !Number.isNaN(expiryDate.getTime()) && expiryDate.getTime() > Date.now();
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
    && hasFutureStoryExpiry(currentUser.storyExpiresAt)
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
    ? currentUser.storyHistory.filter(
        (item) => item?.mediaUrl && hasFutureStoryExpiry(item?.expiresAt),
      )
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
  const trayItems = stories.map((item) => {
    const isOwnStory = `${item?.user?._id || ""}` === `${user?._id || ""}`;

    return {
      id: `${item?.user?._id || "story"}-${item?.story?.storyEntryId || "live"}`,
      mediaUrl: item?.story?.mediaUrl || "",
      mediaType: item?.story?.mediaType || "image",
      title: isOwnStory ? "Your story" : item?.user?.username || "globMe member",
      subtitle: isOwnStory
        ? "tap to view"
        : item?.story?.mediaType === "video"
          ? "video update"
          : "photo update",
      badge: item?.story?.mediaType === "video" ? "video" : "photo",
      accent: isOwnStory ? "current" : "live",
    };
  });

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
  }, [user?._id]);

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
                : "Stories/status from people around the world"}
            </h2>
          </div>
          <span>{loading ? "Loading..." : `${stories.length} live now`}</span>
        </div>

        <StoryRail
          items={trayItems}
          loading={loading}
          onSelect={(selectedItem, index) => {
            const sourceStory =
              stories.find(
                (storyItem) =>
                  (storyItem?.story?.mediaUrl || "") === (selectedItem?.mediaUrl || "") &&
                  `${storyItem?.user?._id || ""}` ===
                    `${
                      selectedItem?.title === "Your story"
                        ? user?._id || ""
                        : (
                            stories.find(
                              (candidate) =>
                                (candidate?.user?.username || "globMe member") ===
                                selectedItem?.title,
                            )?.user?._id || ""
                          )
                    }`,
              ) || stories[index];

            const nextViewerIndex = viewerStories.findIndex(
              (viewerItem) =>
                `${viewerItem?.user?._id || ""}` === `${sourceStory?.user?._id || ""}` &&
                `${viewerItem?.story?.storyEntryId || ""}` ===
                  `${sourceStory?.story?.storyEntryId || ""}`,
            );

            setViewerIndex(nextViewerIndex >= 0 ? nextViewerIndex : index);
            setViewerOpen(true);
          }}
        />
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
