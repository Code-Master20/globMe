import globMe from "../../../assets/globme.png";
import styles from "./HeaderOne.module.css";
import { FiSearch } from "react-icons/fi";
import { RiMessengerLine } from "react-icons/ri";
import { MdAddCircleOutline } from "react-icons/md";
import { HiOutlineSortDescending } from "react-icons/hi";
import { useEffect, useRef, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { isDashboard } from "../../../store/navigation/pageSlice";
import { useSelector, useDispatch } from "react-redux";
import { SearchPanel } from "../../overlays/SearchPanel";
// import { FaUsersBetweenLines } from "react-icons/fa6";

const uploadOptions = [
  {
    id: "photo-reel",
    type: "image",
    format: "reel",
    title: "Photo reel",
  },
  {
    id: "photo-raw",
    type: "image",
    format: "article",
    title: "Raw photo post",
  },
  {
    id: "video-reel",
    type: "video",
    format: "reel",
    title: "Video reel",
  },
  {
    id: "video-long",
    type: "video",
    format: "long",
    title: "Long video",
  },
];

export const HeaderOne = () => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isUploadMenuOpen, setIsUploadMenuOpen] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const uploadMenuRef = useRef(null);
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

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!uploadMenuRef.current?.contains(event.target)) {
        setIsUploadMenuOpen(false);
      }
    };

    if (isUploadMenuOpen) {
      window.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      window.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isUploadMenuOpen]);

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
              <div className={styles.uploadMenuWrap} ref={uploadMenuRef}>
                <button
                  type="button"
                  className={`${styles.iconButton} ${styles.headerIcon}`}
                  aria-label="Upload a post"
                  aria-expanded={isUploadMenuOpen}
                  title="Upload a post"
                  onClick={() => setIsUploadMenuOpen((prev) => !prev)}
                >
                  <MdAddCircleOutline />
                </button>

                {isUploadMenuOpen ? (
                  <div className={styles.uploadMenu}>
                    <p className={styles.uploadMenuLabel}>Upload</p>
                    {uploadOptions.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        className={styles.uploadMenuItem}
                        onClick={() => {
                          dispatch(isDashboard(true));
                          setIsUploadMenuOpen(false);
                          navigate(`/upload?type=${option.type}&format=${option.format}`);
                        }}
                      >
                        {option.title}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
              <FiSearch
                className={styles.headerIcon}
                onClick={() => setIsSearchOpen(true)}
              />
              <RiMessengerLine className={styles.headerIcon} />
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
