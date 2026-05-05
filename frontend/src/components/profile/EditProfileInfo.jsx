import { useState } from "react";
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
  talent:
    Array.isArray(user?.talent) && user.talent.length > 0
      ? user.talent
      : [""],
  status: user?.status || "",
  gender: user?.gender || "",
  dob: user?.dob || "",
});

export const EditProfileInfo = ({ Icon, className }) => {
  const dispatch = useDispatch();
  const { user, formLoading } = useSelector((state) => state.auth);
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState(buildFormState(user));

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
      talent: formData.talent.map((item) => item.trim()).filter(Boolean),
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

  return (
    <>
      <button
        type="button"
        onClick={handleToggle}
        className={`${styles.icon} ${className}`}
        aria-label="Edit profile information"
        title="Edit profile"
      >
        <Icon size={20} />
      </button>

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
                  value={formData.bio}
                  onChange={handleChange}
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="location">Location</label>
                <input
                  type="text"
                  id="location"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
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

              <div className={styles.field}>
                <label htmlFor="status">Relationship Status</label>
                <select
                  id="status"
                  name="status"
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
                  value={formData.dob}
                  onChange={handleChange}
                />
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
    </>
  );
};
