import { useNavigate } from "react-router-dom";
import styles from "./EditPassword.module.css";
import { useState } from "react";

export const ResetPassWithOtp = ({ setOtpResetTrigger }) => {
  const navigate = useNavigate();
  function passRemembered() {
    setOtpResetTrigger(false);
    localStorage.setItem("otpResetTrigger", JSON.stringify(false));
  }

  //============receiving data from form and sending to backend=================
  const storedUser = localStorage.getItem("user") || "";
  const [credentials, setCredentials] = useState({
    email: storedUser ? JSON.parse(storedUser).email : "",
    newPassword: "",
  });

  function handleOnChange(e) {
    const { name, value } = e.target;
    setCredentials((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  //=================handling form submit and sending data to backend=================
  async function handleOnSubmit(e) {
    e.preventDefault();
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

        <form className={styles.form} onSubmit={handleOnSubmit}>
          <fieldset className={styles.fieldset}>
            <legend className={styles.legend}>Your Email</legend>
            <input
              type="text"
              name="email"
              placeholder="Enter your email"
              className={styles.input}
              onChange={handleOnChange}
              value={credentials.email}
              disabled
            />
          </fieldset>

          <fieldset className={styles.fieldset}>
            <legend className={styles.legend}>New Password</legend>
            <input
              type="password"
              name="newPassword"
              placeholder="Enter new password"
              className={styles.input}
              onChange={handleOnChange}
              value={credentials.newPassword}
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
