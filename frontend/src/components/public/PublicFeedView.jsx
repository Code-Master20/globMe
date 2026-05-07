import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MdOutlineChatBubbleOutline, MdOutlineFavoriteBorder } from "react-icons/md";
import { PiShareFatLight } from "react-icons/pi";
import { toast } from "react-toastify";
import { useSelector } from "react-redux";
import api from "../../lib/api";
import { AuthAccessPrompt } from "../auth/AuthAccessPrompt";
import { usePageMetadata } from "../../hooks/usePageMetadata";
import noProfile from "../../assets/noProfile.png";
import { StoryTray } from "../story/StoryTray";
import styles from "./PublicFeedView.module.css";

const formatDisplayValue = (value) => {
  if (!value) return "";

  return `${value}`
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

const getDescriptionText = (post) => {
  if (post.description) {
    return post.description;
  }

  if (post.title) {
    return post.title;
  }

  return "A fresh globMe post shared publicly.";
};

export const PublicFeedView = ({
  title,
  description,
  filterType = "all",
  showStoryTray = false,
  emptyHeading,
  emptyCopy,
  seoTitle,
  seoDescription,
}) => {
  const navigate = useNavigate();
  const { isAuthenticated } = useSelector((state) => state.auth);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);

  usePageMetadata({
    title: seoTitle || title,
    description: seoDescription || description,
  });

  useEffect(() => {
    let ignore = false;

    const loadPosts = async () => {
      try {
        setLoading(true);
        const response = await api.get("/public/posts", {
          params: {
            type: filterType,
            limit: 24,
          },
        });

        if (!ignore) {
          setPosts(response.data?.data || []);
        }
      } catch (error) {
        if (!ignore) {
          toast.error(error.response?.data?.message || "Could not load posts");
          setPosts([]);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    loadPosts();

    return () => {
      ignore = true;
    };
  }, [filterType]);

  const handleProtectedAction = () => {
    if (isAuthenticated) {
      toast.info("This action will be wired next.");
      return;
    }

    setShowAuthPrompt(true);
  };

  return (
    <>
      <main className={styles.page}>
        {showStoryTray ? (
          <StoryTray onRequireAuth={() => setShowAuthPrompt(true)} />
        ) : null}

        {loading ? (
          <section className={styles.placeholder}>Loading public posts...</section>
        ) : posts.length === 0 ? (
          <section className={styles.placeholder}>
            <h2>{emptyHeading}</h2>
            <p>{emptyCopy}</p>
          </section>
        ) : (
          <section className={styles.feedGrid}>
            {posts.map((post) => (
              <article key={post._id} className={styles.feedCard}>
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
                  <div className={styles.profileMeta}>
                    <strong>{post.user?.username || "globMe member"}</strong>
                    <span>
                      {formatDisplayValue(post.user?.profession) || "Public profile"}
                    </span>
                  </div>
                </button>

                <div className={styles.mediaFrame}>
                  <button
                    type="button"
                    className={styles.mediaButton}
                    onClick={() => navigate(`/posts/${post._id}`)}
                  >
                    <img
                      src={post.url}
                      alt={post.title || post.description || "globMe post"}
                      className={styles.media}
                      loading="lazy"
                    />
                  </button>
                </div>

                <div className={styles.cardBody}>
                  <button
                    type="button"
                    className={styles.titleButton}
                    onClick={() => navigate(`/posts/${post._id}`)}
                  >
                    <h2>{formatDisplayValue(post.title) || "Public post"}</h2>
                  </button>
                  <p>{getDescriptionText(post)}</p>
                </div>

                <div className={styles.cardFooter}>
                  <div className={styles.statGroup}>
                    <span>{post.likeCount || 0} likes</span>
                    <span>{post.commentCount || 0} comments</span>
                    <span>{post.shareCount || 0} shares</span>
                  </div>

                  <div className={styles.actionGroup}>
                    <button
                      type="button"
                      className={styles.actionBtn}
                      onClick={handleProtectedAction}
                    >
                      <MdOutlineFavoriteBorder />
                      Like
                    </button>
                    <button
                      type="button"
                      className={styles.actionBtn}
                      onClick={handleProtectedAction}
                    >
                      <MdOutlineChatBubbleOutline />
                      Comment
                    </button>
                    <button
                      type="button"
                      className={styles.actionBtn}
                      onClick={handleProtectedAction}
                    >
                      <PiShareFatLight />
                      Share
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </section>
        )}
      </main>

      <AuthAccessPrompt
        open={showAuthPrompt}
        onClose={() => setShowAuthPrompt(false)}
        title="Log in to interact with posts"
        description="Guests can browse posts and profiles publicly. Create an account when you want to react, comment, share, or connect with people."
      />
    </>
  );
};
