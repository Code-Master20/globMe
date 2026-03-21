import { useNavigate } from "react-router-dom";
import styles from "./EditPassword.module.css";

export const EditPassword = () => {
  const navigate = useNavigate();

  function passRemembered() {
    navigate("/");
  }

  return (
    <main className={styles.container}>
      <section className={styles.card}>
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

          <p className={styles.link} onClick={passRemembered}>
            Remember your password? Go back to login
          </p>
        </form>
      </section>
    </main>
  );
};
