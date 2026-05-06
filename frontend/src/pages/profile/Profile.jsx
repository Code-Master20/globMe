import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import { FaUserEdit } from "react-icons/fa";
import { RiImageCircleAiFill, RiImageEditLine } from "react-icons/ri";
import {
  MdClose,
  MdEditLocationAlt,
  MdMailOutline,
  MdOutlineAutoAwesome,
  MdOutlineCake,
  MdOutlineCalendarMonth,
  MdOutlineFavoriteBorder,
  MdOutlineWorkOutline,
  MdOutlineWc,
} from "react-icons/md";
import { toast } from "react-toastify";
import styles from "./Profile.module.css";
import noBanner from "../../assets/noBanner.png";
import noProfile from "../../assets/noProfile.png";
import { EditProfileInfo } from "../../components/profile/EditProfileInfo";
import { ImageUpload } from "../../components/media/ImgUpload";
import {
  updateCreatorMode,
  uploadBanner,
  uploadProfilePic,
} from "../../store/auth/authThunks";
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
  const [uploadTarget, setUploadTarget] = useState(null);
  const [viewedUser, setViewedUser] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [showInfo, setShowInfo] = useState(false);
  const [relationshipLoading, setRelationshipLoading] = useState(false);

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
    if (width > 640 && showInfo) {
      setShowInfo(false);
    }
  }, [showInfo, width]);

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

  const handleSendFriendRequest = async () => {
    if (!profileUser?._id || isOwner) {
      return;
    }

    try {
      setRelationshipLoading(true);
      const response = await api.post(`/network/friend-requests/${profileUser._id}`);

      setViewedUser((prev) =>
        prev
          ? {
              ...prev,
              relationshipStatus:
                response.data?.data?.relationshipStatus || "pending_sent",
            }
          : prev,
      );

      toast.success(response.data?.message || "Friend request sent");
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not send request");
    } finally {
      setRelationshipLoading(false);
    }
  };

  const handleAcceptFriendRequest = async () => {
    if (!profileUser?._id || isOwner) {
      return;
    }

    try {
      setRelationshipLoading(true);
      const response = await api.post(
        `/network/friend-requests/${profileUser._id}/accept`,
      );

      setViewedUser((prev) =>
        prev
          ? {
              ...prev,
              relationshipStatus:
                response.data?.data?.relationshipStatus || "friends",
            }
          : prev,
      );

      toast.success(response.data?.message || "Friend request accepted");
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not accept request");
    } finally {
      setRelationshipLoading(false);
    }
  };

  const handleRejectFriendRequest = async () => {
    if (!profileUser?._id || isOwner) {
      return;
    }

    try {
      setRelationshipLoading(true);
      const response = await api.post(
        `/network/friend-requests/${profileUser._id}/reject`,
      );

      setViewedUser((prev) =>
        prev
          ? {
              ...prev,
              relationshipStatus:
                response.data?.data?.relationshipStatus || "none",
            }
          : prev,
      );

      toast.success(response.data?.message || "Friend request rejected");
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not reject request");
    } finally {
      setRelationshipLoading(false);
    }
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
  const isSmallScreen = width <= 640;
  const ownerCreatorEnabled = Boolean(profileUser.creator);
  const creatorActive = isOwner ? ownerCreatorEnabled : false;
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
  const friendsCount =
    typeof profileUser.friendsCount === "number" ? profileUser.friendsCount : 0;
  const followersCount =
    typeof profileUser.followersCount === "number"
      ? profileUser.followersCount
      : 0;
  const followingCount =
    typeof profileUser.followingCount === "number"
      ? profileUser.followingCount
      : 0;

  const canVisitorSeeFriends = typeof profileUser.friendsCount === "number";
  const canVisitorSeeFollowers = typeof profileUser.followersCount === "number";
  const canVisitorSeeFollowing = typeof profileUser.followingCount === "number";
  const relationshipStatus = profileUser.relationshipStatus || "none";

  const connectionStats = [
    {
      label: "Friends",
      value: friendsCount,
      visible: isOwner || canVisitorSeeFriends,
    },
    {
      label: "Following",
      value: followingCount,
      visible: isOwner ? creatorActive : canVisitorSeeFollowing,
    },
    {
      label: "Followers",
      value: followersCount,
      visible: isOwner ? creatorActive : canVisitorSeeFollowers,
    },
  ].filter((item) => item.visible);

  const summaryStats = [
    {
      label: "Completion",
      value: `${profileCompletion}%`,
      caption: "Profile filled",
      editField: "",
    },
    {
      label: "Bio",
      value: bioItems.length || "--",
      caption: "About lines",
      editField: "bio",
    },
    {
      label: "Talents/Skills",
      value: talentItems.length || "--",
      caption: "Listed skills",
      editField: "talent",
    },
    {
      label: "Creator",
      value: creatorActive ? "On" : "Off",
      caption: ownerCreatorEnabled ? "Saved on account" : "Disabled",
      editField: "",
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

  const statusPillLabel = creatorActive ? "Creator mode" : "Personal profile";

  const renderOwnerEditButton = (focusField, label) => {
    if (!focusField) {
      return null;
    }

    return (
      <EditProfileInfo
        Icon={FaUserEdit}
        className={styles.cardEditButton}
        initialFocusField={focusField}
        compact
        iconSize={14}
        buttonLabel={label}
      />
    );
  };

  const handleCreatorModeToggle = async () => {
    const nextCreatorValue = !ownerCreatorEnabled;
    const resultAction = await dispatch(updateCreatorMode(nextCreatorValue));

    if (updateCreatorMode.fulfilled.match(resultAction)) {
      toast.success(
        resultAction.payload?.message ||
          (nextCreatorValue
            ? "Creator mode enabled"
            : "Creator mode disabled"),
      );
      return;
    }

    toast.error(
      resultAction.payload?.message || "Creator mode could not be updated",
    );
  };

  const renderVisitorRelationshipAction = () => {
    if (isOwner) {
      return null;
    }

    if (relationshipStatus === "friends") {
      return (
        <div className={styles.visitorRelationshipRow}>
          <span className={`${styles.relationshipChip} ${styles.relationshipFriends}`}>
            Friends
          </span>
        </div>
      );
    }

    if (relationshipStatus === "pending_sent") {
      return (
        <div className={styles.visitorRelationshipRow}>
          <span className={styles.relationshipChip}>Request sent</span>
        </div>
      );
    }

    if (relationshipStatus === "pending_received") {
      return (
        <div className={styles.visitorRelationshipRow}>
          <span className={styles.relationshipChip}>Sent you a request</span>
          <button
            type="button"
            className={styles.friendActionGhostBtn}
            onClick={handleRejectFriendRequest}
            disabled={relationshipLoading}
          >
            {relationshipLoading ? "Rejecting..." : "Reject"}
          </button>
          <button
            type="button"
            className={styles.friendActionBtn}
            onClick={handleAcceptFriendRequest}
            disabled={relationshipLoading}
          >
            {relationshipLoading ? "Accepting..." : "Accept request"}
          </button>
        </div>
      );
    }

    return (
      <div className={styles.visitorRelationshipRow}>
        <button
          type="button"
          className={styles.friendActionBtn}
          onClick={handleSendFriendRequest}
          disabled={relationshipLoading}
        >
          {relationshipLoading ? "Sending..." : "Add friend"}
        </button>
      </div>
    );
  };

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
                    size={18}
                    disabled={loading}
                    title={
                      loading && uploadTarget === "avatar"
                        ? "Uploading profile photo"
                        : "Upload profile photo"
                    }
                  />
                ) : null}
              </article>

              {connectionStats.length > 0 ? (
                <div className={styles.mobileConnectionStatsWrap}>
                  <div
                    className={`${styles.connectionStats} ${styles.connectionStatsMobile}`}
                  >
                    {connectionStats.map((item) => (
                      <div key={item.label} className={styles.connectionCard}>
                        <strong>{item.value}</strong>
                        <span>{item.label}</span>
                      </div>
                    ))}
                  </div>

                  {isOwner && isSmallScreen ? (
                    <div className={styles.mobileOwnerTools}>
                      <EditProfileInfo
                        Icon={FaUserEdit}
                        className={styles.editProfileBtn}
                      />

                      <button
                        type="button"
                        className={styles.infoToggleBtn}
                        onClick={() => setShowInfo((prev) => !prev)}
                        aria-expanded={showInfo}
                      >
                        info
                        <span className={styles.infoToggleIndicator}>
                          {showInfo ? "-" : "+"}
                        </span>
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div className={styles.userInfo}>
                <div className={styles.identityRow}>
                  <h1 className={styles.name}>{profileUser.username}</h1>
                  {isOwner ? (
                    <span className={styles.statusPill}>{statusPillLabel}</span>
                  ) : null}
                </div>

                <div className={styles.headerMetaRow}>
                  <div className={styles.headerMetaText}>
                    {professionLabel || isOwner ? (
                      <p className={styles.profession}>{professionLabel || "--"}</p>
                    ) : null}

                    {profileUser.email ? (
                      <p className={styles.emailLine}>{profileUser.email}</p>
                    ) : null}
                  </div>

                  {connectionStats.length > 0 ? (
                    <div
                      className={`${styles.connectionStats} ${styles.connectionStatsDesktop}`}
                    >
                      {connectionStats.map((item) => (
                        <div key={item.label} className={styles.connectionCard}>
                          <strong>{item.value}</strong>
                          <span>{item.label}</span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>

                {talentItems.length > 0 ? (
                  <div className={styles.topSkills}>
                    {talentItems.map((talent) => (
                      <span key={talent} className={styles.topSkillTag}>
                        {formatDisplayValue(talent)}
                      </span>
                    ))}
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

                {locationLabel ? (
                  <div className={styles.locationLine}>
                    <MdEditLocationAlt />
                    <span>{locationLabel}</span>
                  </div>
                ) : null}

                {isOwner ? (
                  <div className={styles.actionsRow}>
                    {!isSmallScreen ? (
                      <div className={styles.ownerTools}>
                        <EditProfileInfo
                          Icon={FaUserEdit}
                          className={styles.editProfileBtn}
                        />
                      </div>
                    ) : null}

                    <button
                      className={styles.creatorBtn}
                      onClick={handleCreatorModeToggle}
                      disabled={loading}
                    >
                      {creatorActive
                        ? "creator mode on"
                        : "enable creator mode"}
                      <span className={styles.creatorIndicator}>
                        {creatorActive ? "on" : "off"}
                      </span>
                    </button>
                  </div>
                ) : (
                  <>
                    {renderVisitorRelationshipAction()}
                    <div className={styles.viewerNote}>
                      Only information this member chose to share is visible here.
                    </div>
                  </>
                )}
              </div>
            </div>

            {isOwner && !isSmallScreen ? (
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
                    <li
                      key={stat.label}
                      className={stat.editField ? styles.editableInfoCard : ""}
                    >
                      {renderOwnerEditButton(
                        stat.editField,
                        `Edit ${stat.label}`,
                      )}
                      <span>{stat.label}</span>
                      <strong>{stat.value}</strong>
                      <small>{stat.caption}</small>
                    </li>
                  ))}
                </ul>
              </aside>
            ) : null}
          </div>

          {isOwner && !isSmallScreen ? (
            <section className={styles.gridLayout}>
              <article className={styles.panel}>
                <div className={styles.panelHeader}>
                  <h2>About</h2>
                  <div className={styles.panelHeaderMeta}>
                    <span>{bioItems.length || 0} lines</span>
                    {renderOwnerEditButton("bio", "Edit About")}
                  </div>
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
                  <div className={styles.panelHeaderMeta}>
                    <span>Account info</span>
                    {renderOwnerEditButton("profession", "Edit Details")}
                  </div>
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
                  <div className={styles.panelHeaderMeta}>
                    <span>{talentItems.length || 0} listed</span>
                    {renderOwnerEditButton("talent", "Edit Talents and Skills")}
                  </div>
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

        {isOwner && isSmallScreen ? (
          <div
            className={`${styles.infoModal} ${showInfo ? styles.infoModalOpen : ""}`}
            onClick={() => setShowInfo(false)}
          >
            <div
              className={styles.infoSheet}
              onClick={(event) => event.stopPropagation()}
            >
              <div className={styles.infoSheetHeader}>
                <div>
                  <p>Profile info</p>
                  <h2>Quick details</h2>
                </div>
                <button
                  type="button"
                  className={styles.infoSheetClose}
                  onClick={() => setShowInfo(false)}
                  aria-label="Close profile info"
                >
                  <MdClose size={20} />
                </button>
              </div>

              <div className={styles.infoSheetBody}>
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
                    <li
                      key={stat.label}
                      className={stat.editField ? styles.editableInfoCard : ""}
                    >
                      {renderOwnerEditButton(
                        stat.editField,
                        `Edit ${stat.label}`,
                      )}
                      <span>{stat.label}</span>
                      <strong>{stat.value}</strong>
                      <small>{stat.caption}</small>
                    </li>
                  ))}
                </ul>

                <section className={styles.gridLayout}>
                  <article className={styles.panel}>
                    <div className={styles.panelHeader}>
                      <h2>About</h2>
                      <div className={styles.panelHeaderMeta}>
                        <span>{bioItems.length || 0} lines</span>
                        {renderOwnerEditButton("bio", "Edit About")}
                      </div>
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
                      <div className={styles.panelHeaderMeta}>
                        <span>Account info</span>
                        {renderOwnerEditButton("profession", "Edit Details")}
                      </div>
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
                      <div className={styles.panelHeaderMeta}>
                        <span>{talentItems.length || 0} listed</span>
                        {renderOwnerEditButton(
                          "talent",
                          "Edit Talents and Skills",
                        )}
                      </div>
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
                        <strong>
                          {profileUser.avatar ? "Uploaded" : "Missing"}
                        </strong>
                      </div>
                      <div className={styles.statusRow}>
                        <span>Banner</span>
                        <strong>
                          {profileUser.banner ? "Uploaded" : "Missing"}
                        </strong>
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
              </div>
            </div>
          </div>
        ) : null}
      </section>
    </main>
  );
};
