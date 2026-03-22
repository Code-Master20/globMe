import { useNavigate } from "react-router-dom";
import styles from "./EditPassword.module.css";

export const ResetPassWithOtp = ({ setOtpResetTrigger }) => {
  const navigate = useNavigate();
  function passRemembered() {
    setOtpResetTrigger(false);
    localStorage.setItem("otpResetTrigger", JSON.stringify(false));
  }

  return (
    <main className={styles.container}>
      <section className={styles.card}>
        <article className={styles.topSwitch}>
          <button onClick={passRemembered} className={styles.switchBtn}>
            Remembered your password? <span>Change via old password</span>
          </button>
        </article>
        <h1 className={styles.heading}>Reset Password</h1>

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
            <legend className={styles.legend}>New Password</legend>
            <input
              type="password"
              placeholder="Enter new password"
              className={styles.input}
            />
          </fieldset>

          <button className={styles.button}>Reset Password</button>

          <p className={styles.link} onClick={() => navigate("/login")}>
            Remember your password? Go back to login
          </p>
        </form>
      </section>
    </main>
  );
};
