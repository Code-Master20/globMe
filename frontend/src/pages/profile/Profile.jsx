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
import { AuthAccessPrompt } from "../../components/auth/AuthAccessPrompt";
import { EditProfileInfo } from "../../components/profile/EditProfileInfo";
import { ImageUpload } from "../../components/media/ImgUpload";
import { usePageMetadata } from "../../hooks/usePageMetadata";
import {
  deleteStory,
  updateCreatorMode,
  uploadBanner,
  uploadProfilePic,
  uploadStory,
} from "../../store/auth/authThunks";
import api from "../../lib/api";

const MAX_STORY_DURATION_SECONDS = 90;

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

const formatStoryExpiry = (value) => {
  if (!value) return "";

  const expiryDate = new Date(value);

  if (Number.isNaN(expiryDate.getTime())) {
    return "";
  }

  return expiryDate.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

const getStoryTimeLeftLabel = (value) => {
  if (!value) return "";

  const remainingMs = new Date(value).getTime() - Date.now();

  if (remainingMs <= 0) {
    return "Ending soon";
  }

  const remainingHours = Math.ceil(remainingMs / (60 * 60 * 1000));

  if (remainingHours >= 24) {
    const days = Math.floor(remainingHours / 24);
    const hours = remainingHours % 24;

    if (!hours) {
      return `${days}d left`;
    }

    return `${days}d ${hours}h left`;
  }

  return `${remainingHours}h left`;
};

const getLocalMediaDuration = (file) =>
  new Promise((resolve, reject) => {
    const mediaElement = document.createElement(
      file?.type?.startsWith("audio/") ? "audio" : "video",
    );
    const objectUrl = URL.createObjectURL(file);

    mediaElement.preload = "metadata";
    mediaElement.onloadedmetadata = () => {
      const duration = Number(mediaElement.duration);
      URL.revokeObjectURL(objectUrl);
      resolve(Number.isFinite(duration) ? duration : 0);
    };
    mediaElement.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Media duration could not be read"));
    };
    mediaElement.src = objectUrl;
  });

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
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [storyComposerOpen, setStoryComposerOpen] = useState(false);
  const [storyPosts, setStoryPosts] = useState([]);
  const [storyPostsLoading, setStoryPostsLoading] = useState(false);
  const [storyPostsError, setStoryPostsError] = useState("");
  const [pendingStoryMediaFile, setPendingStoryMediaFile] = useState(null);
  const [pendingStoryAudioFile, setPendingStoryAudioFile] = useState(null);
  const [selectedStoryPost, setSelectedStoryPost] = useState(null);
  const [pendingStoryMediaPreview, setPendingStoryMediaPreview] = useState("");
  const [pendingStoryAudioPreview, setPendingStoryAudioPreview] = useState("");

  const isOwner = !userId || (user?._id && `${userId}` === `${user._id}`);
  const metadataProfile = isOwner ? user : viewedUser;

  usePageMetadata({
    title: metadataProfile?.username
      ? `${formatDisplayValue(metadataProfile.username)} profile`
      : "Public profile",
    description:
      listify(metadataProfile?.bio)[0] ||
      formatDisplayValue(metadataProfile?.profession) ||
      "Browse public member profiles on globMe before creating an account.",
    robots: isOwner ? "noindex, nofollow" : "index, follow",
  });

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
    if (!pendingStoryMediaFile) {
      setPendingStoryMediaPreview("");
      return undefined;
    }

    const objectUrl = URL.createObjectURL(pendingStoryMediaFile);
    setPendingStoryMediaPreview(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [pendingStoryMediaFile]);

  useEffect(() => {
    if (!pendingStoryAudioFile) {
      setPendingStoryAudioPreview("");
      return undefined;
    }

    const objectUrl = URL.createObjectURL(pendingStoryAudioFile);
    setPendingStoryAudioPreview(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [pendingStoryAudioFile]);

  useEffect(() => {
    if (width > 640 && showInfo) {
      setShowInfo(false);
    }
  }, [showInfo, width]);

  useEffect(() => {
    if (!storyComposerOpen || !isOwner || !user?._id) {
      return undefined;
    }

    let ignore = false;

    const loadStoryPosts = async () => {
      try {
        setStoryPostsLoading(true);
        setStoryPostsError("");
        const response = await api.get("/user/story-posts");

        if (!ignore) {
          setStoryPosts(response.data?.data || []);
        }
      } catch (error) {
        if (!ignore) {
          setStoryPosts([]);
          setStoryPostsError(
            error.response?.data?.message || "Could not load your uploaded posts.",
          );
        }
      } finally {
        if (!ignore) {
          setStoryPostsLoading(false);
        }
      }
    };

    loadStoryPosts();

    return () => {
      ignore = true;
    };
  }, [storyComposerOpen, isOwner, user]);

  useEffect(() => {
    if (isOwner && !user) {
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

  const handleStoryMediaSelect = async (file) => {
    if (file?.type?.startsWith("video/")) {
      try {
        const duration = await getLocalMediaDuration(file);

        if (duration > MAX_STORY_DURATION_SECONDS) {
          toast.error("Story videos must be 1 minute 30 seconds or shorter");
          return;
        }
      } catch {
        toast.error("We could not read that video length");
        return;
      }
    }

    setSelectedStoryPost(null);
    setPendingStoryMediaFile(file);
  };

  const handleStoryAudioSelect = async (file) => {
    try {
      const duration = await getLocalMediaDuration(file);

      if (duration > MAX_STORY_DURATION_SECONDS) {
        toast.error("Story music must be 1 minute 30 seconds or shorter");
        return;
      }
    } catch {
      toast.error("We could not read that audio length");
      return;
    }

    setPendingStoryAudioFile(file);
  };

  const resetStoryComposer = () => {
    setPendingStoryMediaFile(null);
    setPendingStoryAudioFile(null);
    setSelectedStoryPost(null);
  };

  const handlePublishStory = async () => {
    if (!pendingStoryMediaFile && !selectedStoryPost?._id) {
      toast.error("Choose a photo, video, or one of your posts first");
      return;
    }

    setUploadTarget("story");
    const resultAction = await dispatch(
      uploadStory({
        mediaFile: pendingStoryMediaFile,
        audioFile: pendingStoryAudioFile,
        sourcePostId: selectedStoryPost?._id || "",
      }),
    );

    if (uploadStory.rejected.match(resultAction)) {
      toast.error(resultAction.payload?.message || "Story could not be uploaded");
      return;
    }

    toast.success(resultAction.payload?.message || "Story uploaded successfully");
    resetStoryComposer();
    setStoryComposerOpen(false);
  };

  const handleDeleteStory = async () => {
    setUploadTarget("story-delete");
    const resultAction = await dispatch(deleteStory());

    if (deleteStory.rejected.match(resultAction)) {
      toast.error(resultAction.payload?.message || "Story could not be removed");
      return;
    }

    toast.success(resultAction.payload?.message || "Story removed successfully");
  };

  const handleSendFriendRequest = async () => {
    if (!profileUser?._id || isOwner) {
      return;
    }

    if (!user) {
      setShowAuthPrompt(true);
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

    if (!user) {
      setShowAuthPrompt(true);
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

    if (!user) {
      setShowAuthPrompt(true);
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

  if (isOwner && !user) {
    return (
      <main className={styles.mainContainer}>
        <section className={styles.emptyState}>
          <h1>Log in to open your profile.</h1>
          <p>Your own profile tools stay private until your account session is active.</p>
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
  const profileIntro = bioItems[0] || "";
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
  const activeStory = profileUser.story || "";
  const activeStoryType = profileUser.storyType || "image";
  const activeStoryAudio = profileUser.storyAudio || "";
  const storyExpiresAt = profileUser.storyExpiresAt || "";
  const hasActiveStory = Boolean(activeStory && storyExpiresAt);
  const storyExpiryLabel = formatStoryExpiry(storyExpiresAt);
  const storyTimeLeftLabel = getStoryTimeLeftLabel(storyExpiresAt);
  const pendingStoryType = pendingStoryMediaFile
    ? (pendingStoryMediaFile.type?.startsWith("video/") ? "video" : "image")
    : (selectedStoryPost?.postType || "image");
  const composerHasSelection = Boolean(pendingStoryMediaFile || selectedStoryPost?._id);

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

    if (!user) {
      return (
        <div className={styles.visitorRelationshipRow}>
          <button
            type="button"
            className={styles.friendActionBtn}
            onClick={() => setShowAuthPrompt(true)}
          >
            Add friend
          </button>
          <span className={styles.relationshipChip}>
            Log in or create an account to connect
          </span>
        </div>
      );
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
    <>
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

                {profileIntro ? (
                  <p className={styles.profileStory}>{profileIntro}</p>
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

          {hasActiveStory || isOwner ? (
            <section className={styles.storyPanel}>
              <div className={styles.storyPanelHeader}>
                <div>
                  <p className={styles.storyEyebrow}>
                    {isOwner ? "Your story" : `${profileUser.username}'s story`}
                  </p>
                  <h2>{hasActiveStory ? "Live for 36 hours" : "Share a story"}</h2>
                </div>

                {isOwner ? (
                  <div className={styles.storyActions}>
                    <button
                      type="button"
                      className={styles.storyUploadButton}
                      onClick={() => setStoryComposerOpen((prev) => !prev)}
                    >
                      {storyComposerOpen
                        ? "Close composer"
                        : hasActiveStory
                          ? "Create new story"
                          : "Create story"}
                    </button>

                    {hasActiveStory ? (
                      <button
                        type="button"
                        className={styles.storyDeleteButton}
                        onClick={handleDeleteStory}
                        disabled={loading}
                      >
                        {loading && uploadTarget === "story-delete"
                          ? "Removing..."
                          : "Remove story"}
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>

              {isOwner && storyComposerOpen ? (
                <div className={styles.storyComposer}>
                  <p className={styles.storyComposerIntro}>
                    Build one live story from a photo or video on your device, add
                    optional music, or turn one of your uploaded posts into the story.
                    Video and music clips must stay within 1 minute 30 seconds.
                  </p>

                  <div className={styles.storyComposerActions}>
                    <ImageUpload
                      Icon={RiImageEditLine}
                      className={styles.storyUploader}
                      buttonClassName={styles.storyUploadButton}
                      onFileSelect={handleStoryMediaSelect}
                      disabled={loading}
                      size={18}
                      accept="image/*,video/*"
                      label={
                        pendingStoryMediaFile ? "Change photo/video" : "Choose photo/video"
                      }
                      title="Choose a photo or video for your story"
                    />

                    <ImageUpload
                      Icon={RiImageEditLine}
                      className={styles.storyUploader}
                      buttonClassName={styles.storySecondaryButton}
                      onFileSelect={handleStoryAudioSelect}
                      disabled={loading}
                      size={18}
                      accept="audio/*"
                      label={pendingStoryAudioFile ? "Change music" : "Add music"}
                      title="Attach optional music from your device"
                    />

                    {(pendingStoryMediaFile || pendingStoryAudioFile || selectedStoryPost) ? (
                      <button
                        type="button"
                        className={styles.storySecondaryButton}
                        onClick={resetStoryComposer}
                        disabled={loading}
                      >
                        Clear draft
                      </button>
                    ) : null}
                  </div>

                  <div className={styles.storyComposerGrid}>
                    <div className={styles.storyComposerCard}>
                      <div className={styles.storyComposerSectionHeader}>
                        <h3>Draft preview</h3>
                        <span>
                          {selectedStoryPost
                            ? "Using one of your posts"
                            : pendingStoryMediaFile
                              ? "Using device media"
                              : "Nothing selected yet"}
                        </span>
                      </div>

                      {composerHasSelection ? (
                        <div className={styles.storyDraftPreview}>
                          {pendingStoryType === "video" ? (
                            <video
                              src={pendingStoryMediaPreview || selectedStoryPost?.url}
                              className={styles.storyImage}
                              controls
                              preload="metadata"
                            />
                          ) : (
                            <img
                              src={pendingStoryMediaPreview || selectedStoryPost?.url}
                              alt="Story draft"
                              className={styles.storyImage}
                            />
                          )}

                          <div className={styles.storyMeta}>
                            <span className={styles.storyBadge}>
                              {pendingStoryType === "video" ? "Video story" : "Photo story"}
                            </span>
                            <p>
                              {selectedStoryPost
                                ? formatDisplayValue(selectedStoryPost.title) ||
                                  "Selected post"
                                : pendingStoryMediaFile?.name || "Device upload"}
                            </p>

                            {pendingStoryAudioFile ? (
                              <audio
                                src={pendingStoryAudioPreview}
                                controls
                                preload="metadata"
                                className={styles.storyAudioPlayer}
                              />
                            ) : null}
                          </div>
                        </div>
                      ) : (
                        <div className={styles.storyPlaceholder}>
                          Choose a photo or video, or select one of your posts below.
                        </div>
                      )}
                    </div>

                    <div className={styles.storyComposerCard}>
                      <div className={styles.storyComposerSectionHeader}>
                        <h3>Your uploaded posts</h3>
                        <span>Image and video posts can become your story</span>
                      </div>

                      {storyPostsLoading ? (
                        <div className={styles.storyPostsState}>Loading your posts...</div>
                      ) : storyPostsError ? (
                        <div className={styles.storyPostsState}>{storyPostsError}</div>
                      ) : storyPosts.length === 0 ? (
                        <div className={styles.storyPostsState}>
                          No image or video posts are available yet.
                        </div>
                      ) : (
                        <div className={styles.storyPostList}>
                          {storyPosts.map((post) => {
                            const isSelected = selectedStoryPost?._id === post._id;

                            return (
                              <button
                                type="button"
                                key={post._id}
                                className={`${styles.storyPostCard} ${
                                  isSelected ? styles.storyPostCardActive : ""
                                }`}
                                onClick={() => {
                                  setPendingStoryMediaFile(null);
                                  setSelectedStoryPost(post);
                                }}
                              >
                                {post.postType === "video" ? (
                                  <video
                                    src={post.url}
                                    className={styles.storyPostThumb}
                                    muted
                                    preload="metadata"
                                  />
                                ) : (
                                  <img
                                    src={post.url}
                                    alt={post.title || "Uploaded post"}
                                    className={styles.storyPostThumb}
                                  />
                                )}

                                <div className={styles.storyPostMeta}>
                                  <strong>
                                    {formatDisplayValue(post.title) || "Untitled post"}
                                  </strong>
                                  <span>{formatDisplayValue(post.postType)}</span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className={styles.storyComposerFooter}>
                    <span>
                      Published stories stay live for 36 hours, then disappear
                      automatically. Video and music length is capped at 1 minute
                      30 seconds.
                    </span>
                    <button
                      type="button"
                      className={styles.storyPublishButton}
                      onClick={handlePublishStory}
                      disabled={loading || !composerHasSelection}
                    >
                      {loading && uploadTarget === "story"
                        ? "Publishing..."
                        : "Publish story"}
                    </button>
                  </div>
                </div>
              ) : null}

              {hasActiveStory ? (
                <div className={styles.storyPreview}>
                  {activeStoryType === "video" ? (
                    <video
                      src={activeStory}
                      className={styles.storyImage}
                      controls
                      preload="metadata"
                    />
                  ) : (
                    <img
                      src={activeStory}
                      alt={`${profileUser.username || "User"} story`}
                      className={styles.storyImage}
                    />
                  )}

                  <div className={styles.storyMeta}>
                    <span className={styles.storyBadge}>{storyTimeLeftLabel}</span>
                    <p>
                      This story stays visible until {storyExpiryLabel} and then
                      disappears automatically.
                    </p>

                    {activeStoryAudio ? (
                      <audio
                        src={activeStoryAudio}
                        controls
                        preload="metadata"
                        className={styles.storyAudioPlayer}
                      />
                    ) : null}
                  </div>
                </div>
              ) : (
                <div className={styles.storyPlaceholder}>
                  Upload a photo or video story, add music if you want, or reuse one
                  of your posts. It stays live for 36 hours and then expires
                  automatically.
                </div>
              )}
            </section>
          ) : null}

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

      <AuthAccessPrompt
        open={showAuthPrompt}
        onClose={() => setShowAuthPrompt(false)}
        title="Log in to interact with this profile"
        description="Public visitors can browse profiles, but adding friends and responding to requests needs an account so the relationship can be saved."
      />
    </>
  );
};
