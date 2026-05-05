import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { FaUserEdit } from "react-icons/fa";
import { RiImageCircleAiFill, RiImageEditLine } from "react-icons/ri";
import {
  MdEditLocationAlt,
  MdMailOutline,
  MdOutlineAutoAwesome,
  MdOutlineCake,
  MdOutlineCalendarMonth,
  MdOutlineFavoriteBorder,
  MdOutlineWorkOutline,
  MdOutlineWc,
} from "react-icons/md";
import styles from "./Profile.module.css";
import noBanner from "../../assets/noBanner.png";
import noProfile from "../../assets/noProfile.png";
import { EditProfileInfo } from "../../components/profile/EditProfileInfo";
import { ImageUpload } from "../../components/media/ImgUpload";
import {
  uploadBanner,
  uploadProfilePic,
} from "../../store/auth/authThunks";

const listify = (value) => {
  if (Array.isArray(value)) {
    return value
      .map((item) => `${item ?? ""}`.trim())
      .filter(Boolean);
  }

  if (typeof value === "string" && value.trim()) {
    return [value.trim()];
  }

  return [];
};

const formatDisplayValue = (value) => {
  if (!value) return "";

  return `${value}`
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

export const Profile = () => {
  const dispatch = useDispatch();
  const { user, loading } = useSelector((state) => state.auth);

  const [width, setWidth] = useState(window.innerWidth);
  const [isCreatorMode, setIsCreatorMode] = useState(false);
  const [uploadTarget, setUploadTarget] = useState(null);

  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!loading) {
      setUploadTarget(null);
    }
  }, [loading]);

  const profileSize = width < 768 ? 120 : 160;

  const handleAvatarSelect = (file) => {
    setUploadTarget("avatar");
    dispatch(uploadProfilePic(file));
  };

  const handleBannerSelect = (file) => {
    setUploadTarget("banner");
    dispatch(uploadBanner(file));
  };

  if (!user) {
    return (
      <main className={styles.mainContainer}>
        <section className={styles.emptyState}>
          <h1>Your profile is not ready yet.</h1>
          <p>Refresh your session or sign in again to load your account data.</p>
        </section>
      </main>
    );
  }

  const creatorActive = user.creator || isCreatorMode;
  const bioItems = listify(user.bio);
  const locationItems = listify(user.location);
  const talentItems = listify(user.talent);

  const profileCompletionFields = [
    user.username,
    user.email,
    user.avatar,
    user.banner,
    user.profession,
    bioItems.length,
    locationItems.length,
    user.status,
    user.gender,
    user.dob,
    talentItems.length,
  ];

  const completedFields = profileCompletionFields.filter(Boolean).length;
  const profileCompletion = Math.round(
    (completedFields / profileCompletionFields.length) * 100,
  );
  const profileCompletionRemainder = Math.max(0, 100 - profileCompletion);

  const joinedOn = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString()
    : "Recently";

  const locationLabel =
    locationItems.length > 0
      ? locationItems.map(formatDisplayValue).join(", ")
      : "";
  const profileStory =
    bioItems[0] ||
    "Add a short intro so visitors understand your personality, work, and interests at a glance.";

  const summaryStats = [
    {
      label: "Completion",
      value: `${profileCompletion}%`,
      caption: "Profile filled",
    },
    {
      label: "Bio",
      value: bioItems.length || "--",
      caption: "About lines",
    },
    {
      label: "Talents/Skills",
      value: talentItems.length || "--",
      caption: "Listed skills",
    },
    {
      label: "Creator",
      value: creatorActive ? "On" : "Off",
      caption: user.creator ? "Saved on account" : "Preview mode",
    },
  ];

  const detailRows = [
    {
      label: "Email",
      value: user.email || "—",
      icon: <MdMailOutline />,
    },
    {
      label: "Profession",
      value: formatDisplayValue(user.profession),
      icon: <MdOutlineWorkOutline />,
    },
    {
      label: "Relationship",
      value: formatDisplayValue(user.status),
      icon: <MdOutlineFavoriteBorder />,
    },
    {
      label: "Gender",
      value: formatDisplayValue(user.gender),
      icon: <MdOutlineWc />,
    },
    {
      label: "Birthday",
      value: user.dob || "—",
      icon: <MdOutlineCake />,
    },
    {
      label: "Joined",
      value: joinedOn,
      icon: <MdOutlineCalendarMonth />,
    },
  ];

  return (
    <main className={styles.mainContainer}>
      <section className={styles.contentContainer}>
        <div className={styles.bannerWrapper}>
          <img
            src={user.banner || noBanner}
            alt={`${user.username || "User"} banner`}
            className={styles.bannerImg}
          />
          <div className={styles.bannerOverlay} />
          <div className={styles.bannerContent}>
            <div className={styles.bannerText}>
              <h2>{user.username}</h2>
            </div>
          </div>
          <ImageUpload
            Icon={RiImageEditLine}
            className={styles.bannerUploader}
            buttonClassName={styles.bannerUploadButton}
            onFileSelect={handleBannerSelect}
            disabled={loading}
            title={
              loading && uploadTarget === "banner"
                ? "Uploading banner"
                : "Upload profile banner"
            }
          />
        </div>

        <div className={styles.profileCard}>
          <div className={styles.profileHeader}>
            <div className={styles.profileLeft}>
              <article className={styles.profilePicContainer}>
                <img
                  src={user.avatar || noProfile}
                  alt={`${user.username || "User"} profile`}
                  height={profileSize}
                  width={profileSize}
                  className={styles.profilePic}
                />

                {creatorActive && (
                  <strong className={styles.creatorBadge}>creator</strong>
                )}

                <ImageUpload
                  Icon={RiImageCircleAiFill}
                  className={styles.profileUploader}
                  buttonClassName={styles.avatarUploadButton}
                  onFileSelect={handleAvatarSelect}
                  disabled={loading}
                  title={
                    loading && uploadTarget === "avatar"
                      ? "Uploading profile photo"
                      : "Upload profile photo"
                  }
                />
              </article>

              <div className={styles.userInfo}>
                <div className={styles.identityRow}>
                  <h1 className={styles.name}>{user.username}</h1>
                  <span className={styles.statusPill}>
                    {creatorActive ? "Creator mode" : "Personal profile"}
                  </span>
                </div>

                <p className={styles.profession}>
                  {formatDisplayValue(user.profession) || "—"}
                </p>
                <p className={styles.emailLine}>{user.email}</p>

                {talentItems.length > 0 ? (
                  <div className={styles.topSkills}>
                    {talentItems.map((talent) => (
                      <span key={talent} className={styles.topSkillTag}>
                        {formatDisplayValue(talent)}
                      </span>
                    ))}
                  </div>
                ) : null}

                {locationLabel ? (
                  <div className={styles.locationLine}>
                    <MdEditLocationAlt />
                    <span>{locationLabel}</span>
                  </div>
                ) : null}

                <p className={styles.profileStory}>{profileStory}</p>

                <div className={styles.actionsRow}>
                  <EditProfileInfo
                    Icon={FaUserEdit}
                    className={styles.editProfileBtn}
                  />

                  <button
                    className={styles.creatorBtn}
                    onClick={() => setIsCreatorMode((prev) => !prev)}
                    disabled={loading}
                  >
                    {creatorActive
                      ? "creator mode on"
                      : "enable creator preview"}
                    <span className={styles.creatorIndicator}>
                      {creatorActive ? "on" : "off"}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            <aside className={styles.summaryColumn}>
              {profileCompletion < 100 ? (
                <div className={styles.completionCard}>
                  <div className={styles.panelHeader}>
                    <h2>Profile strength</h2>
                    <span>{profileCompletion}% complete</span>
                  </div>

                  <div className={styles.progressTrack} aria-hidden="true">
                    <span
                      className={styles.progressFill}
                      style={{
                        width: `${profileCompletion}%`,
                        flexBasis: `${profileCompletion}%`,
                      }}
                    />
                    <span
                      className={styles.progressRest}
                      style={{
                        width: `${profileCompletionRemainder}%`,
                        flexBasis: `${profileCompletionRemainder}%`,
                      }}
                    />
                  </div>

                  <p className={styles.completionCopy}>
                    Add more details, talents, and profile media to make the page
                    feel richer and easier to trust.
                  </p>
                </div>
              ) : null}

              <ul className={styles.stats}>
                {summaryStats.map((stat) => (
                  <li key={stat.label}>
                    <span>{stat.label}</span>
                    <strong>{stat.value}</strong>
                    <small>{stat.caption}</small>
                  </li>
                ))}
              </ul>
            </aside>
          </div>

          <section className={styles.gridLayout}>
            <article className={styles.panel}>
              <div className={styles.panelHeader}>
                <h2>About</h2>
                <span>{bioItems.length || 0} lines</span>
              </div>

              {bioItems.length > 0 ? (
                <div className={styles.bioSection}>
                  {bioItems.map((line, index) => (
                    <p key={`${line}-${index}`}>{line}</p>
                  ))}
                </div>
              ) : (
                <div className={styles.placeholderBox}>
                  Add a bio so people can understand what you are about.
                </div>
              )}
            </article>

            <article className={styles.panel}>
              <div className={styles.panelHeader}>
                <h2>Details</h2>
                <span>Account info</span>
              </div>

              <div className={styles.detailsGrid}>
                {detailRows.map((detail) => (
                  <div className={styles.detailCard} key={detail.label}>
                    <span className={styles.detailIcon}>{detail.icon}</span>
                    <div>
                      <small>{detail.label}</small>
                      <p>{detail.value || "—"}</p>
                    </div>
                  </div>
                ))}
              </div>
            </article>

            <article className={styles.panel}>
              <div className={styles.panelHeader}>
                <h2>Talents/Skills</h2>
                <span>{talentItems.length || 0} listed</span>
              </div>

              {talentItems.length > 0 ? (
                <div className={styles.tagGroup}>
                  {talentItems.map((talent) => (
                    <span key={talent} className={styles.tag}>
                      <MdOutlineAutoAwesome />
                      {formatDisplayValue(talent)}
                    </span>
                  ))}
                </div>
              ) : (
                <div className={styles.placeholderBox}>
                  Highlight your strengths here so your profile feels alive.
                </div>
              )}
            </article>

            <article className={styles.panel}>
              <div className={styles.panelHeader}>
                <h2>Profile status</h2>
                <span>Quick overview</span>
              </div>

              <div className={styles.statusStack}>
                <div className={styles.statusRow}>
                  <span>Avatar</span>
                  <strong>{user.avatar ? "Uploaded" : "Missing"}</strong>
                </div>
                <div className={styles.statusRow}>
                  <span>Banner</span>
                  <strong>{user.banner ? "Uploaded" : "Missing"}</strong>
                </div>
                <div className={styles.statusRow}>
                  <span>Location</span>
                  <strong>{locationItems.length > 0 ? "Added" : "Missing"}</strong>
                </div>
                <div className={styles.statusRow}>
                  <span>Creator mode</span>
                  <strong>{creatorActive ? "Active" : "Inactive"}</strong>
                </div>
              </div>
            </article>
          </section>
        </div>
      </section>
    </main>
  );
};
