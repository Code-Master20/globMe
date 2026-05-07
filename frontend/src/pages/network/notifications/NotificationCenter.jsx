import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import noProfile from "../../../assets/noProfile.png";
import {
  fetchNotifications,
  markNotificationsRead,
} from "../../../store/notifications/notificationsThunks";
import styles from "./NotificationCenter.module.css";

const formatDisplayValue = (value) => {
  if (!value) return "";

  return `${value}`
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

const getNotificationTarget = (notification) =>
  notification.link || (notification.actor?._id ? `/profile/${notification.actor._id}` : "");

const getNotificationActionLabel = (notification) =>
  notification.type === "story_added" && notification.link ? "View story" : "View profile";

export const NotificationCenter = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { items, loading } = useSelector((state) => state.notifications);
  const [searchText, setSearchText] = useState("");
  const [sortOrder, setSortOrder] = useState("newest");

  useEffect(() => {
    const hydrateNotifications = async () => {
      await dispatch(fetchNotifications({ limit: 100 }));
      await dispatch(markNotificationsRead());
    };

    hydrateNotifications();
  }, [dispatch]);

  const normalizedSearchText = searchText.trim().toLowerCase();
  const visibleItems = [...items]
    .filter((notification) => {
      if (!normalizedSearchText) {
        return true;
      }

      const searchableText = [
        notification.message,
        notification.actor?.username,
        notification.actor?.profession,
        notification.actor?.email,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(normalizedSearchText);
    })
    .sort((firstItem, secondItem) => {
      const firstDate = new Date(firstItem.createdAt).getTime();
      const secondDate = new Date(secondItem.createdAt).getTime();

      return sortOrder === "oldest" ? firstDate - secondDate : secondDate - firstDate;
    });

  return (
    <main className={styles.page}>
      <section className={styles.content}>
        <header className={styles.pageHeader}>
          <p>Network</p>
          <h1>Notifications</h1>
        </header>

        <section className={styles.toolbar}>
          <label className={styles.searchField}>
            <span>Search</span>
            <input
              type="search"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="Search by name or notification text"
            />
          </label>

          <label className={styles.sortField}>
            <span>Order</span>
            <select
              value={sortOrder}
              onChange={(event) => setSortOrder(event.target.value)}
            >
              <option value="newest">New to old</option>
              <option value="oldest">Old to new</option>
            </select>
          </label>
        </section>

        {loading ? (
          <section className={styles.placeholder}>Loading notifications...</section>
        ) : items.length === 0 ? (
          <section className={styles.placeholder}>
            You do not have any notifications yet.
          </section>
        ) : visibleItems.length === 0 ? (
          <section className={styles.placeholder}>
            No notifications match that search.
          </section>
        ) : (
          <section className={styles.notificationList}>
            {visibleItems.map((notification) => (
              <article
                key={notification._id}
                className={`${styles.notificationCard} ${
                  notification.read ? styles.readCard : styles.unreadCard
                }`}
              >
                <button
                  type="button"
                  className={styles.notificationMain}
                  onClick={() => {
                    const target = getNotificationTarget(notification);

                    if (target) {
                      navigate(target);
                    }
                  }}
                  disabled={!getNotificationTarget(notification)}
                >
                  <img
                    src={notification.actor?.avatar || noProfile}
                    alt={notification.actor?.username || "user"}
                    className={styles.avatar}
                  />
                  <div className={styles.notificationBody}>
                    <div className={styles.notificationTop}>
                      <h2>{notification.message}</h2>
                      <span>{new Date(notification.createdAt).toLocaleString()}</span>
                    </div>
                    {notification.actor?.profession ? (
                      <p className={styles.actorMeta}>
                        {formatDisplayValue(notification.actor.profession)}
                      </p>
                    ) : null}
                    {notification.actor?.email ? (
                      <p className={styles.actorMeta}>{notification.actor.email}</p>
                    ) : null}
                  </div>
                </button>
                <div className={styles.notificationActions}>
                  <button
                    type="button"
                    className={styles.viewBtn}
                    onClick={() => {
                      const target = getNotificationTarget(notification);

                      if (target) {
                        navigate(target);
                      }
                    }}
                    disabled={!getNotificationTarget(notification)}
                  >
                    {getNotificationActionLabel(notification)}
                  </button>
                </div>
              </article>
            ))}
          </section>
        )}
      </section>
    </main>
  );
};
