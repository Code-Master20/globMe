import { useRef } from "react";
import styles from "./EditProfile.module.css";

export const EditProfileInfo = ({ Icon, className }) => {
  const modalRef = useRef(null);

  const handleToggle = () => {
    modalRef.current.classList.toggle(styles.active);
  };

  return (
    <>
      {/* Icon */}
      <span onClick={handleToggle} className={`${styles.icon} ${className}`}>
        <Icon size={20} />
      </span>

      {/* Full Screen Modal */}
      <div ref={modalRef} className={styles.modal}>
        <div className={styles.formContainer}>
          <form className={styles.form}>
            <h2>Edit Profile</h2>

            {/* Username */}
            <div className={styles.field}>
              <label htmlFor="username">Username</label>
              <input type="text" id="username" />
            </div>

            {/* Bio */}
            <div className={styles.field}>
              <label htmlFor="bio">Bio</label>
              <textarea id="bio" rows="3"></textarea>
            </div>

            {/* Location */}
            <div className={styles.field}>
              <label htmlFor="location">Location</label>
              <input type="text" id="location" />
            </div>

            {/* Profession */}
            <div className={styles.field}>
              <label htmlFor="profession">Profession</label>
              <input type="text" id="profession" />
            </div>

            {/* Talent */}
            <div className={styles.field}>
              <label htmlFor="talent">Talent</label>
              <input type="text" id="talent" />
            </div>

            {/* Relationship Status */}
            <div className={styles.field}>
              <label htmlFor="status">Relationship Status</label>
              <select id="status">
                <option value="">Select status</option>
                <option value="single">Single</option>
                <option value="married">Married</option>
                <option value="relationship">In a relationship</option>
                <option value="divorced">Divorced</option>
              </select>
            </div>

            {/* Gender */}
            <div className={styles.field}>
              <label htmlFor="gender">Gender</label>
              <select id="gender">
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Date of Birth */}
            <div className={styles.field}>
              <label htmlFor="dob">Date of Birth</label>
              <input type="date" id="dob" />
            </div>

            {/* Buttons */}
            <div className={styles.actions}>
              <button type="submit" className={styles.save}>
                Save
              </button>
              <button
                type="button"
                className={styles.cancel}
                onClick={handleToggle}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};
