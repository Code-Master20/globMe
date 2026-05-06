import styles from "./HeaderTwo.module.css";
import { CiHome, CiImageOn } from "react-icons/ci";
import { PiVideoLight } from "react-icons/pi";
import { BsPeople } from "react-icons/bs";
import { IoIosNotificationsOutline } from "react-icons/io";
import { TbPhotoVideo } from "react-icons/tb";
import { NavLink } from "react-router-dom";
import noProfile from "../../../assets/noProfile.png";
import { useSelector } from "react-redux";

export const HeaderTwo = () => {
  const { user } = useSelector((state) => state.auth);
  const { unreadCount } = useSelector((state) => state.notifications);
  const getNavClassName = ({ isActive }) =>
    isActive ? styles.iconActived : "";

  return (
    <header className={styles["header-container"]}>
      <nav className={styles["header-first-child"]}>
        <NavLink to="/home-feed" className={getNavClassName}>
          <CiHome className={`${styles.headerIcon} ${styles.homeIcon}`} />
        </NavLink>
        <NavLink to="/video-feed" className={getNavClassName}>
          <PiVideoLight className={`${styles.headerIcon} ${styles.videoIcon}`} />
        </NavLink>
        <NavLink to="/photo-feed" className={getNavClassName}>
          <CiImageOn className={`${styles.headerIcon} ${styles.imageIcon}`} />
        </NavLink>
        <NavLink to="/post-feed" className={getNavClassName}>
          <TbPhotoVideo className={`${styles.headerIcon} ${styles.postIcon}`} />
        </NavLink>
        <NavLink to="/people" className={getNavClassName}>
          <BsPeople className={`${styles.headerIcon} ${styles.peopleIcon}`} />
        </NavLink>
        <NavLink to="/notifications" className={getNavClassName}>
          {unreadCount > 0 ? (
            <span className={styles.notificationBadge}>
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          ) : null}
          <IoIosNotificationsOutline
            className={`${styles.headerIcon} ${styles.notificationIcon}`}
          />
        </NavLink>
        <NavLink
          to="/profile"
          className={({ isActive }) =>
            `${styles.profileLink} ${
              isActive ? styles.profileLinkActive : ""
            }`.trim()
          }
          aria-label="Open my profile"
        >
          <img
            src={user?.avatar || noProfile}
            alt="My profile"
            className={styles.profileAvatar}
          />
        </NavLink>
      </nav>
    </header>
  );
};
