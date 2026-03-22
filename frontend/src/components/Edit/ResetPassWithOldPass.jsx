import { useNavigate } from "react-router-dom";
import styles from "./EditPassword.module.css";

export const ResetPassWithOldPass = ({ setOtpResetTrigger }) => {
  const navigate = useNavigate();
  function passRememberedNot() {
    setOtpResetTrigger(true);
    localStorage.setItem("otpResetTrigger", JSON.stringify(true));
  }

  return (
    <main className={styles.container}>
      <section className={styles.card}>
        <article className={styles.topSwitch}>
          <button onClick={passRememberedNot} className={styles.switchBtn}>
            Old password not remembered? <span>Reset via OTP</span>
          </button>
        </article>

        <h1 className={styles.heading}>exchange Password</h1>

        <form className={styles.form}>
          <fieldset className={styles.fieldset}>
            <legend className={styles.legend}>Your Email</legend>
            <input
              type="text"
              placeholder="Enter your email"
              className={styles.input}
            />
          </fieldset>

          <fieldset className={styles.fieldset}>
            <legend className={styles.legend}>Old Password</legend>
            <input
              type="password"
              placeholder="Enter Old password"
              className={styles.input}
            />
          </fieldset>

          <fieldset className={styles.fieldset}>
            <legend className={styles.legend}>New Password</legend>
            <input
              type="password"
              placeholder="Enter new password"
              className={styles.input}
            />
          </fieldset>

          <button className={styles.button}>exchange Password</button>

          <p className={styles.link} onClick={() => navigate("/login")}>
            Remember your password? Go back to login
          </p>
        </form>
      </section>
    </main>
  );
};
