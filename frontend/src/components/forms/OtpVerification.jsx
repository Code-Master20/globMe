import style from "./OtpVerification.module.css";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "../../pages/profile/LogInSignUp.module.css";
import { useDispatch, useSelector } from "react-redux";
import {
  otpVerifiedAndLoggedIn,
  otpVerifiedAndResetPassword,
  otpVerifiedAndSignedUp,
} from "../../features/auth/authThunks";
import { toast } from "react-toastify";
import { InvalidInputTracker } from "./InvalidInputTracker";
import globMe from "../../assets/globme.png";

export const OtpVerification = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { errorMessage } = useSelector((state) => state.auth);

  const storedUser = JSON.parse(localStorage.getItem("user")) || null;
  const [clientCredentials, setClientCredentials] = useState({
    email: storedUser ? storedUser.email : "",
    otp: storedUser?.otp ? storedUser.otp : "",
    purpose: storedUser ? storedUser.purpose : "",
  });
  const debounceRef = useRef(null);

  function handleOnChange(event) {
    const { name, value } = event.target;

    setClientCredentials((prev) => ({
      ...prev,
      [name]: value.trim(),
    }));

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      const existingUser = JSON.parse(localStorage.getItem("user")) || {};
      localStorage.setItem(
        "user",
        JSON.stringify({
          ...existingUser,
          otp: value.trim(),
        }),
      );
    }, 1000);
  }

  const storedTries = JSON.parse(localStorage.getItem("tries")) || 5;
  const storedTimes = JSON.parse(localStorage.getItem("timeRemains")) || 300;

  const [loading, setLoading] = useState(false);
  const [path, setPath] = useState(null);
  const [timerIdArr, setTimerIdArr] = useState([]);
  const purpose = storedUser ? storedUser.purpose : null;
  const [redirect, setRedirect] = useState(false);
  const [tries, setTries] = useState(storedTries);
  const [timeRemains, setTimeRemains] = useState(storedTimes);

  function clearOtpFlowState() {
    localStorage.removeItem("user");
    localStorage.removeItem("tries");
    localStorage.removeItem("timeRemains");
    localStorage.removeItem("otpResetTrigger");
    localStorage.removeItem("tryPassReset");
    localStorage.removeItem("tryRemains");
    localStorage.removeItem("runCount");
  }

  function onSubmitHelper(resultAction) {
    setLoading(false);
    const error = resultAction.payload?.message;

    const timer = setTimeout(() => {
      setPath(null);
    }, 5000);

    setTimerIdArr((prev) => [...prev, timer]);

    if (timerIdArr.length > 0) {
      for (let index = 0; index < timerIdArr.length; index++) {
        clearTimeout(timerIdArr[index]);
      }
    }

    if (typeof error === "string" && error.length <= 15) {
      setPath("otp");
      if (clientCredentials.otp.length > 0) {
        setTries((prev) => prev - 1);
        localStorage.setItem(
          "tries",
          JSON.stringify(storedTries ? storedTries - 1 : 5),
        );
      }
    }

    if (typeof error === "string" && error.length >= 25) {
      delete storedUser?.otp;
      localStorage.setItem("user", JSON.stringify(storedUser));

      toast.warn(error);
      setRedirect((prev) => !prev);
      setTimeout(() => {
        navigate(`/${purpose}`, { replace: true });
      }, 4000);
    }
  }

  async function handleOnSubmit(event) {
    event.preventDefault();
    setLoading(true);

    if (purpose === "login") {
      const resultAction = await dispatch(
        otpVerifiedAndLoggedIn(clientCredentials),
      );

      if (otpVerifiedAndLoggedIn.rejected.match(resultAction)) {
        onSubmitHelper(resultAction);
        return;
      }

      if (otpVerifiedAndLoggedIn.fulfilled.match(resultAction)) {
        setLoading(false);
        clearOtpFlowState();
        toast.success(resultAction.payload?.message);
      }
    }

    if (purpose === "signup") {
      const resultAction = await dispatch(
        otpVerifiedAndSignedUp(clientCredentials),
      );

      if (otpVerifiedAndSignedUp.rejected.match(resultAction)) {
        onSubmitHelper(resultAction);
        return;
      }

      if (otpVerifiedAndSignedUp.fulfilled.match(resultAction)) {
        setLoading(false);
        toast.success(resultAction.payload?.message);
        clearOtpFlowState();
      }
    }

    if (purpose === "reset-password") {
      const resultAction = await dispatch(
        otpVerifiedAndResetPassword(clientCredentials),
      );

      if (otpVerifiedAndResetPassword.rejected.match(resultAction)) {
        onSubmitHelper(resultAction);
        return;
      }

      if (otpVerifiedAndResetPassword.fulfilled.match(resultAction)) {
        setLoading(false);
        clearOtpFlowState();
        toast.success("Password reset complete. You are now signed in.");
      }
    }
  }

  useEffect(() => {
    if (redirect) {
      localStorage.removeItem("tries");
    }
  }, [redirect]);

  useEffect(() => {
    if (timeRemains === 0) {
      delete storedUser?.otp;
      localStorage.setItem("user", JSON.stringify(storedUser));
      localStorage.removeItem("timeRemains");
      toast.warn("OTP expired. Please request a new code.");
      setRedirect((prev) => !prev);
      setTimeout(() => {
        if (purpose) {
          navigate(`/${purpose}`);
        }
      }, 3000);
      return;
    }

    const timer = setInterval(() => {
      localStorage.setItem("timeRemains", JSON.stringify(storedTimes - 1));
      setTimeRemains((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemains]);

  const min = Math.floor(timeRemains / 60);
  const sec = timeRemains % 60;
  const minutes = min.toString().padStart(2, "0");
  const seconds = sec.toString().padStart(2, "0");
  const formattedTime =
    min < 1 ? `${minutes}:${seconds} sec` : `${minutes}:${seconds} min`;

  function onFocusTrigger(event) {
    if (event.target.name === path) {
      setPath(null);
    }
  }

  if (loading) {
    return (
      <section className={styles["auth-loading-state"]}>
        <div className={styles["auth-loading-card"]}>
          <img src={globMe} alt="globMe" className={styles["loading-logo"]} />
          <p className={styles["loading-kicker"]}>Verifying code</p>
          <h1>Checking your OTP and preparing your account access.</h1>
          <span className={style["loader"]}></span>
        </div>
      </section>
    );
  }

  if (redirect) {
    return (
      <section className={styles["auth-loading-state"]}>
        <div className={styles["auth-loading-card"]}>
          <img src={globMe} alt="globMe" className={styles["loading-logo"]} />
          <p className={styles["loading-kicker"]}>Redirecting</p>
          <h1>Returning to the {purpose || "previous"} page.</h1>
        </div>
      </section>
    );
  }

  return (
    <main className={styles["auth-page"]}>
      <section className={styles["auth-shell"]}>
        <aside className={styles["auth-brand-panel"]}>
          <div className={styles["brand-badge"]}>Final step</div>
          <img src={globMe} alt="globMe" className={styles["brand-logo"]} />
          <h1 className={styles["brand-title"]}>Confirm your email to continue.</h1>
          <p className={styles["brand-copy"]}>
            We sent a one-time code to your email. Enter it below before the
            timer runs out to complete access.
          </p>
          <div className={styles["brand-highlights"]}>
            <div>
              <span>Time remaining</span>
              <p>{formattedTime}</p>
            </div>
            <div>
              <span>Tries left</span>
              <p>{tries}</p>
            </div>
          </div>
        </aside>

        <section className={styles["auth-card"]}>
          <div className={styles["auth-card-header"]}>
            <p className={styles["auth-kicker"]}>Verification</p>
            <h2 className={styles["auth-heading"]}>Enter your OTP</h2>
            <p className={styles["auth-subcopy"]}>
              Use the email code for {clientCredentials.email || "your account"}.
              If the code expires, request a fresh{" "}
              {purpose === "reset-password" ? "password reset" : "sign-in"} attempt.
            </p>
          </div>

          <div className={style["otp-status-row"]}>
            <article className={style["status-chip"]}>
              <span>Time left</span>
              <strong>{formattedTime}</strong>
            </article>
            <article className={style["status-chip"]}>
              <span>Attempts</span>
              <strong>{tries}</strong>
            </article>
          </div>

          <div className={styles["login-form-container"]}>
            <form autoComplete="off" onSubmit={handleOnSubmit}>
              <div className={styles["input-elm"]}>
                <label htmlFor="email">Email address</label>
                <input
                  id="email"
                  type="text"
                  name="email"
                  placeholder="your email"
                  value={clientCredentials.email}
                  disabled
                />
              </div>

              <div className={styles["input-elm"]}>
                <label htmlFor="otp">Verification code</label>
                <input
                  id="otp"
                  type="text"
                  name="otp"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="Enter the 8-digit code"
                  onChange={handleOnChange}
                  value={clientCredentials.otp}
                  onFocus={onFocusTrigger}
                />
                {path && path === "otp" && errorMessage && (
                  <InvalidInputTracker
                    className={styles["invalid-input-tracker"]}
                    inputErrorString={errorMessage}
                  />
                )}
              </div>

              <div className={styles["btn-container"]}>
                <button
                  className={styles["primary-btn"]}
                  type="submit"
                  disabled={!clientCredentials.otp.trim()}
                >
                  Verify code
                </button>
              </div>

              <p className={styles["form-footer-note"]}>
                Keep this tab open while verifying so your auth session stays
                in sync.
              </p>
            </form>
          </div>
        </section>
      </section>
    </main>
  );
};
