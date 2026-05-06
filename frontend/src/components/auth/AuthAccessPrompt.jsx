import { useLocation, useNavigate } from "react-router-dom";
import styles from "./AuthAccessPrompt.module.css";
import { rememberPostAuthRedirect } from "../../utils/authRedirect";

export const AuthAccessPrompt = ({
  open,
  onClose,
  title = "Create an account to continue",
  description = "Browsing is public, but account actions need sign-in so your activity can be saved safely.",
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  if (!open) {
    return null;
  }

  const currentPath = `${location.pathname}${location.search}${location.hash}`;

  const handleNavigate = (targetPath) => {
    rememberPostAuthRedirect(currentPath);
    navigate(targetPath);
    onClose?.();
  };

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-access-title"
        onClick={(event) => event.stopPropagation()}
      >
        <p className={styles.kicker}>Account required</p>
        <h2 id="auth-access-title">{title}</h2>
        <p className={styles.description}>{description}</p>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.primaryBtn}
            onClick={() => handleNavigate("/login")}
          >
            Log in
          </button>
          <button
            type="button"
            className={styles.secondaryBtn}
            onClick={() => handleNavigate("/signup")}
          >
            Create account
          </button>
        </div>
        <button type="button" className={styles.closeBtn} onClick={onClose}>
          Maybe later
        </button>
      </div>
    </div>
  );
};
