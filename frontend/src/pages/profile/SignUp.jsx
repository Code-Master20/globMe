import { useEffect, useRef, useState } from "react";
import styles from "./LogInSignUp.module.css";
import style from "./SignUp.module.css";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { signUpOtpReceived } from "../../features/auth/authThunks";
import { InvalidInputTracker } from "../../components/forms/InvalidInputTracker";
import { toast } from "react-toastify";
import { MdOutlineRemoveRedEye } from "react-icons/md";
import { FaRegEyeSlash } from "react-icons/fa6";
import globMe from "../../assets/globme.png";

export const SignUp = () => {
  localStorage.removeItem("timeRemains");
  const navigate = useNavigate();
  const { errorMessage } = useSelector((state) => state.auth);

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

      setTimeout(() => {
        const existingUser = JSON.parse(localStorage.getItem("user")) || {
          purpose: "signup",
        };

        localStorage.setItem(
          "user",
          JSON.stringify({
            ...existingUser,
            [name]: formattedValue,
          }),
        );
      }, 1);
    }, 5);
  }

  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();
  const [path, setPath] = useState(null);
  const [timerIdArr, setTimerIdArr] = useState([]);

  async function handleOnSubmit(event) {
    event.preventDefault();
    setLoading(true);

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

      const timer = setTimeout(() => {
        setPath(null);
      }, 5000);
      setTimerIdArr((prev) => [...prev, timer]);
      if (timerIdArr.length > 0) {
        for (let index = 0; index < timerIdArr.length; index++) {
          clearTimeout(timerIdArr[index]);
        }
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
      toast.success(resultAction.payload?.message);
      navigate("/verify-otp", { replace: true });
    }
  }

  function onFocusTrigger(event) {
    if (event.target.name === path) {
      setPath(null);
    }
  }

  const [view, setView] = useState(false);
  const timerRef = useRef(null);
  const passwordInputRef = useRef(null);
  const inputType = view ? "text" : "password";

  function handleInputView() {
    setView((prev) => !prev);
    requestAnimationFrame(() => {
      passwordInputRef.current?.focus();
      const cursorPos = passwordInputRef.current?.value?.length ?? 0;
      passwordInputRef.current?.setSelectionRange?.(cursorPos, cursorPos);
    });
  }

  useEffect(() => {
    if (view) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      timerRef.current = setTimeout(() => {
        setView(false);
      }, 20000);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [view]);

  function handleNavigate() {
    localStorage.removeItem("user");
    navigate("/login", { replace: true });
  }

  const loadingEmail = "your email";
  if (loading) {
    return (
      <section className={styles["auth-loading-state"]}>
        <div className={styles["auth-loading-card"]}>
          <img src={globMe} alt="globMe" className={styles["loading-logo"]} />
          <p className={styles["loading-kicker"]}>Creating your account</p>
          <h1>Sending a verification code to {clientCredentials.email || loadingEmail}</h1>
          <span className={styles["loading-glow"]}></span>
        </div>
      </section>
    );
  }

  return (
    <main className={styles["auth-page"]}>
      <section className={styles["auth-shell"]}>
        <aside className={styles["auth-brand-panel"]}>
          <div className={styles["brand-badge"]}>Join globMe</div>
          <img src={globMe} alt="globMe" className={styles["brand-logo"]} />
          <h1 className={styles["brand-title"]}>Build a profile with a wider horizon.</h1>
          <p className={styles["brand-copy"]}>
            Create your account to discover nearby people, follow stories, and
            turn shared curiosity into new friendships.
          </p>
          <div className={styles["brand-highlights"]}>
            <div>
              <span>Easy onboarding</span>
              <p>Just a username, email, password, and one verification step.</p>
            </div>
            <div>
              <span>Privacy first</span>
              <p>Your account is activated only after confirming your email.</p>
            </div>
          </div>
        </aside>

        <section className={styles["auth-card"]}>
          <div className={styles["auth-card-header"]}>
            <p className={styles["auth-kicker"]}>New here?</p>
            <h2 className={styles["auth-heading"]}>Create your account</h2>
            <p className={styles["auth-subcopy"]}>
              Choose a recognizable username and a strong password. We will send
              an OTP to verify your email.
            </p>
          </div>

          <div className={styles["login-form-container"]}>
            <form onSubmit={handleOnSubmit}>
              <div className={styles["input-elm"]}>
                <label htmlFor="username">Username</label>
                <input
                  id="username"
                  type="text"
                  name="username"
                  autoComplete="username"
                  placeholder="Choose a username"
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
                <label htmlFor="email">Email address</label>
                <input
                  id="email"
                  type="email"
                  name="email"
                  autoComplete="email"
                  inputMode="email"
                  placeholder="name@example.com"
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
                className={`${styles["input-elm"]} ${styles["password-field"]}`}
              >
                <label htmlFor="password">Password</label>
                <button
                  type="button"
                  className={styles["password-toggle"]}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={handleInputView}
                  aria-label={view ? "Hide password" : "Show password"}
                  aria-pressed={view}
                  title={view ? "Hide password" : "Show password"}
                >
                  {view ? (
                    <FaRegEyeSlash className={styles["eye"]} />
                  ) : (
                    <MdOutlineRemoveRedEye className={styles["eye"]} />
                  )}
                </button>
                <input
                  id="password"
                  ref={passwordInputRef}
                  type={inputType}
                  name="password"
                  autoComplete="new-password"
                  placeholder="Create a password"
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
                <button
                  className={styles["primary-btn"]}
                  type="submit"
                  disabled={
                    !clientCredentials.username.trim() ||
                    !clientCredentials.email.trim() ||
                    !clientCredentials.password.trim()
                  }
                >
                  Send verification code
                </button>
                <button
                  className={style["secondary-btn"]}
                  type="button"
                  onClick={handleNavigate}
                >
                  Back to log in
                </button>
              </div>

              <p className={styles["form-footer-note"]}>
                Your account stays inactive until the verification code is
                confirmed.
              </p>
            </form>
          </div>
        </section>
      </section>
    </main>
  );
};
