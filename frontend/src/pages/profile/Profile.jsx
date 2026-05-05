import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router-dom";
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
import { uploadBanner, uploadProfilePic } from "../../store/auth/authThunks";
import api from "../../lib/api";

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
  const { userId } = useParams();
  const dispatch = useDispatch();
  const { user, loading } = useSelector((state) => state.auth);

  const [width, setWidth] = useState(window.innerWidth);
  const [isCreatorMode, setIsCreatorMode] = useState(false);
  const [uploadTarget, setUploadTarget] = useState(null);
  const [viewedUser, setViewedUser] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState("");

  const isOwner = !userId || (user?._id && `${userId}` === `${user._id}`);

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

  useEffect(() => {
    if (!user) {
      setViewedUser(null);
      return;
    }

    if (isOwner) {
      setViewedUser(null);
      setProfileError("");
      setProfileLoading(false);
      return;
    }

    let ignore = false;

    const loadViewedProfile = async () => {
      try {
        setProfileLoading(true);
        setProfileError("");
        const response = await api.get(`/user/profile/${userId}`);

        if (!ignore) {
          setViewedUser(response.data?.data || null);
        }
      } catch (error) {
        if (!ignore) {
          setViewedUser(null);
          setProfileError(
            error.response?.data?.message || "That profile could not be loaded.",
          );
        }
      } finally {
        if (!ignore) {
          setProfileLoading(false);
        }
      }
    };

    loadViewedProfile();

    return () => {
      ignore = true;
    };
  }, [isOwner, user, userId]);

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

  if (!isOwner && profileLoading) {
    return (
      <main className={styles.mainContainer}>
        <section className={styles.emptyState}>
          <h1>Loading profile...</h1>
          <p>We are pulling the public view for this member right now.</p>
        </section>
      </main>
    );
  }

  const profileUser = isOwner ? user : viewedUser;

  if (!profileUser) {
    return (
      <main className={styles.mainContainer}>
        <section className={styles.emptyState}>
          <h1>Profile unavailable</h1>
          <p>{profileError || "That profile could not be found right now."}</p>
        </section>
      </main>
    );
  }

  const profileSize = width < 768 ? 120 : 160;
  const creatorActive = isOwner
    ? Boolean(profileUser.creator) || isCreatorMode
    : Boolean(profileUser.creator);
  const bioItems = listify(profileUser.bio);
  const locationItems = listify(profileUser.location);
  const talentItems = listify(profileUser.talent);
  const professionLabel = formatDisplayValue(profileUser.profession);

  const profileCompletionFields = [
    profileUser.username,
    profileUser.email,
    profileUser.avatar,
    profileUser.banner,
    profileUser.profession,
    bioItems.length,
    locationItems.length,
    profileUser.status,
    profileUser.gender,
    profileUser.dob,
    talentItems.length,
  ];

  const completedFields = profileCompletionFields.filter(Boolean).length;
  const profileCompletion = Math.round(
    (completedFields / profileCompletionFields.length) * 100,
  );
  const profileCompletionRemainder = Math.max(0, 100 - profileCompletion);

  const joinedOn = profileUser.createdAt
    ? new Date(profileUser.createdAt).toLocaleDateString()
    : "Recently";

  const locationLabel =
    locationItems.length > 0
      ? locationItems.map(formatDisplayValue).join(", ")
      : "";
  const profileStory = bioItems[0] || "";
  const friendsCount = profileUser.friendsCount ?? 0;
  const followersCount = profileUser.followersCount;
  const followingCount = profileUser.followingCount;

  const connectionStats = [
    {
      label: "Friends",
      value: friendsCount,
      alwaysVisible: true,
    },
    {
      label: "Followers",
      value: followersCount,
      alwaysVisible: false,
    },
    {
      label: "Following",
      value: followingCount,
      alwaysVisible: false,
    },
  ].filter((item) => {
    if (item.alwaysVisible) {
      return true;
    }

    return creatorActive && typeof item.value === "number";
  });

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
      caption: profileUser.creator ? "Saved on account" : "Preview mode",
    },
  ];

  const detailRows = [
    {
      label: "Email",
      value: profileUser.email || "--",
      icon: <MdMailOutline />,
    },
    {
      label: "Profession",
      value: professionLabel || "--",
      icon: <MdOutlineWorkOutline />,
    },
    {
      label: "Relationship",
      value: formatDisplayValue(profileUser.status) || "--",
      icon: <MdOutlineFavoriteBorder />,
    },
    {
      label: "Gender",
      value: formatDisplayValue(profileUser.gender) || "--",
      icon: <MdOutlineWc />,
    },
    {
      label: "Birthday",
      value: profileUser.dob || "--",
      icon: <MdOutlineCake />,
    },
    {
      label: "Joined",
      value: joinedOn,
      icon: <MdOutlineCalendarMonth />,
    },
  ];

  const statusPillLabel = isOwner
    ? creatorActive
      ? "Creator mode"
      : "Personal profile"
    : creatorActive
      ? "Creator profile"
      : "Public profile";

  return (
    <main className={styles.mainContainer}>
      <section className={styles.contentContainer}>
        <div className={styles.bannerWrapper}>
          <img
            src={profileUser.banner || noBanner}
            alt={`${profileUser.username || "User"} banner`}
            className={styles.bannerImg}
          />
          <div className={styles.bannerOverlay} />
          <div className={styles.bannerContent}>
            <div className={styles.bannerText}>
              <h2>{profileUser.username}</h2>
            </div>
          </div>
          {isOwner ? (
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
          ) : null}
        </div>

        <div className={styles.profileCard}>
          <div
            className={`${styles.profileHeader} ${
              !isOwner ? styles.profileHeaderVisitor : ""
            }`}
          >
            <div className={styles.profileLeft}>
              <article className={styles.profilePicContainer}>
                <img
                  src={profileUser.avatar || noProfile}
                  alt={`${profileUser.username || "User"} profile`}
                  height={profileSize}
                  width={profileSize}
                  className={styles.profilePic}
                />

                {creatorActive ? (
                  <strong className={styles.creatorBadge}>creator</strong>
                ) : null}

                {isOwner ? (
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
                ) : null}
              </article>

              <div className={styles.userInfo}>
                <div className={styles.identityRow}>
                  <h1 className={styles.name}>{profileUser.username}</h1>
                  <span className={styles.statusPill}>{statusPillLabel}</span>
                </div>

                {professionLabel || isOwner ? (
                  <p className={styles.profession}>{professionLabel || "--"}</p>
                ) : null}

                {profileUser.email ? (
                  <p className={styles.emailLine}>{profileUser.email}</p>
                ) : null}

                {connectionStats.length > 0 ? (
                  <div className={styles.connectionStats}>
                    {connectionStats.map((item) => (
                      <div key={item.label} className={styles.connectionCard}>
                        <strong>{item.value}</strong>
                        <span>{item.label}</span>
                      </div>
                    ))}
                  </div>
                ) : null}

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

                {profileStory ? (
                  <p className={styles.profileStory}>{profileStory}</p>
                ) : isOwner ? (
                  <p className={styles.profileStory}>
                    Add a short intro so visitors understand your personality,
                    work, and interests at a glance.
                  </p>
                ) : null}

                {isOwner ? (
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
                ) : (
                  <div className={styles.viewerNote}>
                    Only information this member chose to share is visible here.
                  </div>
                )}
              </div>
            </div>

            {isOwner ? (
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
                      Add more details, talents, and profile media to make the
                      page feel richer and easier to trust.
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
            ) : null}
          </div>

          {isOwner ? (
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
                        <p>{detail.value}</p>
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
                    <strong>{profileUser.avatar ? "Uploaded" : "Missing"}</strong>
                  </div>
                  <div className={styles.statusRow}>
                    <span>Banner</span>
                    <strong>{profileUser.banner ? "Uploaded" : "Missing"}</strong>
                  </div>
                  <div className={styles.statusRow}>
                    <span>Location</span>
                    <strong>
                      {locationItems.length > 0 ? "Added" : "Missing"}
                    </strong>
                  </div>
                  <div className={styles.statusRow}>
                    <span>Creator mode</span>
                    <strong>{creatorActive ? "Active" : "Inactive"}</strong>
                  </div>
                </div>
              </article>
            </section>
          ) : null}
        </div>
      </section>
    </main>
  );
};
