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

  return (
    <header className={styles["header-container"]}>
      <nav className={styles["header-first-child"]}>
        <NavLink
          to="/home-feed"
          className={({ isActive }) => (isActive ? styles.iconActived : "")}
        >
          <CiHome />
        </NavLink>
        <NavLink
          to="/video-feed"
          className={({ isActive }) => (isActive ? styles.iconActived : "")}
        >
          <PiVideoLight />
        </NavLink>
        <NavLink
          to="/photo-feed"
          className={({ isActive }) => (isActive ? styles.iconActived : "")}
        >
          <CiImageOn />
        </NavLink>
        <NavLink
          to="/post-feed"
          className={({ isActive }) => (isActive ? styles.iconActived : "")}
        >
          <TbPhotoVideo />
        </NavLink>
        <NavLink
          to="/people"
          className={({ isActive }) => (isActive ? styles.iconActived : "")}
        >
          <BsPeople />
          {/* <TfiBarChart /> */}
        </NavLink>
        <NavLink
          to="/notifications"
          className={({ isActive }) => (isActive ? styles.iconActived : "")}
        >
          {unreadCount > 0 ? (
            <span className={styles.notificationBadge}>
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          ) : null}
          <IoIosNotificationsOutline />
        </NavLink>
        <NavLink to="/profile">
          <img src={user?.avatar || noProfile} alt="me" />
        </NavLink>
      </nav>
    </header>
  );
};
