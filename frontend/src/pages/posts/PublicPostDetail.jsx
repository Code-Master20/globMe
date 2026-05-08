import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { MdOutlineChatBubbleOutline, MdOutlineFavoriteBorder } from "react-icons/md";
import { PiShareFatLight } from "react-icons/pi";
import { toast } from "react-toastify";
import api from "../../lib/api";
import noProfile from "../../assets/noProfile.png";
import { AuthAccessPrompt } from "../../components/auth/AuthAccessPrompt";
import { usePageMetadata } from "../../hooks/usePageMetadata";
import styles from "./PublicPostDetail.module.css";

const formatDisplayValue = (value) => {
  if (!value) return "";

  return `${value}`
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

export const PublicPostDetail = () => {
  const { postId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useSelector((state) => state.auth);
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [watchLaterLoading, setWatchLaterLoading] = useState(false);

  usePageMetadata({
    title: post?.title ? formatDisplayValue(post.title) : "Public post",
    description:
      post?.description ||
      "Explore a public globMe post and open the creator profile before signing in.",
  });

  useEffect(() => {
    let ignore = false;

    const loadPost = async () => {
      try {
        setLoading(true);
        setError("");
        const response = await api.get(`/public/posts/${postId}`);

        if (!ignore) {
          setPost(response.data?.data || null);
        }
      } catch (loadError) {
        if (!ignore) {
          setPost(null);
          setError(loadError.response?.data?.message || "That post could not be loaded.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    loadPost();

    return () => {
      ignore = true;
    };
  }, [postId]);

  const handleProtectedAction = () => {
    if (isAuthenticated) {
      toast.info("This action will be wired next.");
      return;
    }

    setShowAuthPrompt(true);
  };

  const handleWatchLaterToggle = async () => {
    if (!post?._id) {
      return;
    }

    if (!isAuthenticated) {
      setShowAuthPrompt(true);
      return;
    }

    try {
      setWatchLaterLoading(true);
      const response = await api.post(`/user/watch-later/${post._id}`);
      const isSaved = Boolean(response.data?.data?.savedToWatchLater);

      setPost((prev) =>
        prev
          ? {
              ...prev,
              savedToWatchLater: isSaved,
            }
          : prev,
      );

      toast.success(response.data?.message || "Watch later updated");
    } catch (toggleError) {
      toast.error(toggleError.response?.data?.message || "Watch later update failed");
    } finally {
      setWatchLaterLoading(false);
    }
  };

  if (loading) {
    return (
      <main className={styles.page}>
        <section className={styles.placeholder}>Loading public post...</section>
      </main>
    );
  }

  if (!post) {
    return (
      <main className={styles.page}>
        <section className={styles.placeholder}>
          <h1>Post unavailable</h1>
          <p>{error || "This public post could not be found right now."}</p>
        </section>
      </main>
    );
  }

  return (
    <>
      <main className={styles.page}>
        <article className={styles.card}>
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
            <div>
              <strong>{post.user?.username || "globMe member"}</strong>
              <span>
                {formatDisplayValue(post.user?.profession) || "Public profile"}
              </span>
            </div>
          </button>

          <div className={styles.mediaFrame}>
            {post.postType === "video" ? (
              <video
                src={post.url}
                className={styles.media}
                controls
                playsInline
                preload="metadata"
              />
            ) : (
              <img
                src={post.url}
                alt={post.title || "Public post"}
                className={styles.media}
              />
            )}
          </div>

          <div className={styles.copy}>
            <p className={styles.kicker}>
              {formatDisplayValue(post.postType) || "Post"}
              {post.contentFormat ? ` | ${formatDisplayValue(post.contentFormat)}` : ""}
            </p>
            <h1>{formatDisplayValue(post.title) || "Public post"}</h1>
            <p>{post.description || "This post is publicly visible on globMe."}</p>
          </div>

          <div className={styles.statGroup}>
            <span>{post.likeCount || 0} likes</span>
            <span>{post.commentCount || 0} comments</span>
            <span>{post.shareCount || 0} shares</span>
          </div>

          <div className={styles.actionGroup}>
            {post.postType === "video" ? (
              <button type="button" className={styles.actionBtn} onClick={handleWatchLaterToggle}>
                {watchLaterLoading
                  ? "Saving..."
                  : post.savedToWatchLater
                    ? "Saved"
                    : "Watch later"}
              </button>
            ) : null}
            <button type="button" className={styles.actionBtn} onClick={handleProtectedAction}>
              <MdOutlineFavoriteBorder />
              Like
            </button>
            <button type="button" className={styles.actionBtn} onClick={handleProtectedAction}>
              <MdOutlineChatBubbleOutline />
              Comment
            </button>
            <button type="button" className={styles.actionBtn} onClick={handleProtectedAction}>
              <PiShareFatLight />
              Share
            </button>
          </div>
        </article>
      </main>

      <AuthAccessPrompt
        open={showAuthPrompt}
        onClose={() => setShowAuthPrompt(false)}
        title="Log in to interact with this post"
        description="Guests can browse public posts, but reactions, comments, and shares need an account so your actions can be tracked."
      />
    </>
  );
};
