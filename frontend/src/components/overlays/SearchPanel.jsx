import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import noProfile from "../../assets/noProfile.png";
import api from "../../lib/api";
import styles from "./SearchPanel.module.css";

const formatDisplayValue = (value) => {
  if (!value) return "";

  return `${value}`
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

const getLocationLabel = (value) => {
  if (!Array.isArray(value) || value.length === 0) {
    return "";
  }

  return value.map(formatDisplayValue).join(", ");
};

export const SearchPanel = ({ className, onClose }) => {
  const navigate = useNavigate();
  const [activeType, setActiveType] = useState("profile");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [requestingId, setRequestingId] = useState(null);

  const helperCopy = useMemo(() => {
    if (activeType === "profile") {
      return "Search by username or email to find people and send friend requests.";
    }

    return "This search type is not wired yet.";
  }, [activeType]);

  const handleSearch = async () => {
    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      setResults([]);
      return;
    }

    if (activeType !== "profile") {
      toast.info("Only profile search is live right now.");
      return;
    }

    try {
      setSearching(true);
      const response = await api.get("/network/search-users", {
        params: { q: trimmedQuery },
      });
      setResults(response.data?.data || []);
    } catch (error) {
      toast.error(error.response?.data?.message || "Search failed");
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleFriendRequest = async (targetUserId) => {
    try {
      setRequestingId(targetUserId);
      const response = await api.post(`/network/friend-requests/${targetUserId}`);

      setResults((prev) =>
        prev.map((item) =>
          item._id === targetUserId
            ? {
                ...item,
                relationshipStatus:
                  response.data?.data?.relationshipStatus || "pending_sent",
              }
            : item,
        ),
      );

      toast.success(response.data?.message || "Friend request sent");
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not send request");
    } finally {
      setRequestingId(null);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleSearch();
    }
  };

  const handleViewProfile = (targetUserId) => {
    navigate(`/profile/${targetUserId}`);
    onClose?.();
  };

  const renderAction = (user) => {
    if (user.relationshipStatus === "friends") {
      return <span className={styles.statusChip}>Friends</span>;
    }

    if (user.relationshipStatus === "pending_sent") {
      return <span className={styles.statusChip}>Request sent</span>;
    }

    if (user.relationshipStatus === "pending_received") {
      return <span className={styles.statusChip}>Sent you a request</span>;
    }

    return (
      <button
        type="button"
        className={styles.requestBtn}
        onClick={() => handleFriendRequest(user._id)}
        disabled={requestingId === user._id}
      >
        {requestingId === user._id ? "Sending..." : "Add friend"}
      </button>
    );
  };

  return (
    <section className={`${styles.searchOverlay} ${className}`}>
      <div className={styles.searchContainer}>
        <div className={styles.searchHeader}>
          <div>
            <h3>Search</h3>
            <p>{helperCopy}</p>
          </div>
          <button onClick={onClose} className={styles.closeBtn} type="button">
            x
          </button>
        </div>

        <div className={styles.searchOptions}>
          <button
            className={activeType === "profile" ? styles.active : ""}
            onClick={() => setActiveType("profile")}
            type="button"
          >
            Profiles
          </button>

          <button
            className={activeType === "video" ? styles.active : ""}
            onClick={() => setActiveType("video")}
            type="button"
          >
            Videos
          </button>

          <button
            className={activeType === "image" ? styles.active : ""}
            onClick={() => setActiveType("image")}
            type="button"
          >
            Image Posts
          </button>
        </div>

        <div className={styles.searchInputWrapper}>
          <input
            type="search"
            placeholder={`Search ${activeType}...`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button onClick={handleSearch} type="button">
            {searching ? "Searching..." : "Search"}
          </button>
        </div>

        {activeType !== "profile" ? (
          <div className={styles.resultsPlaceholder}>
            Search for videos and image posts is still waiting to be wired.
          </div>
        ) : results.length === 0 ? (
          <div className={styles.resultsPlaceholder}>
            {query.trim()
              ? "No profiles found for that search yet."
              : "Search for people and send them a friend request from here."}
          </div>
        ) : (
          <div className={styles.resultsList}>
            {results.map((user) => {
              const location = getLocationLabel(user.location);
              const bio =
                Array.isArray(user.bio) && user.bio.length > 0 ? user.bio[0] : "";
              const talents =
                Array.isArray(user.talent) && user.talent.length > 0
                  ? user.talent.slice(0, 3)
                  : [];

              return (
                <article className={styles.resultCard} key={user._id}>
                  <button
                    type="button"
                    className={styles.resultMain}
                    onClick={() => handleViewProfile(user._id)}
                  >
                    <img
                      src={user.avatar || noProfile}
                      alt={user.username}
                      className={styles.resultAvatar}
                    />
                    <div className={styles.resultInfo}>
                      <div className={styles.resultIdentity}>
                        <h4>{user.username}</h4>
                        {user.profession ? (
                          <span>{formatDisplayValue(user.profession)}</span>
                        ) : null}
                      </div>
                      {user.email ? (
                        <p className={styles.resultEmail}>{user.email}</p>
                      ) : null}
                      {location ? (
                        <p className={styles.resultLocation}>{location}</p>
                      ) : null}
                      {bio ? <p className={styles.resultBio}>{bio}</p> : null}
                      {talents.length > 0 ? (
                        <div className={styles.resultTags}>
                          {talents.map((talent) => (
                            <span key={talent}>{formatDisplayValue(talent)}</span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </button>
                  <div className={styles.resultAction}>
                    <button
                      type="button"
                      className={styles.viewBtn}
                      onClick={() => handleViewProfile(user._id)}
                    >
                      View profile
                    </button>
                    {renderAction(user)}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};
