import globMe from "../../assets/globme.png";
import styles from "./HeaderOne.module.css";
import { FiSearch } from "react-icons/fi";
import { RiMessengerLine } from "react-icons/ri";
import { MdAddCircleOutline } from "react-icons/md";
import { HiOutlineSortDescending } from "react-icons/hi";
import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { isDashboard } from "../../features/pageTracker/pageSlice";
import { useSelector, useDispatch } from "react-redux";
import { SearchPanel } from "../Search/SearchPanel";
// import { FaUsersBetweenLines } from "react-icons/fa6";
export const HeaderOne = () => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const dispatch = useDispatch();
  //to track current width of the screen
  const [width, setWidth] = useState(window.outerWidth);

  useEffect(() => {
    const screenWidthTracker = () => {
      setWidth(window.outerWidth);
    };
    window.addEventListener("resize", screenWidthTracker);
    return () => {
      window.removeEventListener("resize", screenWidthTracker);
    };
  }, []);

  return (
    <>
      <header className={styles["header-container"]}>
        <nav className={styles["header-first-child"]}>
          <section className={styles["header-content-container"]}>
            <article className={styles["dashboard-logo"]}>
              <NavLink
                to="/dashboard"
                onClick={(e) => {
                  dispatch(isDashboard(true));
                }}
              >
                <HiOutlineSortDescending />
              </NavLink>
              <img src={globMe} alt="" />
              <p
                style={{
                  color: "green",
                  fontSize: "2rem",
                  fontWeight: "bolder",
                  fontFamily: "sans-serif",
                  marginLeft: "-2rem",
                  textShadow: "1px 5px 8px rgba(17, 15, 15, 0.4)",
                }}
              >
                globMe
              </p>
            </article>
            <article className={styles["create-search-sms"]}>
              <MdAddCircleOutline />
              <FiSearch onClick={() => setIsSearchOpen(true)} />
              <RiMessengerLine />
            </article>
          </section>
        </nav>
      </header>

      {isSearchOpen == true && (
        <SearchPanel
          onClose={() => setIsSearchOpen(false)}
          className={styles["search-panel"]}
        />
      )}
    </>
  );
};
