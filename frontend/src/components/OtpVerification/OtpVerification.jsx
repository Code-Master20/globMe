import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import styles from "../../pages/ProfilePage/LogInSignUp.module.css";
import { useDispatch, useSelector } from "react-redux";
import {
  otpVerifiedAndLoggedIn,
  otpVerifiedAndSignedUp,
} from "../../features/auth/authThunks";
import { toast } from "react-toastify";
import { resetOtpLockState } from "../../features/auth/authSlice";
import { InvalidInputTracker } from "../InvalidInputTracker/InvalidInputTracker";

export const OtpVerification = () => {
  sessionStorage.removeItem("toastPopped");
  const hasRedirected = useRef(false);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const {
    user,
    isAuthenticated,
    purpose,
    formLoading,
    successMessage,
    errorMessage,
    id,
    success,
  } = useSelector((state) => state.auth);

  const storedUser = JSON.parse(localStorage.getItem("user"));
  const storedPurpose = JSON.parse(localStorage.getItem("purpose"));

  const [clientCredentials, setClientCredentials] = useState({
    email: storedUser ? storedUser.email : "",
    otp: "",
    purpose: storedPurpose ? storedPurpose : purpose,
  });

  useEffect(() => {
    if (user?.email) {
      setClientCredentials((prev) => ({
        ...prev,
        email: user.email,
      }));
    }

    if (!user?.email) {
      if (storedUser?.email) {
        setClientCredentials((prev) => ({
          ...prev,
          email: storedUser.email,
        }));
      }
    }
  }, [user]);

  const handleOnChange = async (e) => {
    const { name, value } = e.target;
    setClientCredentials((prev) => ({ ...prev, [name]: value }));
  };

  const [focus, setFocus] = useState(true);
  const [timerId, setTimerId] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setFocus(true);

    if (purpose === "signup" || storedPurpose === "signup") {
      const resultAction = await dispatch(
        otpVerifiedAndSignedUp(clientCredentials),
      );

      if (otpVerifiedAndSignedUp.rejected.match(resultAction)) {
        setLoading(false);
        const timer = setTimeout(() => {
          setFocus(false);
        }, 5000);
        setTimerId((prev) => [...prev, timer]);

        if (timerId.length > 1) {
          for (let index = 0; index < timerId.length; index++) {
            clearTimeout(timerId[index]);
          }
        }
      }

      if (otpVerifiedAndSignedUp.fulfilled.match(resultAction)) {
        setLoading(false);
        navigate("/home-feed", { replace: true });
      }
    }
    if (purpose === "login" || storedPurpose === "login") {
      const resultAction = await dispatch(
        otpVerifiedAndLoggedIn(clientCredentials),
      );

      if (otpVerifiedAndLoggedIn.rejected.match(resultAction)) {
        setLoading(false);
        const timer = setTimeout(() => {
          setFocus(false);
        }, 5000);
        setTimerId((prev) => [...prev, timer]);
        if (timerId.length > 1) {
          for (let index = 0; index < timerId.length; index++) {
            clearTimeout(timerId[index]);
          }
        }
      }

      if (otpVerifiedAndLoggedIn.fulfilled.match(resultAction)) {
        setLoading(false);
        navigate("/home-feed", { replace: true });
      }
    }
  };

  const handleFocus = (e) => {
    setFocus(false);

    for (let index = 0; index < timerId.length; index++) {
      clearTimeout(timerId[index + 1]);
    }
  };

  //otp expiry countdown
  const OTP_DURATION = 5 * 60 * 1000; // 5 minutes

  const [expiryTime, setExpiryTime] = useState(() => {
    const storedExpiry = localStorage.getItem("otpExpiry");

    if (storedExpiry) {
      return parseInt(storedExpiry);
    }

    const newExpiry = Date.now() + OTP_DURATION;
    localStorage.setItem("otpExpiry", newExpiry);
    console.log(newExpiry);

    return newExpiry;
  });

  const [timeLeft, setTimeLeft] = useState(
    Math.max(0, expiryTime - Date.now()),
  );

  const [otpExpired, setOtpExpired] = useState(false);
  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = Math.max(0, expiryTime - Date.now());
      setTimeLeft(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        localStorage.removeItem("otpExpiry");
        localStorage.removeItem("user");
        localStorage.removeItem("otp-sent");
        localStorage.removeItem("purpose");

        dispatch(resetOtpLockState());

        setOtpExpired(true);

        const redirectTimer = setTimeout(() => {
          navigate(purpose === "signup" ? "/signup" : "/login", {
            replace: true,
          });
        }, 2000);

        return () => clearTimeout(redirectTimer);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiryTime, dispatch, navigate, purpose]);

  const minutes = Math.floor(timeLeft / 60000);
  const seconds = Math.floor((timeLeft % 60000) / 1000);
  const formattedTime = `${minutes}:${seconds < 10 ? "0" : ""}${seconds} ${minutes === 0 ? "sec" : "min"}`;

  useEffect(() => {
    if (!id) return;

    if (hasRedirected.current) return;

    hasRedirected.current = true;

    const timer = setTimeout(() => {
      dispatch(resetOtpLockState());
      navigate(purpose === "signup" ? "/signup" : "/login", { replace: true });
    }, 2000);

    toast.warn(errorMessage);

    return () => clearTimeout(timer);
  }, [id, purpose, dispatch, navigate]);

  if (loading) {
    return (
      <section className={styles["form-loading-state"]}>
        <h1>verifying otp</h1>
      </section>
    );
  }

  if (id) {
    return (
      <section className={styles["form-loading-state"]}>
        <h1>
          To many tries with invalid otp. Redirecting to {purpose} page again
        </h1>
      </section>
    );
  }

  if (otpExpired) {
    return (
      <section className={styles["form-loading-state"]}>
        <h1>Otp Expired! redirecting to {purpose} page again!</h1>
      </section>
    );
  }

  return (
    <>
      <main className={styles["main-container-first-otp"]}>
        <section className={styles["count-down"]}>
          <p>Time Remains</p>
          <h1>{formattedTime}</h1>
        </section>
        <section className={styles["main-container-second"]}>
          <article className={styles["main-container-third"]}>
            <h1 className={styles["login-main-heading"]}>please verify otp</h1>
            <div className={styles["login-form-container"]}>
              <form autoComplete="off" onSubmit={handleSubmit}>
                <div className={styles["input-elm"]}>
                  <label htmlFor="email">Email :</label>
                  <input
                    id="email"
                    type="text"
                    name="email"
                    placeholder="your email"
                    value={clientCredentials.email}
                    onChange={handleOnChange}
                    disabled
                  />
                </div>

                <div className={styles["input-elm"]}>
                  <label htmlFor="otp">Otp :</label>
                  <input
                    id="otp"
                    type="text"
                    name="otp"
                    placeholder="Enter verification code"
                    value={clientCredentials.otp}
                    onChange={handleOnChange}
                    onFocus={(e) => handleFocus(e)}
                  />
                  {errorMessage && !id && focus && (
                    <InvalidInputTracker
                      className={styles["invalid-input-tracker"]}
                      inputErrorString={errorMessage}
                    />
                  )}
                </div>

                <div className={styles["btn-container"]}>
                  <button className={styles["log-in-btn"]} type="submit">
                    verify code
                  </button>
                </div>
              </form>
            </div>
          </article>
        </section>
      </main>
    </>
  );
};
