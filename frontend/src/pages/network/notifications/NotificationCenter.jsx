import { useEffect } from "react";
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

export const NotificationCenter = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { items, loading } = useSelector((state) => state.notifications);

  useEffect(() => {
    const hydrateNotifications = async () => {
      await dispatch(fetchNotifications());
      await dispatch(markNotificationsRead());
    };

    hydrateNotifications();
  }, [dispatch]);

  return (
    <main className={styles.page}>
      <section className={styles.content}>
        <header className={styles.pageHeader}>
          <p>Network</p>
          <h1>Notifications</h1>
        </header>

        {loading ? (
          <section className={styles.placeholder}>Loading notifications...</section>
        ) : items.length === 0 ? (
          <section className={styles.placeholder}>
            You do not have any notifications yet.
          </section>
        ) : (
          <section className={styles.notificationList}>
            {items.map((notification) => (
              <article
                key={notification._id}
                className={`${styles.notificationCard} ${
                  notification.read ? styles.readCard : styles.unreadCard
                }`}
              >
                <button
                  type="button"
                  className={styles.notificationMain}
                  onClick={() =>
                    notification.actor?._id
                      ? navigate(`/profile/${notification.actor._id}`)
                      : null
                  }
                  disabled={!notification.actor?._id}
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
                    onClick={() => navigate(`/profile/${notification.actor._id}`)}
                    disabled={!notification.actor?._id}
                  >
                    View profile
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
