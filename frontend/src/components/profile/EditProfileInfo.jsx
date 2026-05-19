import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import { updateProfileDetails } from "../../store/auth/authThunks";
import styles from "./EditProfile.module.css";

const toTextValue = (value, separator = ", ") => {
  if (Array.isArray(value)) {
    return value.join(separator);
  }

  return value || "";
};

const buildFormState = (user) => ({
  username: user?.username || "",
  profession: user?.profession || "",
  bio: toTextValue(user?.bio, "\n"),
  location: toTextValue(user?.location),
  externalLinks:
    Array.isArray(user?.externalLinks) && user.externalLinks.length > 0
      ? user.externalLinks.map((link) => ({
          type: link?.type || "website",
          label: link?.label || "",
          url: link?.url || "",
        }))
      : [{ type: "website", label: "", url: "" }],
  talent:
    Array.isArray(user?.talent) && user.talent.length > 0
      ? user.talent
      : [""],
  status: user?.status || "",
  gender: user?.gender || "",
  dob: user?.dob || "",
  profileVisibility: {
    email: user?.profileVisibility?.email ?? true,
    profession: user?.profileVisibility?.profession ?? true,
    bio: user?.profileVisibility?.bio ?? true,
    location: user?.profileVisibility?.location ?? true,
    talent: user?.profileVisibility?.talent ?? true,
    links: user?.profileVisibility?.links ?? true,
    status: user?.profileVisibility?.status ?? true,
    gender: user?.profileVisibility?.gender ?? true,
    dob: user?.profileVisibility?.dob ?? true,
    friendsCount: user?.profileVisibility?.friendsCount ?? true,
    followersCount: user?.profileVisibility?.followersCount ?? false,
    followingCount: user?.profileVisibility?.followingCount ?? false,
  },
});

const visibilityFields = [
  { key: "email", label: "Email" },
  { key: "profession", label: "Profession" },
  { key: "bio", label: "Bio" },
  { key: "location", label: "Location" },
  { key: "talent", label: "Talents/Skills" },
  { key: "links", label: "Profile links" },
  { key: "status", label: "Relationship status" },
  { key: "gender", label: "Gender" },
  { key: "dob", label: "Date of birth" },
  { key: "friendsCount", label: "Frados" },
  { key: "followersCount", label: "Sabos and Safros (creator mode)" },
  { key: "followingCount", label: "Saboings and Safroings" },
];

const profileLinkTypes = [
  { value: "website", label: "Website" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "youtube", label: "YouTube" },
  { value: "instagram", label: "Instagram" },
  { value: "twitter", label: "Twitter / X" },
  { value: "facebook", label: "Facebook" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "telegram", label: "Telegram" },
  { value: "github", label: "GitHub" },
  { value: "app", label: "App link" },
  { value: "other", label: "Other" },
];

const buildDetectedLocation = (address = {}, displayName = "") => {
  const primaryParts = [
    address.suburb || address.neighbourhood || address.hamlet || address.village,
    address.city_district || address.state_district || address.county || address.city,
    address.state,
    address.postcode,
    address.country,
  ]
    .map((part) => `${part ?? ""}`.trim())
    .filter(Boolean);

  const uniquePrimaryParts = [...new Set(primaryParts)];

  if (uniquePrimaryParts.length > 0) {
    return uniquePrimaryParts.join(", ");
  }

  const fallbackParts = [address.state, address.country]
    .map((part) => `${part ?? ""}`.trim())
    .filter(Boolean);

  const uniqueFallbackParts = [...new Set(fallbackParts)];

  if (uniqueFallbackParts.length > 0) {
    return uniqueFallbackParts.join(", ");
  }

  return `${displayName ?? ""}`.trim();
};

export const EditProfileInfo = ({
  Icon,
  className,
  initialFocusField = "",
  compact = false,
  buttonLabel = "Edit profile",
  iconSize = 20,
}) => {
  const dispatch = useDispatch();
  const { user, formLoading } = useSelector((state) => state.auth);
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState(buildFormState(user));
  const [isLocating, setIsLocating] = useState(false);
  const fieldRefs = useRef({});

  useEffect(() => {
    if (!isOpen || !initialFocusField) {
      return;
    }

    const timer = window.setTimeout(() => {
      const targetField = fieldRefs.current[initialFocusField];

      if (targetField && typeof targetField.focus === "function") {
        targetField.focus();
      }
    }, 40);

    return () => window.clearTimeout(timer);
  }, [initialFocusField, isOpen]);

  const handleToggle = () => {
    setIsOpen((prev) => {
      const nextOpen = !prev;

      if (nextOpen) {
        setFormData(buildFormState(user));
      }

      return nextOpen;
    });
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const payload = {
      ...formData,
      username: formData.username.trim(),
      profession: formData.profession.trim(),
      bio: formData.bio,
      location: formData.location,
      externalLinks: formData.externalLinks
        .map((link) => ({
          type: `${link?.type || "website"}`.trim().toLowerCase(),
          label: `${link?.label || ""}`.trim(),
          url: `${link?.url || ""}`.trim(),
        }))
        .filter((link) => link.url),
      talent: formData.talent.map((item) => item.trim()).filter(Boolean),
      profileVisibility: formData.profileVisibility,
    };

    const resultAction = await dispatch(updateProfileDetails(payload));

    if (updateProfileDetails.fulfilled.match(resultAction)) {
      toast.success(resultAction.payload?.message || "Profile updated");
      setIsOpen(false);
      return;
    }

    toast.error(resultAction.payload?.message || "Profile update failed");
  };

  const handleTalentChange = (index, value) => {
    setFormData((prev) => ({
      ...prev,
      talent: prev.talent.map((item, itemIndex) =>
        itemIndex === index ? value : item,
      ),
    }));
  };

  const handleAddTalentRow = () => {
    setFormData((prev) => ({
      ...prev,
      talent: [...prev.talent, ""],
    }));
  };

  const handleRemoveTalentRow = (index) => {
    setFormData((prev) => {
      const nextTalents = prev.talent.filter((_, itemIndex) => itemIndex !== index);

      return {
        ...prev,
        talent: nextTalents.length > 0 ? nextTalents : [""],
      };
    });
  };

  const handleVisibilityToggle = (field) => {
    setFormData((prev) => ({
      ...prev,
      profileVisibility: {
        ...prev.profileVisibility,
        [field]: !prev.profileVisibility[field],
      },
    }));
  };

  const handleLinkChange = (index, field, value) => {
    setFormData((prev) => ({
      ...prev,
      externalLinks: prev.externalLinks.map((link, linkIndex) =>
        linkIndex === index
          ? {
              ...link,
              [field]: value,
            }
          : link,
      ),
    }));
  };

  const handleAddLinkRow = () => {
    setFormData((prev) => ({
      ...prev,
      externalLinks: [
        ...prev.externalLinks,
        { type: "website", label: "", url: "" },
      ],
    }));
  };

  const handleRemoveLinkRow = (index) => {
    setFormData((prev) => {
      const nextLinks = prev.externalLinks.filter(
        (_, linkIndex) => linkIndex !== index,
      );

      return {
        ...prev,
        externalLinks:
          nextLinks.length > 0
            ? nextLinks
            : [{ type: "website", label: "", url: "" }],
      };
    });
  };

  const handleUseCurrentLocation = async () => {
    if (!navigator.geolocation) {
      toast.error("Current location is not supported on this device.");
      return;
    }

    try {
      setIsLocating(true);

      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 12000,
          maximumAge: 0,
        });
      });

      const { latitude, longitude } = position.coords;
      let locationText = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;

      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`,
          {
            headers: {
              Accept: "application/json",
            },
          },
        );

        if (response.ok) {
          const locationData = await response.json();
          const address = locationData?.address || {};
          const detectedLocation = buildDetectedLocation(
            address,
            locationData?.display_name,
          );

          if (detectedLocation) {
            locationText = detectedLocation;
          } else if (locationData?.display_name) {
            locationText = locationData.display_name;
          }
        }
      } catch {
        // Keep coordinate fallback when reverse geocoding is unavailable.
      }

      setFormData((prev) => ({
        ...prev,
        location: locationText,
      }));

      toast.success("Current location added.");
    } catch (error) {
      if (error?.code === 1) {
        toast.error("Location permission was denied.");
      } else if (error?.code === 2) {
        toast.error("Current location could not be determined.");
      } else if (error?.code === 3) {
        toast.error("Location request timed out.");
      } else {
        toast.error("Current location could not be added.");
      }
    } finally {
      setIsLocating(false);
    }
  };

  const modalContent = (
    <div
      className={`${styles.modal} ${isOpen ? styles.active : ""}`}
      onClick={handleToggle}
    >
      <div
        className={styles.formContainer}
        onClick={(event) => event.stopPropagation()}
      >
        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.formHeader}>
            <div>
              <p>Profile editor</p>
              <h2>Edit Profile</h2>
            </div>
            <button
              type="button"
              className={styles.closeButton}
              onClick={handleToggle}
              aria-label="Close profile editor"
            >
              x
            </button>
          </div>

            <div className={styles.formGrid}>
              <div className={styles.field}>
                <label htmlFor="username">Username</label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  ref={(node) => {
                    fieldRefs.current.username = node;
                  }}
                  value={formData.username}
                  onChange={handleChange}
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="profession">Profession</label>
                <input
                  type="text"
                  id="profession"
                  name="profession"
                  ref={(node) => {
                    fieldRefs.current.profession = node;
                  }}
                  value={formData.profession}
                  onChange={handleChange}
                />
              </div>

              <div className={`${styles.field} ${styles.fieldWide}`}>
                <label htmlFor="bio">Bio</label>
                <textarea
                  id="bio"
                  name="bio"
                  rows="5"
                  ref={(node) => {
                    fieldRefs.current.bio = node;
                  }}
                  value={formData.bio}
                  onChange={handleChange}
                />
              </div>

              <div className={styles.field}>
                <div className={styles.fieldHeader}>
                  <label htmlFor="location">Location</label>
                  <button
                    type="button"
                    className={styles.locationButton}
                    onClick={handleUseCurrentLocation}
                    disabled={isLocating}
                  >
                    {isLocating ? "Locating..." : "Use current location"}
                  </button>
                </div>
                <input
                  type="text"
                  id="location"
                  name="location"
                  ref={(node) => {
                    fieldRefs.current.location = node;
                  }}
                  value={formData.location}
                  onChange={handleChange}
                  placeholder="Type your location"
                />
              </div>

              <div className={`${styles.field} ${styles.fieldWide}`}>
                <div className={styles.tableHeaderRow}>
                  <label>Talents/Skills</label>
                  <button
                    type="button"
                    className={styles.tableAddButton}
                    onClick={handleAddTalentRow}
                  >
                    Add row
                  </button>
                </div>
                <div className={styles.skillsTableWrap}>
                  <div className={styles.skillList}>
                    {formData.talent.map((talent, index) => (
                      <div className={styles.skillRow} key={`talent-${index}`}>
                        <span className={styles.skillIndex}>{index + 1}</span>
                        <input
                          type="text"
                          ref={
                            index === 0
                              ? (node) => {
                                  fieldRefs.current.talent = node;
                                }
                              : undefined
                          }
                          value={talent}
                          onChange={(event) =>
                            handleTalentChange(index, event.target.value)
                          }
                          placeholder="Add a skill"
                        />
                        <button
                          type="button"
                          className={styles.tableRemoveButton}
                          onClick={() => handleRemoveTalentRow(index)}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className={`${styles.field} ${styles.fieldWide}`}>
                <div className={styles.tableHeaderRow}>
                  <div>
                    <label>Profile Links</label>
                    <p className={styles.fieldHint}>
                      Add any links you want visitors to open, including social profiles,
                      WhatsApp, websites, and app/deep links.
                    </p>
                  </div>
                  <button
                    type="button"
                    className={styles.tableAddButton}
                    onClick={handleAddLinkRow}
                  >
                    Add link
                  </button>
                </div>
                <div className={styles.skillsTableWrap}>
                  <div className={styles.linkList}>
                    {formData.externalLinks.map((link, index) => (
                      <div className={styles.linkRow} key={`profile-link-${index}`}>
                        <select
                          value={link.type}
                          onChange={(event) =>
                            handleLinkChange(index, "type", event.target.value)
                          }
                        >
                          {profileLinkTypes.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={link.label}
                          onChange={(event) =>
                            handleLinkChange(index, "label", event.target.value)
                          }
                          placeholder="Optional label"
                        />
                        <input
                          type="text"
                          value={link.url}
                          onChange={(event) =>
                            handleLinkChange(index, "url", event.target.value)
                          }
                          placeholder={
                            link.type === "whatsapp"
                              ? "Phone number or WhatsApp URL"
                              : link.type === "app"
                                ? "App or deep link URL"
                                : "Paste profile or website URL"
                          }
                        />
                        <button
                          type="button"
                          className={styles.tableRemoveButton}
                          onClick={() => handleRemoveLinkRow(index)}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className={styles.field}>
                <label htmlFor="status">Relationship Status</label>
                <select
                  id="status"
                  name="status"
                  ref={(node) => {
                    fieldRefs.current.status = node;
                  }}
                  value={formData.status}
                  onChange={handleChange}
                >
                  <option value="">Select status</option>
                  <option value="single">Single</option>
                  <option value="married">Married</option>
                  <option value="relationship">In a relationship</option>
                  <option value="divorced">Divorced</option>
                </select>
              </div>

              <div className={styles.field}>
                <label htmlFor="gender">Gender</label>
                <select
                  id="gender"
                  name="gender"
                  ref={(node) => {
                    fieldRefs.current.gender = node;
                  }}
                  value={formData.gender}
                  onChange={handleChange}
                >
                  <option value="">Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className={`${styles.field} ${styles.fieldWide}`}>
                <label htmlFor="dob">Date of Birth</label>
                <input
                  type="date"
                  id="dob"
                  name="dob"
                  ref={(node) => {
                    fieldRefs.current.dob = node;
                  }}
                  value={formData.dob}
                  onChange={handleChange}
                />
              </div>

              <div className={`${styles.field} ${styles.fieldWide}`}>
                <div className={styles.privacyHeader}>
                  <label>Visible To Others</label>
                  <span>Hide any field you do not want other users to see.</span>
                </div>
                <div className={styles.visibilityGrid}>
                  {visibilityFields.map((field) => (
                    <button
                      key={field.key}
                      type="button"
                      className={`${styles.visibilityToggle} ${
                        formData.profileVisibility[field.key]
                          ? styles.visibilityOn
                          : styles.visibilityOff
                      }`}
                      onClick={() => handleVisibilityToggle(field.key)}
                    >
                      <span>{field.label}</span>
                      <strong>
                        {formData.profileVisibility[field.key] ? "Visible" : "Hidden"}
                      </strong>
                    </button>
                  ))}
                </div>
              </div>
            </div>

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.cancel}
              onClick={handleToggle}
              disabled={formLoading}
            >
              Cancel
            </button>
            <button type="submit" className={styles.save} disabled={formLoading}>
              {formLoading ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return (
    <>
      <button
        type="button"
        onClick={handleToggle}
        className={`${styles.icon} ${compact ? styles.iconCompact : ""} ${className || ""}`}
        aria-label={buttonLabel}
        title={buttonLabel}
      >
        <Icon size={iconSize} />
      </button>

      {typeof document !== "undefined"
        ? createPortal(modalContent, document.body)
        : modalContent}
    </>
  );
};
