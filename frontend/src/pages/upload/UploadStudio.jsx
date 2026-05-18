import { useEffect, useRef, useState } from "react";
import { MdOutlinePhotoLibrary, MdPlayCircleOutline } from "react-icons/md";
import { toast } from "react-toastify";
import { useLocation } from "react-router-dom";
import { usePageMetadata } from "../../hooks/usePageMetadata";
import api from "../../lib/api";
import { ImageUpload } from "../../components/media/ImgUpload";
import styles from "./UploadStudio.module.css";

const initialPostForm = {
  title: "",
  description: "",
  tags: "",
  contentFormat: "article",
  visibility: "world",
  hiddenFromUserIds: [],
  includedUserIds: [],
};

const CLIP_SLIDER_STEP_SECONDS = 0.1;
const CLIP_STOP_TOLERANCE_SECONDS = 0.2;

const formatDurationLabel = (value) => {
  const safeValue = Number.isFinite(value) ? Math.max(0, value) : 0;
  const wholeSeconds = Math.floor(safeValue);
  const minutes = Math.floor(wholeSeconds / 60);
  const seconds = wholeSeconds % 60;

  return `${minutes}:${`${seconds}`.padStart(2, "0")}`;
};

const getMinimumClipSpan = (durationSeconds) => {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    return 0.2;
  }

  return Math.min(1, Math.max(durationSeconds / 20, 0.2));
};

const shouldTrimVideoClip = ({ durationSeconds, startSeconds, endSeconds }) => {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    return false;
  }

  return startSeconds > 0.05 || endSeconds < durationSeconds - 0.05;
};

const areClipBoundsEqual = (firstStart, firstEnd, secondStart, secondEnd) =>
  Math.abs(firstStart - secondStart) < CLIP_SLIDER_STEP_SECONDS &&
  Math.abs(firstEnd - secondEnd) < CLIP_SLIDER_STEP_SECONDS;

const getSupportedRecorderMimeType = () => {
  if (typeof MediaRecorder === "undefined") {
    return "";
  }

  const supportedTypes = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ];

  return supportedTypes.find((type) => MediaRecorder.isTypeSupported(type)) || "";
};

const waitForVideoSeek = (video, targetTime) =>
  new Promise((resolve, reject) => {
    if (Math.abs(video.currentTime - targetTime) < CLIP_SLIDER_STEP_SECONDS) {
      resolve();
      return;
    }

    const handleSeeked = () => {
      cleanup();
      resolve();
    };
    const handleError = () => {
      cleanup();
      reject(new Error("The selected video could not be prepared."));
    };
    const cleanup = () => {
      video.removeEventListener("seeked", handleSeeked);
      video.removeEventListener("error", handleError);
    };

    video.addEventListener("seeked", handleSeeked, { once: true });
    video.addEventListener("error", handleError, { once: true });
    video.currentTime = targetTime;
  });

const buildTrimmedVideoFile = async ({ file, startSeconds, endSeconds }) => {
  if (typeof document === "undefined" || typeof MediaRecorder === "undefined") {
    throw new Error("Video trimming is not available in this browser.");
  }

  const video = document.createElement("video");
  const objectUrl = URL.createObjectURL(file);
  const supportedMimeType = getSupportedRecorderMimeType();

  video.preload = "auto";
  video.playsInline = true;
  video.muted = true;
  video.defaultMuted = true;
  video.volume = 0;
  video.controls = false;
  video.src = objectUrl;

  try {
    await new Promise((resolve, reject) => {
      const handleLoadedMetadata = () => {
        cleanup();
        resolve();
      };
      const handleError = () => {
        cleanup();
        reject(new Error("The selected video could not be read."));
      };
      const cleanup = () => {
        video.removeEventListener("loadedmetadata", handleLoadedMetadata);
        video.removeEventListener("error", handleError);
      };

      video.addEventListener("loadedmetadata", handleLoadedMetadata, { once: true });
      video.addEventListener("error", handleError, { once: true });
      video.load();
    });

    const durationSeconds = Number.isFinite(video.duration) ? video.duration : 0;
    const safeStart = Math.max(0, Math.min(startSeconds, durationSeconds));
    const safeEnd = Math.max(safeStart, Math.min(endSeconds, durationSeconds));
    const captureStream =
      typeof video.captureStream === "function"
        ? video.captureStream()
        : typeof video.mozCaptureStream === "function"
          ? video.mozCaptureStream()
          : null;

    if (!captureStream) {
      throw new Error("This browser cannot trim videos yet.");
    }

    const recorder = supportedMimeType
      ? new MediaRecorder(captureStream, { mimeType: supportedMimeType })
      : new MediaRecorder(captureStream);

    await waitForVideoSeek(video, safeStart);

    return await new Promise((resolve, reject) => {
      const chunks = [];
      let hasStopped = false;

      const stopRecording = () => {
        if (hasStopped) {
          return;
        }

        hasStopped = true;

        if (!video.paused) {
          video.pause();
        }

        if (recorder.state !== "inactive") {
          recorder.stop();
        }
      };

      const handleTimeUpdate = () => {
        if (video.currentTime >= safeEnd - CLIP_STOP_TOLERANCE_SECONDS) {
          stopRecording();
        }
      };
      const handleDataAvailable = (event) => {
        if (event.data?.size) {
          chunks.push(event.data);
        }
      };
      const handleRecorderStop = () => {
        cleanup();

        if (!chunks.length) {
          reject(new Error("No trimmed clip was created. Please try another range."));
          return;
        }

        const extension = recorder.mimeType.includes("webm") ? "webm" : "mp4";
        const baseName = file.name.replace(/\.[^.]+$/, "");
        resolve(
          new File(chunks, `${baseName}-clip.${extension}`, {
            type: recorder.mimeType || supportedMimeType || file.type,
            lastModified: Date.now(),
          }),
        );
      };
      const handleRecorderError = () => {
        cleanup();
        reject(new Error("The selected clip could not be recorded."));
      };
      const handlePlaybackError = () => {
        cleanup();
        reject(new Error("The selected clip could not be played for trimming."));
      };
      const cleanup = () => {
        video.removeEventListener("timeupdate", handleTimeUpdate);
        video.removeEventListener("ended", stopRecording);
        video.removeEventListener("error", handlePlaybackError);
        recorder.removeEventListener("dataavailable", handleDataAvailable);
        recorder.removeEventListener("stop", handleRecorderStop);
        recorder.removeEventListener("error", handleRecorderError);
      };

      video.addEventListener("timeupdate", handleTimeUpdate);
      video.addEventListener("ended", stopRecording);
      video.addEventListener("error", handlePlaybackError);
      recorder.addEventListener("dataavailable", handleDataAvailable);
      recorder.addEventListener("stop", handleRecorderStop);
      recorder.addEventListener("error", handleRecorderError);

      try {
        recorder.start(250);
        video.play().catch(() => {
          stopRecording();
          reject(new Error("Click play permissions blocked clip trimming. Please try again."));
        });
      } catch (error) {
        cleanup();
        reject(error);
      }
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};

const getDefaultContentFormat = (postType) => (postType === "video" ? "reel" : "article");

const normalizeUploadType = (value) => (value === "video" ? "video" : "image");

const normalizeUploadFormat = (postType, value) => {
  if (postType === "video") {
    return value === "long" ? "long" : "reel";
  }

  return value === "reel" ? "reel" : "article";
};

const formatPostKindLabel = (postType, contentFormat) => {
  if (postType === "video") {
    return contentFormat === "long" ? "Video Longs" : "Video Shorts";
  }

  return contentFormat === "reel" ? "Photo Shorts" : "Raw post";
};

export const UploadStudio = () => {
  usePageMetadata({
    title: "Upload studio",
    description: "Upload owner photo posts, reels, and long videos.",
    robots: "noindex, nofollow",
  });

  const location = useLocation();
  const previewVideoRef = useRef(null);
  const [postForm, setPostForm] = useState(initialPostForm);
  const [selectedPostFile, setSelectedPostFile] = useState(null);
  const [postPreviewUrl, setPostPreviewUrl] = useState("");
  const [postUploadLoading, setPostUploadLoading] = useState(false);
  const [videoMetadataLoading, setVideoMetadataLoading] = useState(false);
  const [videoDurationSeconds, setVideoDurationSeconds] = useState(0);
  const [clipStartSeconds, setClipStartSeconds] = useState(0);
  const [clipEndSeconds, setClipEndSeconds] = useState(0);
  const [committedClipStartSeconds, setCommittedClipStartSeconds] = useState(0);
  const [committedClipEndSeconds, setCommittedClipEndSeconds] = useState(0);
  const [clipPreviewUrl, setClipPreviewUrl] = useState("");
  const [clipPreviewLoading, setClipPreviewLoading] = useState(false);
  const [clipExportLoading, setClipExportLoading] = useState(false);
  const [isPreviewingClip, setIsPreviewingClip] = useState(false);
  const [uploadIntent, setUploadIntent] = useState("image");
  const [ownerPlaylists, setOwnerPlaylists] = useState([]);
  const [playlistsLoading, setPlaylistsLoading] = useState(false);
  const [selectedPlaylistIds, setSelectedPlaylistIds] = useState([]);
  const [newPlaylistTitle, setNewPlaylistTitle] = useState("");
  const [newPlaylistDescription, setNewPlaylistDescription] = useState("");
  const [ownerFriends, setOwnerFriends] = useState([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [friendPrivacyPickerOpen, setFriendPrivacyPickerOpen] = useState(false);
  const [friendSearchText, setFriendSearchText] = useState("");

  const selectedPostType = selectedPostFile?.type?.startsWith("video/")
    ? "video"
    : selectedPostFile?.type?.startsWith("image/")
      ? "image"
      : uploadIntent;

  useEffect(() => {
    if (!selectedPostFile) {
      setPostPreviewUrl("");
      setFriendPrivacyPickerOpen(false);
      setFriendSearchText("");
      return undefined;
    }

    const objectUrl = URL.createObjectURL(selectedPostFile);
    setPostPreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [selectedPostFile]);

  useEffect(() => {
    if (!clipPreviewUrl) {
      return undefined;
    }

    return () => {
      URL.revokeObjectURL(clipPreviewUrl);
    };
  }, [clipPreviewUrl]);

  useEffect(() => {
    if (selectedPostType !== "video" || !postPreviewUrl) {
      setVideoMetadataLoading(false);
      setVideoDurationSeconds(0);
      setClipStartSeconds(0);
      setClipEndSeconds(0);
      setCommittedClipStartSeconds(0);
      setCommittedClipEndSeconds(0);
      setClipPreviewLoading(false);
      setClipPreviewUrl("");
      setIsPreviewingClip(false);
      return undefined;
    }

    const probeVideo = document.createElement("video");
    const handleLoadedMetadata = () => {
      const durationSeconds = Number.isFinite(probeVideo.duration) ? probeVideo.duration : 0;
      setVideoMetadataLoading(false);
      setVideoDurationSeconds(durationSeconds);
      setClipStartSeconds(0);
      setClipEndSeconds(durationSeconds);
      setCommittedClipStartSeconds(0);
      setCommittedClipEndSeconds(durationSeconds);
      setClipPreviewLoading(false);
      setClipPreviewUrl("");
    };
    const handleError = () => {
      setVideoMetadataLoading(false);
      setVideoDurationSeconds(0);
      setClipStartSeconds(0);
      setClipEndSeconds(0);
      setCommittedClipStartSeconds(0);
      setCommittedClipEndSeconds(0);
      setClipPreviewLoading(false);
      setClipPreviewUrl("");
      toast.error("Video details could not be loaded");
    };

    setVideoMetadataLoading(true);
    probeVideo.preload = "metadata";
    probeVideo.src = postPreviewUrl;
    probeVideo.addEventListener("loadedmetadata", handleLoadedMetadata, { once: true });
    probeVideo.addEventListener("error", handleError, { once: true });
    probeVideo.load();

    return () => {
      probeVideo.removeEventListener("loadedmetadata", handleLoadedMetadata);
      probeVideo.removeEventListener("error", handleError);
      probeVideo.src = "";
    };
  }, [postPreviewUrl, selectedPostType]);

  useEffect(() => {
    setIsPreviewingClip(false);
  }, [clipStartSeconds, clipEndSeconds, postForm.contentFormat]);

  useEffect(() => {
    if (!isPreviewingClip) {
      return undefined;
    }

    const previewVideo = previewVideoRef.current;

    if (!previewVideo) {
      return undefined;
    }

    const handleTimeUpdate = () => {
      if (previewVideo.currentTime >= clipEndSeconds - CLIP_STOP_TOLERANCE_SECONDS) {
        previewVideo.pause();
        setIsPreviewingClip(false);
      }
    };
    const handlePause = () => {
      setIsPreviewingClip(false);
    };

    previewVideo.addEventListener("timeupdate", handleTimeUpdate);
    previewVideo.addEventListener("pause", handlePause);

    return () => {
      previewVideo.removeEventListener("timeupdate", handleTimeUpdate);
      previewVideo.removeEventListener("pause", handlePause);
    };
  }, [clipEndSeconds, isPreviewingClip]);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const requestedType = searchParams.get("type");
    const requestedFormat = searchParams.get("format");

    if (!requestedType && !requestedFormat) {
      return;
    }

    const nextType = normalizeUploadType(requestedType);
    const nextFormat = normalizeUploadFormat(nextType, requestedFormat);

    setUploadIntent(nextType);
    setSelectedPostFile(null);
    setPostForm((prev) => ({
      ...prev,
      contentFormat: nextFormat,
    }));
  }, [location.search]);

  const loadOwnerPlaylists = async () => {
    try {
      setPlaylistsLoading(true);
      const response = await api.get("/user/playlists");
      setOwnerPlaylists(Array.isArray(response.data?.data) ? response.data.data : []);
    } catch (error) {
      toast.error(error.response?.data?.message || "Playlists could not be loaded");
      setOwnerPlaylists([]);
    } finally {
      setPlaylistsLoading(false);
    }
  };

  const loadOwnerFriends = async () => {
    try {
      setFriendsLoading(true);
      const response = await api.get("/network/hub");
      setOwnerFriends(Array.isArray(response.data?.data?.friends) ? response.data.data.friends : []);
    } catch {
      setOwnerFriends([]);
    } finally {
      setFriendsLoading(false);
    }
  };

  useEffect(() => {
    loadOwnerFriends();
  }, []);

  useEffect(() => {
    if (!friendPrivacyPickerOpen) {
      setFriendSearchText("");
    }
  }, [friendPrivacyPickerOpen]);

  useEffect(() => {
    if (uploadIntent === "video") {
      loadOwnerPlaylists();
      return;
    }

    setSelectedPlaylistIds([]);
    setNewPlaylistTitle("");
    setNewPlaylistDescription("");
  }, [uploadIntent]);

  const handlePostInputChange = (event) => {
    const { name, value } = event.target;

    setPostForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const resetPostComposer = () => {
    setPostForm({
      ...initialPostForm,
      contentFormat: getDefaultContentFormat(uploadIntent),
    });
    setSelectedPostFile(null);
    setSelectedPlaylistIds([]);
    setNewPlaylistTitle("");
    setNewPlaylistDescription("");
  };

  const handlePostFileSelect = (file) => {
    setSelectedPostFile(file);
  };

  const handleClipStartChange = (event) => {
    const nextStart = Number(event.target.value);
    const minimumClipSpan = getMinimumClipSpan(videoDurationSeconds);

    setClipStartSeconds(Math.min(nextStart, Math.max(0, clipEndSeconds - minimumClipSpan)));
  };

  const handleClipEndChange = (event) => {
    const nextEnd = Number(event.target.value);
    const minimumClipSpan = getMinimumClipSpan(videoDurationSeconds);

    setClipEndSeconds(Math.max(nextEnd, Math.min(videoDurationSeconds, clipStartSeconds + minimumClipSpan)));
  };

  const handleAudienceFriendToggle = (friendId) => {
    setPostForm((prev) => ({
      ...prev,
      [friendPrivacyMode === "exclude" ? "hiddenFromUserIds" : "includedUserIds"]:
        activeAudienceFriendIds.includes(friendId)
          ? activeAudienceFriendIds.filter((item) => item !== friendId)
          : [...activeAudienceFriendIds, friendId],
    }));
  };

  const handlePreviewSelectedClip = async () => {
    const previewVideo = previewVideoRef.current;

    if (!previewVideo) {
      return;
    }

    try {
      if (
        clipIsTrimmed &&
        (!clipPreviewUrl ||
          !areClipBoundsEqual(
            clipStartSeconds,
            clipEndSeconds,
            committedClipStartSeconds,
            committedClipEndSeconds,
          ))
      ) {
        if (!previewVideo.paused) {
          previewVideo.pause();
        }

        setIsPreviewingClip(false);
        if (!selectedPostFile) {
          return;
        }

        setClipPreviewLoading(true);

        const previewClip = await buildTrimmedVideoFile({
          file: selectedPostFile,
          startSeconds: clipStartSeconds,
          endSeconds: clipEndSeconds,
        });

        setClipPreviewUrl(URL.createObjectURL(previewClip));
        setCommittedClipStartSeconds(clipStartSeconds);
        setCommittedClipEndSeconds(clipEndSeconds);
        setClipPreviewLoading(false);
        return;
      }

      previewVideo.currentTime = clipIsTrimmed ? 0 : clipStartSeconds;
      setIsPreviewingClip(true);
      await previewVideo.play();
    } catch {
      setClipPreviewLoading(false);
      setIsPreviewingClip(false);
      toast.error("Clip preview could not start");
    }
  };

  const handleResetClipSelection = () => {
    setClipStartSeconds(0);
    setClipEndSeconds(videoDurationSeconds);
    setCommittedClipStartSeconds(0);
    setCommittedClipEndSeconds(videoDurationSeconds);
    setClipPreviewLoading(false);
    setClipPreviewUrl("");
  };

  const handlePlaylistToggle = (playlistId) => {
    setSelectedPlaylistIds((prev) =>
      prev.includes(playlistId)
        ? prev.filter((item) => item !== playlistId)
        : [...prev, playlistId],
    );
  };

  const handlePostPublish = async (event) => {
    event.preventDefault();

    if (!selectedPostFile) {
      toast.error("Choose a photo or video first");
      return;
    }

    try {
      setPostUploadLoading(true);
      let uploadFile = selectedPostFile;

      if (
        uploadIntent === "video" &&
        postForm.contentFormat === "reel" &&
        shouldTrimVideoClip({
          durationSeconds: videoDurationSeconds,
          startSeconds: clipStartSeconds,
          endSeconds: clipEndSeconds,
        })
      ) {
        setClipExportLoading(true);
        uploadFile = await buildTrimmedVideoFile({
          file: selectedPostFile,
          startSeconds: clipStartSeconds,
          endSeconds: clipEndSeconds,
        });
      }

      const formData = new FormData();
      formData.append("media", uploadFile);
      formData.append("title", postForm.title.trim());
      formData.append("description", postForm.description.trim());
      formData.append("tags", postForm.tags.trim());
      formData.append("contentFormat", postForm.contentFormat);
      formData.append("visibility", postForm.visibility);
      formData.append("isPublic", `${["world", "all"].includes(postForm.visibility)}`);
      formData.append("hiddenFromUserIds", JSON.stringify(postForm.hiddenFromUserIds));
      formData.append("includedUserIds", JSON.stringify(postForm.includedUserIds));

      if (uploadIntent === "video") {
        if (selectedPlaylistIds.length) {
          formData.append("playlistIds", JSON.stringify(selectedPlaylistIds));
        }

        if (newPlaylistTitle.trim()) {
          formData.append("newPlaylistTitle", newPlaylistTitle.trim());
        }

        if (newPlaylistDescription.trim()) {
          formData.append("newPlaylistDescription", newPlaylistDescription.trim());
        }
      }

      const response = await api.post("/user/posts/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      toast.success(response.data?.message || "Post published successfully");
      resetPostComposer();
      if (uploadIntent === "video") {
        await loadOwnerPlaylists();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || "Post upload failed");
    } finally {
      setClipExportLoading(false);
      setPostUploadLoading(false);
    }
  };

  const isVideoShortsUpload =
    Boolean(selectedPostFile) &&
    uploadIntent === "video" &&
    postForm.contentFormat === "reel" &&
    selectedPostType === "video";
  const canTrimSelectedVideo =
    isVideoShortsUpload && !videoMetadataLoading && Number.isFinite(videoDurationSeconds) && videoDurationSeconds > 0;
  const selectedClipDuration = Math.max(0, clipEndSeconds - clipStartSeconds);
  const clipIsTrimmed = shouldTrimVideoClip({
    durationSeconds: videoDurationSeconds,
    startSeconds: clipStartSeconds,
    endSeconds: clipEndSeconds,
  });
  const previewVideoSource =
    clipIsTrimmed &&
    clipPreviewUrl &&
    areClipBoundsEqual(
      clipStartSeconds,
      clipEndSeconds,
      committedClipStartSeconds,
      committedClipEndSeconds,
    )
      ? clipPreviewUrl
      : postPreviewUrl;
  const friendPrivacyMode = ["all", "friends"].includes(postForm.visibility)
    ? "exclude"
    : "include";
  const activeAudienceFriendIds =
    friendPrivacyMode === "exclude" ? postForm.hiddenFromUserIds : postForm.includedUserIds;
  const audienceFriendCount = activeAudienceFriendIds.length;
  const friendPrivacyButtonLabel =
    friendPrivacyMode === "exclude" ? "Exclude friends" : "Include friends";
  const friendPrivacyCloseLabel =
    friendPrivacyMode === "exclude" ? "Close exclude friends" : "Close include friends";
  const friendPrivacyHeading =
    friendPrivacyMode === "exclude"
      ? "Exclude specific friends"
      : "Include specific friends";
  const friendPrivacyDescription =
    friendPrivacyMode === "exclude"
      ? "Select the friends who should not see this upload."
      : "Select the friends who should still be allowed to see this upload.";
  const normalizedFriendSearchText = friendSearchText.trim().toLowerCase();
  const visibleFriends = ownerFriends.filter((friend) => {
    if (!normalizedFriendSearchText) {
      return true;
    }

    const searchableValues = [
      friend.username,
      friend.profession,
      friend.email,
      Array.isArray(friend.location) ? friend.location.join(" ") : "",
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return searchableValues.includes(normalizedFriendSearchText);
  });

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <h1>{formatPostKindLabel(uploadIntent, postForm.contentFormat)} upload</h1>
          {ownerFriends.length || friendsLoading ? (
            <button
              type="button"
              className={`${styles.friendPrivacyButton} ${styles.heroFriendButton}`}
              onClick={() => setFriendPrivacyPickerOpen((prev) => !prev)}
            >
              {friendPrivacyPickerOpen ? friendPrivacyCloseLabel : friendPrivacyButtonLabel}
              {audienceFriendCount > 0 ? ` (${audienceFriendCount})` : ""}
            </button>
          ) : null}
        </div>
      </section>

      <section className={styles.panel}>
        <form className={styles.form} onSubmit={handlePostPublish}>
          <div className={styles.mediaColumn}>
            <div className={styles.publishPicker}>
              <ImageUpload
                Icon={uploadIntent === "video" ? MdPlayCircleOutline : MdOutlinePhotoLibrary}
                className={styles.publishUploader}
                buttonClassName={styles.primaryAction}
                onFileSelect={handlePostFileSelect}
                accept={uploadIntent === "video" ? "video/*" : "image/*"}
                label={selectedPostFile ? "Change media" : `Choose ${uploadIntent === "video" ? "video" : "photo"}`}
                disabled={postUploadLoading}
                title={`Choose a ${uploadIntent === "video" ? "video" : "photo"} for your post`}
              />

              {selectedPostFile ? (
                <button
                  type="button"
                  className={styles.secondaryAction}
                  onClick={resetPostComposer}
                >
                  Clear draft
                </button>
              ) : null}
            </div>

            {selectedPostFile ? (
              <div className={styles.postPreviewCard}>
                {selectedPostType === "video" ? (
                  <div className={styles.videoPreviewShell}>
                    <video
                      key={previewVideoSource}
                      src={previewVideoSource}
                      ref={previewVideoRef}
                      className={styles.postPreviewMedia}
                      controls
                      preload="metadata"
                    />

                    {isVideoShortsUpload ? (
                      <div className={styles.trimOverlay}>
                        {videoMetadataLoading ? (
                          <div className={styles.trimOverlayStatus}>Loading video length...</div>
                        ) : clipPreviewLoading ? (
                          <div className={styles.trimOverlayStatus}>Preparing clip preview...</div>
                        ) : canTrimSelectedVideo ? (
                          <>
                            <div className={styles.trimOverlayHeader}>
                              <div>
                                <strong>Video Shorts clip</strong>
                                <small>
                                  {formatDurationLabel(clipStartSeconds)} to{" "}
                                  {formatDurationLabel(clipEndSeconds)}
                                </small>
                              </div>
                              <span className={styles.trimOverlayBadge}>
                                Length {formatDurationLabel(selectedClipDuration)}
                              </span>
                            </div>

                            <div className={styles.trimOverlayControl}>
                              <div className={styles.trimOverlayLabelRow}>
                                <label htmlFor="video-short-start">Start</label>
                                <span>{formatDurationLabel(clipStartSeconds)}</span>
                              </div>
                              <input
                                id="video-short-start"
                                type="range"
                                min="0"
                                max={videoDurationSeconds}
                                step={CLIP_SLIDER_STEP_SECONDS}
                                value={clipStartSeconds}
                                onChange={handleClipStartChange}
                              />
                            </div>

                            <div className={styles.trimOverlayControl}>
                              <div className={styles.trimOverlayLabelRow}>
                                <label htmlFor="video-short-end">End</label>
                                <span>{formatDurationLabel(clipEndSeconds)}</span>
                              </div>
                              <input
                                id="video-short-end"
                                type="range"
                                min="0"
                                max={videoDurationSeconds}
                                step={CLIP_SLIDER_STEP_SECONDS}
                                value={clipEndSeconds}
                                onChange={handleClipEndChange}
                              />
                            </div>
                          </>
                        ) : (
                          <div className={styles.trimOverlayStatus}>
                            This video could not be prepared for trimming.
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <img
                    src={postPreviewUrl}
                    alt="Selected post draft"
                    className={styles.postPreviewMedia}
                  />
                )}

                <div className={styles.postPreviewMeta}>
                  <strong>{formatPostKindLabel(selectedPostType, postForm.contentFormat)}</strong>
                  <small>{selectedPostFile.name}</small>
                  {selectedPostType === "video" && videoDurationSeconds > 0 ? (
                    <small>Original length: {formatDurationLabel(videoDurationSeconds)}</small>
                  ) : null}
                  {isVideoShortsUpload && canTrimSelectedVideo ? (
                    <small>
                      Uploading clip: {formatDurationLabel(clipStartSeconds)} to{" "}
                      {formatDurationLabel(clipEndSeconds)} ({formatDurationLabel(selectedClipDuration)})
                    </small>
                  ) : null}
                  {postForm.tags.trim() ? <small>Tags: {postForm.tags.trim()}</small> : null}
                </div>

              </div>
            ) : null}

            {isVideoShortsUpload && canTrimSelectedVideo ? (
              <div className={styles.trimUtilityBar}>
                <button
                  type="button"
                  className={styles.secondaryAction}
                  onClick={handlePreviewSelectedClip}
                  disabled={clipPreviewLoading}
                >
                  {clipPreviewLoading ? "Preparing preview..." : isPreviewingClip ? "Previewing..." : "Preview clip"}
                </button>
                <button
                  type="button"
                  className={styles.secondaryAction}
                  onClick={handleResetClipSelection}
                  disabled={!clipIsTrimmed}
                >
                  Use full video
                </button>
              </div>
            ) : null}
          </div>

          <div className={styles.detailsColumn}>
            <label className={styles.field}>
              <span>Title</span>
              <input
                type="text"
                name="title"
                placeholder="Give this post a title"
                value={postForm.title}
                onChange={handlePostInputChange}
              />
            </label>

            <label className={styles.field}>
              <span>Description</span>
              <textarea
                name="description"
                placeholder="Write a short caption or article intro"
                value={postForm.description}
                onChange={handlePostInputChange}
              />
            </label>

            <label className={styles.field}>
              <span>Tags</span>
              <input
                type="text"
                name="tags"
                placeholder="funny, educational, memes, songs, movie clips, etc"
                value={postForm.tags}
                onChange={handlePostInputChange}
              />
            </label>

            <label className={styles.field}>
              <span>Post visibility</span>
              <select
                name="visibility"
                value={postForm.visibility}
                onChange={handlePostInputChange}
              >
                <option value="all">Share with all</option>
                <option value="world">Share with world</option>
                <option value="friends">Share only with friends</option>
                <option value="private">Private post</option>
              </select>
            </label>

            {ownerFriends.length || friendsLoading ? (
              <div className={styles.mobileFriendAction}>
                <button
                  type="button"
                  className={styles.friendPrivacyButton}
                  onClick={() => setFriendPrivacyPickerOpen((prev) => !prev)}
                >
                  {friendPrivacyPickerOpen ? friendPrivacyCloseLabel : friendPrivacyButtonLabel}
                  {audienceFriendCount > 0 ? ` (${audienceFriendCount})` : ""}
                </button>
              </div>
            ) : null}

            {uploadIntent === "video" ? (
              <div className={styles.playlistPanel}>
                <div className={styles.playlistHeader}>
                  <div>
                    <strong>Add to playlists</strong>
                    <p>Attach this upload to existing playlists or create a new public playlist.</p>
                  </div>
                </div>

                {playlistsLoading ? (
                  <div className={styles.emptyState}>Loading your playlists...</div>
                ) : ownerPlaylists.length === 0 ? (
                  <div className={styles.emptyState}>
                    No playlists yet. You can create a new one below while uploading this video.
                  </div>
                ) : (
                  <div className={styles.playlistPicker}>
                    {ownerPlaylists.map((playlist) => (
                      <label key={playlist._id} className={styles.playlistOption}>
                        <input
                          type="checkbox"
                          checked={selectedPlaylistIds.includes(playlist._id)}
                          onChange={() => handlePlaylistToggle(playlist._id)}
                        />
                        <div>
                          <strong>{playlist.title}</strong>
                          <small>{playlist.videoCount || 0} videos</small>
                        </div>
                      </label>
                    ))}
                  </div>
                )}

                <label className={styles.field}>
                  <span>Create new playlist</span>
                  <input
                    type="text"
                    placeholder="travel vlogs, tutorials, highlights..."
                    value={newPlaylistTitle}
                    onChange={(event) => setNewPlaylistTitle(event.target.value)}
                  />
                </label>

                <label className={styles.field}>
                  <span>New playlist description</span>
                  <textarea
                    placeholder="Tell visitors what this playlist is about"
                    value={newPlaylistDescription}
                    onChange={(event) => setNewPlaylistDescription(event.target.value)}
                  />
                </label>
              </div>
            ) : null}

            <button
              type="submit"
              className={styles.primarySubmit}
              disabled={postUploadLoading || clipExportLoading || !selectedPostFile}
            >
              {clipExportLoading ? "Preparing clip..." : postUploadLoading ? "Publishing..." : "Publish post"}
            </button>
          </div>
        </form>

        {friendPrivacyPickerOpen ? (
          <div
            className={styles.cardAudienceOverlay}
            role="dialog"
            aria-modal="true"
            aria-label="Choose friends for this upload audience"
          >
            <button
              type="button"
              className={styles.cardAudienceBackdrop}
              onClick={() => setFriendPrivacyPickerOpen(false)}
              aria-label="Close friends privacy picker"
            />

            <div className={styles.cardAudiencePanel}>
              <div className={styles.cardAudiencePanelHeader}>
                <div className={styles.playlistHeader}>
                  <div>
                    <strong>{friendPrivacyHeading}</strong>
                    <p>{friendPrivacyDescription}</p>
                  </div>
                </div>

                <button
                  type="button"
                  className={styles.friendPrivacyClose}
                  onClick={() => setFriendPrivacyPickerOpen(false)}
                >
                  Close
                </button>
              </div>

              {friendsLoading ? (
                <div className={styles.emptyState}>Loading your friends...</div>
              ) : ownerFriends.length === 0 ? (
                <div className={styles.emptyState}>
                  Add friends first if you want to hide this upload from specific people.
                </div>
              ) : (
                <>
                  <label className={styles.friendSearchField}>
                    <span>Search friend</span>
                    <input
                      type="text"
                      value={friendSearchText}
                      onChange={(event) => setFriendSearchText(event.target.value)}
                      placeholder="Search by name, email, or profession"
                    />
                  </label>

                  {visibleFriends.length ? (
                    <div className={styles.friendPicker}>
                      {visibleFriends.map((friend) => (
                        <label key={friend._id} className={styles.friendOption}>
                          <input
                            type="checkbox"
                            checked={activeAudienceFriendIds.includes(friend._id)}
                            onChange={() => handleAudienceFriendToggle(friend._id)}
                          />
                          <div>
                            <strong>{friend.username || "Friend"}</strong>
                            <small>{friend.profession || friend.email || "Connected friend"}</small>
                          </div>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <div className={styles.emptyState}>
                      No friends matched `{friendSearchText.trim()}`.
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        ) : null}
      </section>
    </main>
  );
};
