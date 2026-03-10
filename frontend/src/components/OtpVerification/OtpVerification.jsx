import style from "./OtpVerification.module.css";
import { useEffect, useState, useRef } from "react";
import { Navigate, replace, useNavigate } from "react-router-dom";
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
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { errorMessage, id } = useSelector((state) => state.auth);
  //=======================receiving credentials from input fields for sending to backend====================
  //============================================handleOnChange===============================================
  const storedUser = JSON.parse(localStorage.getItem("user")) || null;
  const [clientCredentials, setClientCredentials] = useState({
    email: storedUser ? storedUser.email : "",
    otp: storedUser?.otp ? storedUser.otp : "",
    purpose: storedUser ? storedUser.purpose : "",
  });
  const debounceRef = useRef(null);

  function handleOnChange(event) {
    let { name, value } = event.target;

    // update input instantly
    setClientCredentials((prev) => ({
      ...prev,
      [name]: value.trim(),
    }));

    // debounce only localStorage
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      const storedUser = JSON.parse(localStorage.getItem("user")) || {};
      localStorage.setItem(
        "user",
        JSON.stringify({
          ...storedUser,
          otp: value.trim(),
        }),
      );
    }, 1000);
  }

  //========================sending inputted credentials to backend with a function==========================
  //=======================================handleOnSubmit====================================================
  const storedTries = JSON.parse(localStorage.getItem("tries")) || 5;
  const storedTimes = JSON.parse(localStorage.getItem("timeRemains")) || 300;

  const [loading, setLoading] = useState(false);
  const [path, setPath] = useState(null);
  const [timerIdArr, setTimerIdArr] = useState([]);
  const purpose = storedUser ? storedUser.purpose : null;
  const [redirect, setRedirect] = useState(false);
  const [tries, setTries] = useState(storedTries);
  const [timeRemains, setTimeRemains] = useState(storedTimes);

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
      // removing otp from localStorage before redirecting user to prev page
      delete storedUser?.otp;
      localStorage.setItem("user", JSON.stringify(storedUser));

      toast.warn(error);
      setRedirect((prev) => !prev);
      const timer = setTimeout(() => {
        navigate(`/${purpose}`, { replace: true });
      }, 4000);
    }
  }

  async function handleOnSubmit(event) {
    event.preventDefault();
    setLoading(true);

    //verifying otp for log-in success
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
        localStorage.removeItem("user");
        localStorage.removeItem("timeRemains");
        const success = resultAction.payload?.message;
        toast.success(success);
      }
    }

    //verifying otp for sign-up success
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
        const success = resultAction.payload?.message;
        toast.success(success);
        localStorage.removeItem("user");
        localStorage.removeItem("timeRemains");
      }
    }
  }

  //====================redirecting user if opt is not valid or otp expired==================================

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
      toast.warn("otp expired! please request a new otp");
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

  let formatedTime =
    min < 1 ? minutes + ":" + seconds + "sec" : minutes + ":" + seconds + "min";

  //========================================invalid input viewer handling====================================
  //===============================================onFocusTrigger============================================
  function onFocusTrigger(event) {
    if (event.target.name === path) {
      setPath(null);
    }
  }

  //==========================loading viewing on every handleOnSubmit trigger==============================

  if (loading) {
    return (
      <section className={styles["form-loading-state"]}>
        <h1>verifying otp....</h1>
        <span className={style["loader"]}></span>;
      </section>
    );
  }

  //=====================================redirecting viewing on screen for user==============================
  if (redirect) {
    return (
      <section className={styles["form-loading-state"]}>
        <h1>returning to {purpose || "previous"} page again</h1>
      </section>
    );
  }

  return (
    <>
      <main className={styles["main-container-first-otp"]}>
        <section className={style["count-down"]}>
          <p>Time Remains</p>
          <h1>{formatedTime}</h1>
        </section>
        <section className={styles["main-container-second"]}>
          <article className={style["try-remains"]}>
            <p>Try Remains</p>
            <h1>{tries}</h1>
          </article>
          <article className={styles["main-container-third"]}>
            <h1 className={styles["login-main-heading"]}>please verify otp</h1>
            <div className={styles["login-form-container"]}>
              <form autoComplete="off" onSubmit={handleOnSubmit}>
                <div className={styles["input-elm"]}>
                  <label htmlFor="email">Email :</label>
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
                  <label htmlFor="otp">Otp :</label>
                  <input
                    id="otp"
                    type="text"
                    name="otp"
                    placeholder="Enter verification code"
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
