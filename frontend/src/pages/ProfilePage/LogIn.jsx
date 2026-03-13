import { useEffect, useRef, useState } from "react";
import styles from "./LogInSignUp.module.css";
import style from "./SignUp.module.css";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { logInOtpReceived } from "../../features/auth/authThunks";
import { InvalidInputTracker } from "../../components/InvalidInputTracker/InvalidInputTracker";
import { toast } from "react-toastify";
import { MdOutlineRemoveRedEye } from "react-icons/md";
import { FaRegEyeSlash } from "react-icons/fa6";

export const LogIn = () => {
  localStorage.removeItem("timeRemains");

  const { errorMessage } = useSelector((state) => state.auth);

  //===================Receiving credentials from input fields for sending to the backend====================
  //===============================================handleOnChange============================================
  const storedUser = JSON.parse(localStorage.getItem("user")) || null; //extracting existing storedUser from localStorage

  const [clientCredentials, setClientCredentials] = useState({
    email: storedUser ? storedUser.email : "",
    password: storedUser ? storedUser.password : "",
    purpose: storedUser ? storedUser.purpose : "login",
  });

  const debounceRef = useRef({});

  function handleOnChange(event) {
    const { name, value } = event.target;

    if (debounceRef.current[name]) {
      clearTimeout(debounceRef.current[name]);
    }

    debounceRef.current[name] = setTimeout(() => {
      const formattedValue =
        name === "email"
          ? value.trim().toLowerCase()
          : name === "password"
            ? value.trim()
            : value;

      setClientCredentials((prev) => ({
        ...prev,
        [name]: formattedValue,
      }));

      //storing input field's credentials to localStorage
      setTimeout(() => {
        const storedUser = JSON.parse(localStorage.getItem("user")) || {
          purpose: "login",
        };
        localStorage.setItem(
          "user",
          JSON.stringify({
            ...storedUser,
            [name]: formattedValue,
          }),
        );
      }, 50);
    }, 50);
  }

  //========================sending inputted credentials to backend with a function==========================
  //===========================================handleOnSubmit================================================
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [path, setPath] = useState(null);
  const [timerIdArr, setTimerIdArr] = useState([]);
  const [tries, setTries] = useState(() => {
    const storedTries = localStorage.getItem("tries");
    return storedTries ? JSON.parse(storedTries) : 4;
  });
  const [showTries, setShowTries] = useState(() => {
    const storedTries = localStorage.getItem("tries");
    return storedTries && JSON.parse(storedTries) < 3;
  });

  async function handleOnSubmit(event) {
    event.preventDefault();
    setLoading(true);

    const resultAction = await dispatch(logInOtpReceived(clientCredentials));

    if (logInOtpReceived.rejected.match(resultAction)) {
      setLoading(false);
      const error = resultAction.payload.message;

      //auto vanish for timer ids except the last one, for invalid input pop-up
      const timer = setTimeout(() => {
        setPath(null);
      }, 5000);
      setTimerIdArr((prev) => [...prev, timer]);
      if (timerIdArr.length > 0) {
        for (let index = 0; index < timerIdArr.length; index++) {
          clearTimeout(timerIdArr[index]);
        }
      }

      //toast.warn trigger if error is string
      if (typeof error === "string") {
        console.log(error);
        toast.warn(error);

        setShowTries(true);
        setTries((prev) => {
          const updated = prev > 0 ? prev - 1 : 0;

          if (updated === 0) {
            localStorage.removeItem("tries");
            setShowTries(false);
          } else {
            localStorage.setItem("tries", JSON.stringify(updated));
          }

          return updated;
        });

        return;
      }

      //setting path to relavent input name if error is an object
      if (
        typeof error === "object" &&
        Array.isArray(error.path) &&
        error.path[0].length > 0
      ) {
        const field = error.path[0];
        setPath(field);
      }

      return;
    }

    if (logInOtpReceived.fulfilled.match(resultAction)) {
      setLoading(false);
      setClientCredentials({
        email: "",
        password: "",
        purpose: "login",
      });

      const success = resultAction.payload?.message;
      toast.success(success);
      navigate("/verify-otp", { replace: true });
    }
  }

  //========================================invalid input viewer handling====================================
  //================================================onFocusTrigger===========================================
  function onFocusTrigger(event) {
    if (event.target.name === path) {
      setPath(null);
    }
  }

  //==============================================password viewer============================================
  //==============================================handleInputView============================================
  const [view, setView] = useState(false);
  const timerRef = useRef(null);

  const inputType = view ? "text" : "password";

  function handleInputView() {
    setView((prev) => !prev);
  }

  useEffect(() => {
    if (view) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      timerRef.current = setTimeout(() => {
        setView(false);
      }, 4000);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [view]);

  //=========================================navigating to sign up page======================================
  //================================================handleNavigate===========================================
  function handleNavigate() {
    localStorage.removeItem("user");
    navigate("/signup", { replace: true });
  }

  //==========================loading viewing on every handleOnSubmit trigger==============================
  const email = "your email";
  if (loading) {
    return (
      <section className={styles["form-loading-state"]}>
        <h1>sending verification code to {clientCredentials.email || email}</h1>
      </section>
    );
  }

  //========================================main html content================================================
  return (
    <main className={styles["main-container-first"]}>
      {showTries && tries > 0 && (
        <section>
          <p>tries remaining: {tries}</p>
        </section>
      )}

      <section className={styles["main-container-second"]}>
        <article className={styles["main-container-third"]}>
          <h1 className={styles["login-main-heading"]}>please log in first</h1>
          <div className={styles["login-form-container"]}>
            <form autoComplete="off" onSubmit={handleOnSubmit}>
              <div className={styles["input-elm"]}>
                <label htmlFor="email">Email :</label>
                <input
                  id="email"
                  type="text"
                  name="email"
                  placeholder="your email"
                  onChange={handleOnChange}
                  value={clientCredentials.email}
                  onFocus={onFocusTrigger}
                />
                {path && path === "email" && errorMessage && (
                  <InvalidInputTracker
                    className={styles["invalid-input-tracker"]}
                    inputErrorString={errorMessage.msg}
                  />
                )}
              </div>

              <div className={styles["input-elm"]}>
                {view ? (
                  <span
                    className={styles["view-password"]}
                    onClick={handleInputView}
                  >
                    <MdOutlineRemoveRedEye className={styles["eye"]} />
                  </span>
                ) : (
                  <span
                    className={styles["view-password"]}
                    onClick={handleInputView}
                  >
                    <FaRegEyeSlash className={styles["eye"]} />
                  </span>
                )}
                <label htmlFor="password">Password :</label>
                <input
                  id="password"
                  type={inputType}
                  name="password"
                  placeholder="your password"
                  onChange={handleOnChange}
                  value={clientCredentials.password}
                  onFocus={onFocusTrigger}
                />
                {path && path === "password" && errorMessage && (
                  <InvalidInputTracker
                    className={styles["invalid-input-tracker"]}
                    inputErrorString={errorMessage.msg}
                  />
                )}
              </div>

              <div className={styles["btn-container"]}>
                <button className={styles["log-in-btn"]} type="submit">
                  log-in
                </button>
                <button
                  className={style["sign-up-btn"]}
                  type="button"
                  onClick={handleNavigate}
                >
                  sign-up
                </button>
              </div>
            </form>
          </div>
        </article>
      </section>
    </main>
  );
};
