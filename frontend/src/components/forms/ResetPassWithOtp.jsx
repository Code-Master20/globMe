import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import styles from "./EditPassword.module.css";
import { useState } from "react";
import { resetPassOtpReceived } from "../../features/auth/authThunks";
import { InvalidInputTracker } from "./InvalidInputTracker";
import { toast } from "react-toastify";

export const ResetPassWithOtp = ({ setOtpResetTrigger }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
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
  const [loading, setLoading] = useState(false);
  const [path, setPath] = useState(null);
  const [inputErrorString, setInputErrorString] = useState("");

  function handleOnChange(e) {
    const { name, value } = e.target;
    const formattedValue =
      name === "email" ? value.trim().toLowerCase() : value.trim();

    setCredentials((prev) => ({
      ...prev,
      [name]: formattedValue,
    }));

    if (name === "email") {
      const existingUser = JSON.parse(localStorage.getItem("user")) || {};
      localStorage.setItem(
        "user",
        JSON.stringify({
          ...existingUser,
          email: formattedValue,
        }),
      );
    }

    if (name === path) {
      setPath(null);
      setInputErrorString("");
    }
  }

  //=================handling form submit and sending data to backend=================
  async function handleOnSubmit(e) {
    e.preventDefault();
    setLoading(true);

    const localUser = JSON.parse(localStorage.getItem("user")) || {};
    const payload = {
      email: credentials.email.trim().toLowerCase(),
      newPassword: credentials.newPassword.trim(),
    };

    localStorage.setItem(
      "user",
      JSON.stringify({
        ...localUser,
        email: payload.email,
        newPassword: payload.newPassword,
        purpose: "reset-password",
      }),
    );

    const resultAction = await dispatch(resetPassOtpReceived(payload));
    setLoading(false);

    if (resetPassOtpReceived.rejected.match(resultAction)) {
      const message = resultAction.payload?.message;

      if (
        message &&
        typeof message === "object" &&
        Array.isArray(message.path) &&
        message.path.length > 0
      ) {
        setPath(message.path[0]);
        setInputErrorString(message.msg);
        return;
      }

      toast.warn(message || "Could not send reset OTP");
      return;
    }

    if (resetPassOtpReceived.fulfilled.match(resultAction)) {
      toast.success(resultAction.payload?.message);
      navigate("/verify-otp", { replace: true });
    }
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
            />
            {path === "email" && (
              <InvalidInputTracker
                className={styles.errorTracker}
                inputErrorString={inputErrorString}
              />
            )}
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
            {path === "newPassword" && (
              <InvalidInputTracker
                className={styles.errorTracker}
                inputErrorString={inputErrorString}
              />
            )}
          </fieldset>

          <button className={styles.button} type="submit" disabled={loading}>
            {loading ? "Sending OTP..." : "Reset Password"}
          </button>

          <p className={styles.link} onClick={() => navigate("/login")}>
            Remember your password? Go back to login
          </p>
        </form>
      </section>
    </main>
  );
};
