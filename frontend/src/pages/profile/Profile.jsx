import styles from "./Profile.module.css";
import noBanner from "../../assets/noBanner.png";
import noProfile from "../../assets/noProfile.png";

import { RiImageEditLine, RiImageCircleAiFill } from "react-icons/ri";
import { MdEditLocationAlt } from "react-icons/md";
import { FaUserEdit } from "react-icons/fa";

import { EditProfileInfo } from "../../components/profile/EditProfileInfo";
import { ImageUpload } from "../../components/media/ImgUpload";

import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  uploadBanner,
  uploadProfilePic,
} from "../../store/auth/authThunks";

export const Profile = () => {
  const dispatch = useDispatch();
  const { user, loading } = useSelector((state) => state.auth);

  const [width, setWidth] = useState(window.innerWidth);
  const [isCreatorMode, setIsCreatorMode] = useState(false);

  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const profileSize = width < 768 ? 120 : 160;

  // ================= Upload Handlers =================
  const handleAvatarSelect = (file) => {
    dispatch(uploadProfilePic(file));
  };

  const handleBannerSelect = (file) => {
    dispatch(uploadBanner(file));
  };

  return (
    <main className={styles.mainContainer}>
      <section className={styles.contentContainer}>
        {/* ================= Banner ================= */}
        <div className={styles.bannerWrapper}>
          <img
            src={user?.banner || noBanner}
            alt="Banner"
            className={styles.bannerImg}
          />

          <ImageUpload
            Icon={RiImageEditLine}
            className={styles.bannerUploader}
            onFileSelect={handleBannerSelect}
          />
        </div>

        {/* ================= Profile Card ================= */}
        <div className={styles.profileCard}>
          <div className={styles.profileHeader}>
            <div className={styles.profileLeft}>
              <article className={styles["profile-pic-container"]}>
                <img
                  src={user?.avatar || noProfile}
                  alt="Profile"
                  height={profileSize}
                  className={styles.profilePic}
                />

                {isCreatorMode && <strong>creator</strong>}

                <ImageUpload
                  Icon={RiImageCircleAiFill}
                  className={styles.profileUploader}
                  onFileSelect={handleAvatarSelect}
                />
              </article>

              <div className={styles.userInfo}>
                <h2 className={styles.name}>{user?.username}</h2>
                <p className={styles.profession}>
                  Profession :{" "}
                  {user?.profession ? user.profession : "not mentioned"}
                </p>
              </div>
            </div>

            <ul className={styles.stats}>
              <li>
                <span>Following</span>
                <strong>1234</strong>
              </li>
              <li>
                <span>Followers</span>
                <strong>34235</strong>
              </li>
              <li>
                <span>Posts</span>
                <strong>3456</strong>
              </li>
              <li>
                <span>Friends</span>
                <strong>4532</strong>
              </li>
            </ul>

            <EditProfileInfo
              Icon={FaUserEdit}
              className={styles.editProfileBtn}
            />

            <div className={styles["creator-story-btns"]}>
              <button
                className={styles.creatorBtn}
                onClick={() => setIsCreatorMode((prev) => !prev)}
                disabled={loading}
              >
                creator mode
                <span className={styles.creatorIndicator}>
                  {isCreatorMode ? "✔" : "✖"}
                </span>
              </button>
              <button>add to story</button>
            </div>
          </div>

          {/* ================= Bio ================= */}
          <div className={styles.bioSection}>
            <p>
              <MdEditLocationAlt /> Mahendraganj, Meghalaya, India
            </p>
            <p>Coder</p>
            <p>Full-Stack Developer</p>
            <p>Backend Developer</p>
          </div>

          {/* ================= Posts ================= */}
          <div className={styles.postsSection}>
            <h3>Posts</h3>
            <div className={styles.postsPlaceholder}>
              Posts will appear here
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};
