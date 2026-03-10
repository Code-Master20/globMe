import { useEffect, useRef, useState } from "react";
import styles from "./LogInSignUp.module.css";
import style from "./LogIn.module.css";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { signUpOtpReceived } from "../../features/auth/authThunks";
import { InvalidInputTracker } from "../../components/InvalidInputTracker/InvalidInputTracker";
import { toast } from "react-toastify";
import { MdOutlineRemoveRedEye } from "react-icons/md";
import { FaRegEyeSlash } from "react-icons/fa6";

export const SignUp = () => {
  localStorage.removeItem("timeRemains");
  const navigate = useNavigate();
  const { errorMessage } = useSelector((state) => state.auth);

  //===================Receiving credentials from input fields for sending to the backend====================
  //==========================================handleOnChange=================================================
  const debounceRef = useRef({});

  const storedUser = JSON.parse(localStorage.getItem("user")) || null;
  const [clientCredentials, setClientCredentials] = useState({
    username: storedUser ? storedUser.username : "",
    email: storedUser ? storedUser.email : "",
    password: storedUser ? storedUser.password : "",
    purpose: storedUser ? storedUser.purpose : "signup",
  });

  function handleOnChange(event) {
    const { name, value } = event.target;

    if (debounceRef.current[name]) {
      clearTimeout(debounceRef.current[name]);
    }

    debounceRef.current[name] = setTimeout(() => {
      const formattedValue =
        name === "email"
          ? value.trim().toLowerCase()
          : name === "username"
            ? value.toLowerCase()
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
          purpose: "signup",
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

  //===========================sending inputted credentials to backend with a function=======================
  //==============================================handleOnSubmit=============================================
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();
  const [path, setPath] = useState(null);
  const [timerIdArr, setTimerIdArr] = useState([]);

  async function handleOnSubmit(event) {
    event.preventDefault();
    setLoading(true);

    //trimming only username just before sending to backend
    const trimCredentials = {
      ...clientCredentials,
      username: clientCredentials.username.trim(),
    };

    localStorage.setItem(
      "user",
      JSON.stringify({
        ...clientCredentials,
        username: clientCredentials.username.trim(),
      }),
    );

    const resultAction = await dispatch(signUpOtpReceived(trimCredentials));

    if (signUpOtpReceived.rejected.match(resultAction)) {
      setLoading(false);
      const error = resultAction.payload?.message;

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

      if (typeof error === "string") {
        console.log("string error");
      }

      if (
        typeof error === "object" &&
        Array.isArray(error.path) &&
        error.path[0].length > 0
      ) {
        setPath(error.path[0]);
      }
    }

    if (signUpOtpReceived.fulfilled.match(resultAction)) {
      setLoading(false);
      const success = resultAction.payload?.message;
      toast.success(success);

      navigate("/verify-otp", { replace: true });
    }
  }

  //========================================invalid input viewer handling====================================
  //===============================================onFocusTrigger============================================
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

  //=========================================navigate to log in page=========================================
  //=============================================handleNavigate==============================================
  function handleNavigate() {
    localStorage.removeItem("user");
    navigate("/login", { replace: true });
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

  return (
    <main className={styles["main-container-first"]}>
      <section className={styles["main-container-second"]}>
        <article className={styles["main-container-third"]}>
          <h1 className={styles["login-main-heading"]}>create account</h1>
          <div className={styles["login-form-container"]}>
            <form onSubmit={handleOnSubmit}>
              <div className={styles["input-elm"]}>
                <label htmlFor="username">Username :</label>
                <input
                  id="username"
                  type="text"
                  name="username"
                  placeholder="your username"
                  onChange={handleOnChange}
                  value={clientCredentials.username}
                  onFocus={onFocusTrigger}
                />

                {path && path === "username" && errorMessage && (
                  <InvalidInputTracker
                    className={styles["invalid-input-tracker"]}
                    inputErrorString={errorMessage.msg}
                  />
                )}
              </div>

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

              <div
                className={`${styles["input-elm"]} ${styles["password-input"]}`}
              >
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
                <button className={`${styles["sign-up-btn"]} `} type="submit">
                  sign-up
                </button>
                <button
                  className={style["log-in-btn"]}
                  type="button"
                  onClick={handleNavigate}
                >
                  log-in
                </button>
              </div>
            </form>
          </div>
        </article>
      </section>
    </main>
  );
};
