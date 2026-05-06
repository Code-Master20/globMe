import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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

const createEmptyHub = () => ({
  creator: false,
  friends: [],
  following: [],
  followers: [],
  requests: {
    sent: [],
    received: [],
    rejectedByMe: [],
    rejectedMe: [],
  },
});

const requestTabs = [
  { key: "sent", label: "Requests I" },
  { key: "received", label: "Requests Me" },
  { key: "rejectedByMe", label: "Rejects I" },
  { key: "rejectedMe", label: "Rejects Me" },
];

const emptyStateCopy = {
  friends: "You do not have any friends here yet.",
  following: "Enable creator mode to grow your following list.",
  followers: "Enable creator mode to build your followers list.",
  sent: "You have not sent any friend requests yet.",
  received: "No pending friend requests right now.",
  rejectedByMe: "You have not rejected any requests yet.",
  rejectedMe: "Nobody has rejected your requests yet.",
};

export const PeopleHub = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [networkHub, setNetworkHub] = useState(createEmptyHub);
  const [loading, setLoading] = useState(true);
  const [acceptingId, setAcceptingId] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);

  const loadNetworkHub = async ({ silent = false } = {}) => {
    try {
      if (!silent) {
        setLoading(true);
      }

      const response = await api.get("/network/hub");
      setNetworkHub(response.data?.data || createEmptyHub());
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not load your network");
      setNetworkHub(createEmptyHub());
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    loadNetworkHub();
  }, []);

  const creatorEnabled = Boolean(networkHub.creator);
  const mainTabs = [
    {
      key: "friends",
      label: "Friends",
      count: networkHub.friends.length,
      visible: true,
    },
    {
      key: "following",
      label: "Followings",
      count: networkHub.following.length,
      visible: creatorEnabled,
    },
    {
      key: "followers",
      label: "Followers",
      count: networkHub.followers.length,
      visible: creatorEnabled,
    },
    {
      key: "requests",
      label: "Requests",
      count:
        networkHub.requests.sent.length +
        networkHub.requests.received.length +
        networkHub.requests.rejectedByMe.length +
        networkHub.requests.rejectedMe.length,
      visible: true,
    },
  ].filter((tab) => tab.visible);

  const availableMainTabs = mainTabs.map((tab) => tab.key);
  const requestedMainTab = searchParams.get("tab");
  const activeMainTab = availableMainTabs.includes(requestedMainTab)
    ? requestedMainTab
    : "friends";

  const requestedRequestTab = searchParams.get("requestTab");
  const availableRequestTabs = requestTabs.map((tab) => tab.key);
  const activeRequestTab = availableRequestTabs.includes(requestedRequestTab)
    ? requestedRequestTab
    : "received";

  const updateSearchTab = (tab, requestTab) => {
    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.set("tab", tab);

    if (tab === "requests") {
      nextSearchParams.set("requestTab", requestTab || "received");
    } else {
      nextSearchParams.delete("requestTab");
    }

    setSearchParams(nextSearchParams);
  };

  const handleAccept = async (requesterUserId) => {
    try {
      setAcceptingId(requesterUserId);
      const response = await api.post(
        `/network/friend-requests/${requesterUserId}/accept`,
      );

      await loadNetworkHub({ silent: true });
      toast.success(response.data?.message || "Friend request accepted");
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not accept request");
    } finally {
      setAcceptingId(null);
    }
  };

  const handleReject = async (requesterUserId) => {
    try {
      setRejectingId(requesterUserId);
      const response = await api.post(
        `/network/friend-requests/${requesterUserId}/reject`,
      );

      await loadNetworkHub({ silent: true });
      toast.success(response.data?.message || "Friend request rejected");
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not reject request");
    } finally {
      setRejectingId(null);
    }
  };

  let visibleUsers = networkHub.friends;
  let emptyCopy = emptyStateCopy.friends;
  let sectionEyebrow = "Mutuals and accepted connections";

  if (activeMainTab === "following") {
    visibleUsers = networkHub.following;
    emptyCopy = emptyStateCopy.following;
    sectionEyebrow = "People you follow through creator mode";
  }

  if (activeMainTab === "followers") {
    visibleUsers = networkHub.followers;
    emptyCopy = emptyStateCopy.followers;
    sectionEyebrow = "People following your creator profile";
  }

  if (activeMainTab === "requests") {
    visibleUsers = networkHub.requests[activeRequestTab] || [];
    emptyCopy = emptyStateCopy[activeRequestTab];
    sectionEyebrow = "Pending and rejected request history";
  }

  const renderCardActions = (person) => {
    const isReceivedRequest = activeMainTab === "requests" && activeRequestTab === "received";
    const isSentRequest = activeMainTab === "requests" && activeRequestTab === "sent";
    const isRejectedByMe =
      activeMainTab === "requests" && activeRequestTab === "rejectedByMe";
    const isRejectedMe =
      activeMainTab === "requests" && activeRequestTab === "rejectedMe";

    return (
      <div className={styles.cardActions}>
        <button
          type="button"
          className={styles.viewBtn}
          onClick={() => navigate(`/profile/${person._id}`)}
        >
          View profile
        </button>

        {isSentRequest ? (
          <span className={styles.statusBadge}>Awaiting response</span>
        ) : null}

        {isRejectedByMe ? (
          <span className={styles.statusBadgeMuted}>Rejected by you</span>
        ) : null}

        {isRejectedMe ? (
          <span className={styles.statusBadgeMuted}>Rejected your request</span>
        ) : null}

        {isReceivedRequest ? (
          <>
            <button
              type="button"
              className={styles.acceptBtn}
              onClick={() => handleAccept(person._id)}
              disabled={acceptingId === person._id || rejectingId === person._id}
            >
              {acceptingId === person._id ? "Accepting..." : "Accept"}
            </button>
            <button
              type="button"
              className={styles.rejectBtn}
              onClick={() => handleReject(person._id)}
              disabled={rejectingId === person._id || acceptingId === person._id}
            >
              {rejectingId === person._id ? "Rejecting..." : "Reject"}
            </button>
          </>
        ) : null}
      </div>
    );
  };

  return (
    <main className={styles.page}>
      <section className={styles.content}>
        <header className={styles.pageHeader}>
          <div>
            <p>People</p>
            <h1>Your network</h1>
            <span className={styles.pageCopy}>
              Switch between friends, creator follows, and request activity.
            </span>
          </div>

          <button
            type="button"
            onClick={() => loadNetworkHub()}
            className={styles.refreshBtn}
          >
            Refresh
          </button>
        </header>

        <section className={styles.tabsPanel}>
          <div className={styles.mainTabs} role="tablist" aria-label="Network sections">
            {mainTabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={`${styles.tabBtn} ${
                  activeMainTab === tab.key ? styles.tabBtnActive : ""
                }`}
                onClick={() => updateSearchTab(tab.key)}
              >
                <span>{tab.label}</span>
                <strong>{tab.count}</strong>
              </button>
            ))}
          </div>

          {!creatorEnabled ? (
            <div className={styles.creatorNotice}>
              Followings and followers appear here when creator mode is enabled.
            </div>
          ) : null}

          {activeMainTab === "requests" ? (
            <div
              className={styles.requestTabs}
              role="tablist"
              aria-label="Request sections"
            >
              {requestTabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  className={`${styles.requestTabBtn} ${
                    activeRequestTab === tab.key ? styles.requestTabBtnActive : ""
                  }`}
                  onClick={() => updateSearchTab("requests", tab.key)}
                >
                  {tab.label}
                  <span>
                    {(networkHub.requests[tab.key] || []).length}
                  </span>
                </button>
              ))}
            </div>
          ) : null}
        </section>

        <section className={styles.listHeader}>
          <div>
            <p>{sectionEyebrow}</p>
            <h2>
              {activeMainTab === "requests"
                ? requestTabs.find((tab) => tab.key === activeRequestTab)?.label
                : mainTabs.find((tab) => tab.key === activeMainTab)?.label}
            </h2>
          </div>
          <strong>{visibleUsers.length} people</strong>
        </section>

        {loading ? (
          <section className={styles.placeholder}>Loading your network...</section>
        ) : visibleUsers.length === 0 ? (
          <section className={styles.placeholder}>{emptyCopy}</section>
        ) : (
          <section className={styles.requestList}>
            {visibleUsers.map((person) => {
              const location = getLocationLabel(person.location);
              const bio =
                Array.isArray(person.bio) && person.bio.length > 0 ? person.bio[0] : "";
              const talents =
                Array.isArray(person.talent) && person.talent.length > 0
                  ? person.talent.slice(0, 3)
                  : [];

              return (
                <article className={styles.requestCard} key={person._id}>
                  <button
                    type="button"
                    className={styles.requestMain}
                    onClick={() => navigate(`/profile/${person._id}`)}
                  >
                    <img
                      src={person.avatar || noProfile}
                      alt={person.username}
                      className={styles.avatar}
                    />
                    <div className={styles.requestInfo}>
                      <div className={styles.identity}>
                        <h2>{person.username}</h2>
                        {person.profession ? (
                          <span>{formatDisplayValue(person.profession)}</span>
                        ) : null}
                        {person.creator ? (
                          <strong className={styles.creatorBadge}>creator</strong>
                        ) : null}
                      </div>

                      {person.email ? <p className={styles.email}>{person.email}</p> : null}
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
                  </button>

                  {renderCardActions(person)}
                </article>
              );
            })}
          </section>
        )}
      </section>
    </main>
  );
};
