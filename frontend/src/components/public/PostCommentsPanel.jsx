import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import EmojiPicker from "emoji-picker-react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  MdClose,
  MdFlipCameraAndroid,
  MdFavorite,
  MdImage,
  MdInsertPhoto,
  MdLink,
  MdOutlineFavoriteBorder,
  MdOutlineEmojiEmotions,
  MdPhotoCamera,
  MdReply,
} from "react-icons/md";
import { toast } from "react-toastify";
import api from "../../lib/api";
import noProfile from "../../assets/noProfile.png";
import styles from "./PostCommentsPanel.module.css";

const URL_MATCHER = /(https?:\/\/[^\s]+|www\.[^\s]+)/i;
const DESKTOP_EMOJI_MEDIA_QUERY = "(hover: hover) and (pointer: fine)";

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

const updateCommentTree = (items, commentId, updater) =>
  items.map((item) => {
    if (item._id === commentId) {
      return updater(item);
    }

    if (!Array.isArray(item.replies) || item.replies.length === 0) {
      return item;
    }

    return {
      ...item,
      replies: updateCommentTree(item.replies, commentId, updater),
    };
  });

const insertCommentIntoTree = (items, nextComment) => {
  if (!nextComment?._id) {
    return items;
  }

  if (!nextComment.parentCommentId) {
    return [nextComment, ...items];
  }

  return items.map((item) => {
    if (item._id === nextComment.parentCommentId) {
      return {
        ...item,
        replies: [nextComment, ...(Array.isArray(item.replies) ? item.replies : [])],
      };
    }

    if (!Array.isArray(item.replies) || item.replies.length === 0) {
      return item;
    }

    return {
      ...item,
      replies: insertCommentIntoTree(item.replies, nextComment),
    };
  });
};

const buildCommentFormData = ({ comment, imageFile, parentCommentId }) => {
  const formData = new FormData();
  const normalizedComment = comment.trim();
  const matchedUrl = normalizedComment.match(URL_MATCHER);

  if (normalizedComment) {
    formData.append("comment", normalizedComment);
  }

  if (matchedUrl?.[0]) {
    formData.append("linkUrl", matchedUrl[0]);
  }

  if (imageFile) {
    formData.append("image", imageFile);
  }

  if (parentCommentId) {
    formData.append("parentCommentId", parentCommentId);
  }

  return formData;
};

const useDesktopEmojiAccess = () => {
  const subscribe = (onStoreChange) => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return () => {};
    }

    const mediaQuery = window.matchMedia(DESKTOP_EMOJI_MEDIA_QUERY);

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", onStoreChange);
      return () => mediaQuery.removeEventListener("change", onStoreChange);
    }

    mediaQuery.addListener(onStoreChange);
    return () => mediaQuery.removeListener(onStoreChange);
  };

  const getSnapshot = () => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return false;
    }

    return window.matchMedia(DESKTOP_EMOJI_MEDIA_QUERY).matches;
  };

  return useSyncExternalStore(subscribe, getSnapshot, () => false);
};

const CommentComposer = ({
  title = "",
  subtitle = "",
  value,
  onChange,
  onEmojiPick,
  onMediaPick,
  onCameraCapture,
  imagePreview,
  imageFileName,
  onImageRemove,
  onSubmit,
  submitLabel,
  submitting = false,
  compact = false,
  inlineReply = false,
  onCancel,
}) => {
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const hasDesktopEmojiAccess = useDesktopEmojiAccess();
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraFacingMode, setCameraFacingMode] = useState("environment");
  const [cameraBusy, setCameraBusy] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const videoPreviewRef = useRef(null);
  const cameraStreamRef = useRef(null);

  const stopCameraStream = () => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
    }

    if (videoPreviewRef.current) {
      videoPreviewRef.current.srcObject = null;
    }
  };

  const handleCloseCamera = () => {
    stopCameraStream();
    setCameraOpen(false);
    setCameraBusy(false);
    setCameraError("");
  };

  const handleOpenCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Camera is not available on this device.");
      setCameraOpen(true);
      return;
    }

    try {
      setCameraBusy(true);
      setCameraError("");
      stopCameraStream();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: cameraFacingMode,
        },
        audio: false,
      });

      cameraStreamRef.current = stream;
      setCameraOpen(true);

      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
        await videoPreviewRef.current.play().catch(() => {});
      }
    } catch {
      setCameraError("Camera access was blocked.");
      setCameraOpen(true);
    } finally {
      setCameraBusy(false);
    }
  };

  const handleSwitchCamera = async () => {
    const nextFacingMode =
      cameraFacingMode === "environment" ? "user" : "environment";

    setCameraFacingMode(nextFacingMode);

    if (!cameraOpen) {
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      return;
    }

    try {
      setCameraBusy(true);
      setCameraError("");
      stopCameraStream();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: nextFacingMode,
        },
        audio: false,
      });

      cameraStreamRef.current = stream;

      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
        await videoPreviewRef.current.play().catch(() => {});
      }
    } catch {
      setCameraError("Could not switch camera.");
    } finally {
      setCameraBusy(false);
    }
  };

  const handleTakePhoto = async () => {
    const videoNode = videoPreviewRef.current;

    if (!videoNode || !cameraStreamRef.current) {
      return;
    }

    const canvas = document.createElement("canvas");
    const width = videoNode.videoWidth || 1280;
    const height = videoNode.videoHeight || 720;
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");

    if (!context) {
      setCameraError("Camera capture failed.");
      return;
    }

    context.drawImage(videoNode, 0, 0, width, height);

    const blob = await new Promise((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", 0.92);
    });

    if (!blob) {
      setCameraError("Camera capture failed.");
      return;
    }

    const file = new File([blob], `comment-camera-${Date.now()}.jpg`, {
      type: "image/jpeg",
    });

    onCameraCapture(file);
    handleCloseCamera();
  };

  useEffect(() => () => {
    stopCameraStream();
  }, []);

  useEffect(() => {
    if (!cameraOpen || !videoPreviewRef.current || !cameraStreamRef.current) {
      return;
    }

    videoPreviewRef.current.srcObject = cameraStreamRef.current;
    videoPreviewRef.current.play().catch(() => {});
  }, [cameraOpen]);

  useEffect(() => {
    if (!hasDesktopEmojiAccess && emojiPickerOpen) {
      setEmojiPickerOpen(false);
    }
  }, [emojiPickerOpen, hasDesktopEmojiAccess]);

  return (
    <>
      <form
        className={`${styles.composerCard} ${compact ? styles.composerCardCompact : ""} ${
          inlineReply ? styles.composerCardInlineReply : ""
        }`}
        onSubmit={onSubmit}
      >
        {title || subtitle || onCancel ? (
          <div className={styles.composerHeader}>
            <div>
              {title ? <strong>{title}</strong> : null}
              {subtitle ? <span>{subtitle}</span> : null}
            </div>
            {onCancel && !inlineReply ? (
              <button
                type="button"
                className={styles.inlineGhostButton}
                onClick={onCancel}
              >
                Cancel
              </button>
            ) : null}
          </div>
        ) : null}

        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={`${styles.composerTextarea} ${
            inlineReply ? styles.composerTextareaInlineReply : ""
          }`}
          placeholder={inlineReply ? "Write a reply..." : "Comment"}
          disabled={submitting}
        />

        {hasDesktopEmojiAccess && emojiPickerOpen ? (
          <div className={styles.emojiPickerWrap}>
            <EmojiPicker
              width="100%"
              lazyLoadEmojis
              onEmojiClick={(emojiData) => {
                onEmojiPick(emojiData.emoji);
                setEmojiPickerOpen(false);
              }}
            />
          </div>
        ) : null}

        <div className={styles.composerToolbar}>
          <div
            className={`${styles.uploadActions} ${
              inlineReply ? styles.uploadActionsInlineReply : ""
            }`}
          >
            {hasDesktopEmojiAccess ? (
              <button
                type="button"
                className={styles.uploadChip}
                onClick={() => setEmojiPickerOpen((open) => !open)}
                disabled={submitting}
              >
                <MdOutlineEmojiEmotions />
                <span>Emoji</span>
              </button>
            ) : null}
            <label className={styles.uploadChip}>
              <MdImage />
              <span>{imagePreview ? "Change media" : "Media"}</span>
              <input
                type="file"
                accept="image/*"
                onChange={onMediaPick}
                disabled={submitting}
              />
            </label>
            <button
              type="button"
              className={styles.uploadChip}
              onClick={handleOpenCamera}
              disabled={submitting || cameraBusy}
            >
              <MdInsertPhoto />
              <span>{cameraBusy ? "Opening..." : "Camera"}</span>
            </button>
          </div>
          <div className={styles.composerSubmitActions}>
            {inlineReply && onCancel ? (
              <button
                type="button"
                className={styles.replyCancelButton}
                onClick={onCancel}
                disabled={submitting}
              >
                Cancel
              </button>
            ) : null}
            <button
              type="submit"
              className={styles.primaryButton}
              onClick={() => setEmojiPickerOpen(false)}
              disabled={submitting}
            >
              {submitting ? "Posting..." : submitLabel}
            </button>
          </div>
        </div>

        {imagePreview ? (
          <div className={styles.imagePreviewCard}>
            <img src={imagePreview} alt={imageFileName || "Comment attachment"} />
            <button
              type="button"
              className={styles.imageRemoveButton}
              onClick={onImageRemove}
              disabled={submitting}
              aria-label="Remove attached photo"
            >
              <MdClose />
            </button>
          </div>
        ) : null}
      </form>

      {cameraOpen ? (
        <div
          className={styles.cameraOverlay}
          onClick={handleCloseCamera}
        >
          <div
            className={styles.cameraCard}
            role="dialog"
            aria-modal="true"
            aria-label="Capture photo"
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.cameraHeader}>
              <strong>Camera</strong>
              <button
                type="button"
                className={styles.cameraCloseButton}
                onClick={handleCloseCamera}
                aria-label="Close camera"
              >
                <MdClose />
              </button>
            </div>

            <div className={styles.cameraViewport}>
              {cameraError ? (
                <div className={styles.cameraState}>{cameraError}</div>
              ) : (
                <video
                  ref={videoPreviewRef}
                  className={styles.cameraVideo}
                  autoPlay
                  playsInline
                  muted
                />
              )}
            </div>

            <div className={styles.cameraActions}>
              <button
                type="button"
                className={styles.cameraActionButton}
                onClick={handleSwitchCamera}
                disabled={cameraBusy || Boolean(cameraError)}
              >
                <MdFlipCameraAndroid />
                Flip
              </button>
              <button
                type="button"
                className={styles.cameraActionPrimary}
                onClick={handleTakePhoto}
                disabled={cameraBusy || Boolean(cameraError)}
              >
                <MdPhotoCamera />
                Capture
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
};

export const PostCommentsPanel = ({
  postId,
  postOwnerId,
  commentCount = 0,
  onCommentCountChange,
  onRequireAuth,
}) => {
  const navigate = useNavigate();
  const { isAuthenticated } = useSelector((state) => state.auth);
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [commentsError, setCommentsError] = useState("");
  const [commentDraft, setCommentDraft] = useState("");
  const [commentImageFile, setCommentImageFile] = useState(null);
  const [commentImagePreview, setCommentImagePreview] = useState("");
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [commentLikeBusyId, setCommentLikeBusyId] = useState("");
  const [activeReplyCommentId, setActiveReplyCommentId] = useState("");
  const [replyDraft, setReplyDraft] = useState("");
  const [replyImageFile, setReplyImageFile] = useState(null);
  const [replyImagePreview, setReplyImagePreview] = useState("");
  const [replySubmitting, setReplySubmitting] = useState(false);
  const onCommentCountChangeRef = useRef(onCommentCountChange);

  useEffect(() => {
    onCommentCountChangeRef.current = onCommentCountChange;
  }, [onCommentCountChange]);

  const syncCommentCount = (nextCommentCount) => {
    onCommentCountChangeRef.current?.(nextCommentCount);
  };

  useEffect(() => {
    let ignore = false;

    const loadComments = async () => {
      try {
        setCommentsLoading(true);
        setCommentsError("");
        const response = await api.get(`/public/posts/${postId}/comments`);
        const payload = response.data?.data || {};

        if (!ignore) {
          const nextComments = Array.isArray(payload.comments) ? payload.comments : [];
          const nextCommentCount = Number(payload.commentCount ?? nextComments.length);

          setComments(nextComments);
          syncCommentCount(nextCommentCount);
        }
      } catch (error) {
        if (!ignore) {
          setComments([]);
          setCommentsError(
            error.response?.data?.message || "Comments could not be loaded right now.",
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
  }, [postId]);

  useEffect(() => {
    if (!commentImageFile) {
      setCommentImagePreview("");
      return undefined;
    }

    const objectUrl = URL.createObjectURL(commentImageFile);
    setCommentImagePreview(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [commentImageFile]);

  useEffect(() => {
    if (!replyImageFile) {
      setReplyImagePreview("");
      return undefined;
    }

    const objectUrl = URL.createObjectURL(replyImageFile);
    setReplyImagePreview(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [replyImageFile]);

  const requestAuth = () => {
    if (isAuthenticated) {
      return true;
    }

    onRequireAuth?.();
    return false;
  };

  const clearRootComposer = () => {
    setCommentDraft("");
    setCommentImageFile(null);
  };

  const clearReplyComposer = () => {
    setActiveReplyCommentId("");
    setReplyDraft("");
    setReplyImageFile(null);
  };

  const handleRootSubmit = async (event) => {
    event.preventDefault();

    if (!requestAuth()) {
      return;
    }

    if (!commentDraft.trim() && !commentImageFile) {
      toast.info("Comment or photo required.");
      return;
    }

    try {
      setCommentSubmitting(true);
      const response = await api.post(
        `/user/posts/${postId}/comments`,
        buildCommentFormData({
          comment: commentDraft,
          imageFile: commentImageFile,
        }),
      );

      const nextComment = response.data?.data?.comment || null;
      const nextCommentCount = Number(response.data?.data?.commentCount ?? commentCount + 1);
      syncCommentCount(nextCommentCount);
      if (nextComment) {
        setComments((prev) => insertCommentIntoTree(prev, nextComment));
      }
      clearRootComposer();
      toast.success("Comment added");
    } catch (error) {
      toast.error(error.response?.data?.message || "Comment could not be added");
    } finally {
      setCommentSubmitting(false);
    }
  };

  const handleReplySubmit = async (event) => {
    event.preventDefault();

    if (!activeReplyCommentId) {
      return;
    }

    if (!requestAuth()) {
      return;
    }

    if (!replyDraft.trim() && !replyImageFile) {
      toast.info("Reply or photo required.");
      return;
    }

    try {
      setReplySubmitting(true);
      const response = await api.post(
        `/user/posts/${postId}/comments`,
        buildCommentFormData({
          comment: replyDraft,
          imageFile: replyImageFile,
          parentCommentId: activeReplyCommentId,
        }),
      );

      const nextComment = response.data?.data?.comment || null;
      const nextCommentCount = Number(response.data?.data?.commentCount ?? commentCount + 1);
      syncCommentCount(nextCommentCount);
      if (nextComment) {
        setComments((prev) => insertCommentIntoTree(prev, nextComment));
      }
      clearReplyComposer();
      toast.success("Reply added");
    } catch (error) {
      toast.error(error.response?.data?.message || "Reply could not be added");
    } finally {
      setReplySubmitting(false);
    }
  };

  const handleCommentLikeToggle = async (commentId) => {
    if (!requestAuth()) {
      return;
    }

    try {
      setCommentLikeBusyId(commentId);
      const response = await api.post(`/user/comments/${commentId}/like`);
      const liked = Boolean(response.data?.data?.liked);
      const likeCount = Number(response.data?.data?.likeCount ?? 0);

      setComments((prev) =>
        updateCommentTree(prev, commentId, (item) => ({
          ...item,
          likedByViewer: liked,
          likeCount,
        })),
      );
    } catch (error) {
      toast.error(error.response?.data?.message || "Comment like could not be updated");
    } finally {
      setCommentLikeBusyId("");
    }
  };

  const handleReplyOpen = (commentId) => {
    if (!requestAuth()) {
      return;
    }

    setActiveReplyCommentId(commentId);
    setReplyDraft("");
    setReplyImageFile(null);
  };

  const renderCommentItem = (item, depth = 0) => (
    <article
      key={item._id}
      className={`${styles.commentCard} ${depth > 0 ? styles.replyCard : ""}`}
    >
      <div className={styles.commentHeader}>
        <button
          type="button"
          className={styles.commentIdentity}
          onClick={() => item.user?._id && navigate(`/profile/${item.user._id}`)}
        >
          <img
            src={item.user?.avatar || noProfile}
            alt={item.user?.username || "Comment author"}
            className={styles.commentAvatar}
          />
          <div>
            <strong>{item.user?.username || "globMe member"}</strong>
            <span>{formatRelativeTime(item.createdAt)}</span>
          </div>
        </button>
        {item.isOwnerComment || `${item.user?._id || ""}` === `${postOwnerId || ""}` ? (
          <span className={styles.ownerBadge}>Owner</span>
        ) : null}
      </div>

      {item.comment ? <p className={styles.commentBody}>{item.comment}</p> : null}

      {item.imageUrl ? (
        <img
          src={item.imageUrl}
          alt="Comment attachment"
          className={styles.commentImage}
        />
      ) : null}

      {item.linkUrl ? (
        <a
          href={item.linkUrl}
          target="_blank"
          rel="noreferrer"
          className={styles.commentLink}
        >
          <MdLink />
          <span>{item.linkUrl}</span>
        </a>
      ) : null}

      <div className={styles.commentActions}>
        <button
          type="button"
          className={styles.commentActionButton}
          onClick={() => handleReplyOpen(item._id)}
        >
          <MdReply />
          Reply
        </button>
        <button
          type="button"
          className={`${styles.commentActionButton} ${
            item.likedByViewer ? styles.commentActionButtonActive : ""
          }`}
          onClick={() => handleCommentLikeToggle(item._id)}
          disabled={commentLikeBusyId === item._id}
        >
          {item.likedByViewer ? <MdFavorite /> : <MdOutlineFavoriteBorder />}
          {item.likeCount || 0}
        </button>
      </div>

      {activeReplyCommentId === item._id ? (
        <div className={styles.replyComposerWrap}>
          <CommentComposer
            title={`Reply${item.user?.username ? ` @${item.user.username}` : ""}`}
            value={replyDraft}
            onChange={setReplyDraft}
            onEmojiPick={(emoji) => setReplyDraft((prev) => `${prev}${emoji}`)}
            onMediaPick={(event) => setReplyImageFile(event.target.files?.[0] || null)}
            onCameraCapture={(file) => setReplyImageFile(file)}
            imagePreview={replyImagePreview}
            imageFileName={replyImageFile?.name || ""}
            onImageRemove={() => setReplyImageFile(null)}
            onSubmit={handleReplySubmit}
            submitLabel="Reply"
            submitting={replySubmitting}
            compact
            inlineReply
            onCancel={clearReplyComposer}
          />
        </div>
      ) : null}

      {Array.isArray(item.replies) && item.replies.length > 0 ? (
        <div className={styles.repliesList}>
          {item.replies.map((reply) => renderCommentItem(reply, depth + 1))}
        </div>
      ) : null}
    </article>
  );

  return (
    <section id="post-comments-panel" className={styles.panel}>
      <div className={styles.commentsBody}>
        {commentsLoading ? (
          <div className={styles.stateCard}>Loading comments...</div>
        ) : commentsError ? (
          <div className={styles.stateCard}>{commentsError}</div>
        ) : comments.length === 0 ? (
          <div className={styles.stateCard}>No comments yet.</div>
        ) : (
          <div className={styles.commentsList}>
            {comments.map((item) => renderCommentItem(item))}
          </div>
        )}
      </div>

      <div className={styles.composerDock}>
        <CommentComposer
          value={commentDraft}
          onChange={setCommentDraft}
          onEmojiPick={(emoji) => setCommentDraft((prev) => `${prev}${emoji}`)}
          onMediaPick={(event) => setCommentImageFile(event.target.files?.[0] || null)}
          onCameraCapture={(file) => setCommentImageFile(file)}
          imagePreview={commentImagePreview}
          imageFileName={commentImageFile?.name || ""}
          onImageRemove={() => setCommentImageFile(null)}
          onSubmit={handleRootSubmit}
          submitLabel="Comment"
          submitting={commentSubmitting}
        />
      </div>
    </section>
  );
};
