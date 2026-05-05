import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import noProfile from "../../../assets/noProfile.png";
import api from "../../../lib/api";
import styles from "./PeopleHub.module.css";

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

export const PeopleHub = () => {
  const navigate = useNavigate();
  const [friendRequests, setFriendRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acceptingId, setAcceptingId] = useState(null);

  const loadFriendRequests = async () => {
    try {
      setLoading(true);
      const response = await api.get("/network/friend-requests/received");
      setFriendRequests(response.data?.data || []);
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not load requests");
      setFriendRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFriendRequests();
  }, []);

  const handleAccept = async (requesterUserId) => {
    try {
      setAcceptingId(requesterUserId);
      const response = await api.post(
        `/network/friend-requests/${requesterUserId}/accept`,
      );

      setFriendRequests((prev) =>
        prev.filter((user) => user._id !== requesterUserId),
      );

      toast.success(response.data?.message || "Friend request accepted");
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not accept request");
    } finally {
      setAcceptingId(null);
    }
  };

  return (
    <main className={styles.page}>
      <section className={styles.content}>
        <header className={styles.pageHeader}>
          <div>
            <p>People</p>
            <h1>Friend Requests</h1>
          </div>
          <button type="button" onClick={loadFriendRequests} className={styles.refreshBtn}>
            Refresh
          </button>
        </header>

        {loading ? (
          <section className={styles.placeholder}>Loading friend requests...</section>
        ) : friendRequests.length === 0 ? (
          <section className={styles.placeholder}>
            No pending friend requests right now.
          </section>
        ) : (
          <section className={styles.requestList}>
            {friendRequests.map((user) => {
              const location = getLocationLabel(user.location);
              const bio =
                Array.isArray(user.bio) && user.bio.length > 0 ? user.bio[0] : "";
              const talents =
                Array.isArray(user.talent) && user.talent.length > 0
                  ? user.talent.slice(0, 3)
                  : [];

              return (
                <article className={styles.requestCard} key={user._id}>
                  <div className={styles.requestMain}>
                    <img
                      src={user.avatar || noProfile}
                      alt={user.username}
                      className={styles.avatar}
                    />
                    <div className={styles.requestInfo}>
                      <div className={styles.identity}>
                        <h2>{user.username}</h2>
                        {user.profession ? (
                          <span>{formatDisplayValue(user.profession)}</span>
                        ) : null}
                      </div>
                      {user.email ? <p className={styles.email}>{user.email}</p> : null}
                      {location ? <p className={styles.location}>{location}</p> : null}
                      {bio ? <p className={styles.bio}>{bio}</p> : null}
                      {talents.length > 0 ? (
                        <div className={styles.tags}>
                          {talents.map((talent) => (
                            <span key={talent}>{formatDisplayValue(talent)}</span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className={styles.cardActions}>
                    <button
                      type="button"
                      className={styles.viewBtn}
                      onClick={() => navigate(`/profile/${user._id}`)}
                    >
                      View profile
                    </button>
                    <button
                      type="button"
                      className={styles.acceptBtn}
                      onClick={() => handleAccept(user._id)}
                      disabled={acceptingId === user._id}
                    >
                      {acceptingId === user._id ? "Accepting..." : "Accept"}
                    </button>
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </section>
    </main>
  );
};
