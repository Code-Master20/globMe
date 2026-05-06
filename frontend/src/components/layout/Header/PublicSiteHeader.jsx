import { NavLink } from "react-router-dom";
import globMe from "../../../assets/globme.png";
import styles from "./PublicSiteHeader.module.css";

const navItems = [
  { label: "Home", to: "/home-feed" },
  { label: "Photos", to: "/photo-feed" },
  { label: "Videos", to: "/video-feed" },
  { label: "Posts", to: "/post-feed" },
];

export const PublicSiteHeader = () => {
  return (
    <header className={styles.header}>
      <div className={styles.shell}>
        <NavLink to="/home-feed" className={styles.brand}>
          <img src={globMe} alt="globMe" />
          <div>
            <strong>globMe</strong>
            <span>Public preview</span>
          </div>
        </NavLink>

        <nav className={styles.nav}>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `${styles.navLink} ${isActive ? styles.navLinkActive : ""}`.trim()
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className={styles.actions}>
          <NavLink to="/login" className={styles.loginBtn}>
            Log in
          </NavLink>
          <NavLink to="/signup" className={styles.signupBtn}>
            Create account
          </NavLink>
        </div>
      </div>
    </header>
  );
};
