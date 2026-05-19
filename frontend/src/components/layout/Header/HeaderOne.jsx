import globMe from "../../../assets/globme.png";
import { createPortal } from "react-dom";
import styles from "./HeaderOne.module.css";
import { FiSearch } from "react-icons/fi";
import { RiMessengerLine } from "react-icons/ri";
import { MdAddCircleOutline } from "react-icons/md";
import { HiOutlineSortDescending } from "react-icons/hi";
import { useEffect, useRef, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { isDashboard } from "../../../store/navigation/pageSlice";
import { useDispatch } from "react-redux";
import { SearchPanel } from "../../overlays/SearchPanel";
// import { FaUsersBetweenLines } from "react-icons/fa6";

const uploadOptions = [
  {
    id: "photo-reel",
    type: "image",
    format: "reel",
    title: "Photo Shorts",
  },
  {
    id: "photo-raw",
    type: "image",
    format: "article",
    title: "Upload Photo",
  },
  {
    id: "video-reel",
    type: "video",
    format: "reel",
    title: "Video Shorts",
  },
  {
    id: "video-long",
    type: "video",
    format: "long",
    title: "Video Longs",
  },
];

export const HeaderOne = () => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isUploadMenuOpen, setIsUploadMenuOpen] = useState(false);
  const [uploadMenuPosition, setUploadMenuPosition] = useState(null);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const uploadButtonRef = useRef(null);
  const uploadMenuRef = useRef(null);

  const updateUploadMenuPosition = () => {
    if (!uploadButtonRef.current || typeof window === "undefined") {
      return;
    }

    const rect = uploadButtonRef.current.getBoundingClientRect();
    const viewportPadding = 12;
    const menuWidth = Math.min(220, window.innerWidth - viewportPadding * 2);
    const left = Math.max(
      viewportPadding,
      Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - viewportPadding),
    );

    setUploadMenuPosition({
      top: rect.bottom + 14,
      left,
      width: menuWidth,
    });
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        uploadButtonRef.current?.contains(event.target) ||
        uploadMenuRef.current?.contains(event.target)
      ) {
        return;
      }

      setIsUploadMenuOpen(false);
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setIsUploadMenuOpen(false);
        setIsSearchOpen(false);
      }
    };

    if (isUploadMenuOpen || isSearchOpen) {
      window.addEventListener("keydown", handleEscape);
    }

    if (isUploadMenuOpen) {
      updateUploadMenuPosition();
      window.addEventListener("mousedown", handleClickOutside);
      window.addEventListener("resize", updateUploadMenuPosition);
      window.addEventListener("scroll", updateUploadMenuPosition, true);
    }

    return () => {
      window.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleEscape);
      window.removeEventListener("resize", updateUploadMenuPosition);
      window.removeEventListener("scroll", updateUploadMenuPosition, true);
    };
  }, [isSearchOpen, isUploadMenuOpen]);

  const uploadMenuContent =
    isUploadMenuOpen && uploadMenuPosition
      ? createPortal(
          <div
            ref={uploadMenuRef}
            className={styles.uploadMenu}
            style={{
              top: `${uploadMenuPosition.top}px`,
              left: `${uploadMenuPosition.left}px`,
              width: `${uploadMenuPosition.width}px`,
            }}
          >
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
          </div>,
          document.body,
        )
      : null;

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
              <p className={styles.brandWordmark}>globMe</p>
            </article>
            <article className={styles["create-search-sms"]}>
              <div className={styles.uploadMenuWrap}>
                <button
                  type="button"
                  ref={uploadButtonRef}
                  className={`${styles.iconButton} ${styles.headerIcon}`}
                  aria-label="Upload a post"
                  aria-expanded={isUploadMenuOpen}
                  title="Upload a post"
                  onClick={() => {
                    setIsSearchOpen(false);
                    setIsUploadMenuOpen((prev) => !prev);
                  }}
                >
                  <MdAddCircleOutline />
                </button>
              </div>
              <FiSearch
                className={styles.headerIcon}
                onClick={() => {
                  setIsUploadMenuOpen(false);
                  setIsSearchOpen(true);
                }}
              />
              <RiMessengerLine className={styles.headerIcon} />
            </article>
          </section>
        </nav>
      </header>

      {uploadMenuContent}

      {isSearchOpen == true && (
        <SearchPanel onClose={() => setIsSearchOpen(false)} />
      )}
    </>
  );
};
