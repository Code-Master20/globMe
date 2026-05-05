import { useEffect, useRef, useState } from "react";
import styles from "./LogInSignUp.module.css";
import style from "./SignUp.module.css";
import stylie from "./LogIn.module.css";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { logInOtpReceived } from "../../store/auth/authThunks";
import { InvalidInputTracker } from "../../components/auth/InvalidInputTracker";
import { toast } from "react-toastify";
import { MdOutlineRemoveRedEye } from "react-icons/md";
import { FaRegEyeSlash } from "react-icons/fa6";
import globMe from "../../assets/globme.png";

export const LogIn = () => {
  const { errorMessage } = useSelector((state) => state.auth);

  const storedUser = JSON.parse(localStorage.getItem("user")) || null;

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

      setTimeout(() => {
        const existingUser = JSON.parse(localStorage.getItem("user")) || {
          purpose: "login",
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
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [path, setPath] = useState(null);
  const [timerIdArr, setTimerIdArr] = useState([]);
  const [countdown, setCountdown] = useState(null);
  const [hydrated, setHydrated] = useState(false);
  const [tries, setTries] = useState(() => {
    const storedTries = localStorage.getItem("tryRemains");
    return storedTries ? JSON.parse(storedTries) : 3;
  });

  useEffect(() => {
    localStorage.removeItem("timeRemains");
  }, []);

  useEffect(() => {
    const storedTime = localStorage.getItem("time-remains");

    if (storedTime) {
      const parsed = Number(JSON.parse(storedTime));
      setCountdown(parsed > 0 ? parsed : null);
    } else {
      setCountdown(null);
    }

    setHydrated(true);
  }, []);

  async function handleOnSubmit(event) {
    event.preventDefault();
    setLoading(true);

    const resultAction = await dispatch(logInOtpReceived(clientCredentials));

    if (logInOtpReceived.rejected.match(resultAction)) {
      setLoading(false);
      const error = resultAction.payload.message;

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
        setTries((prev) => {
          if (prev <= 0) return 0;
          return prev - 1;
        });

        if (tries && error.includes("Too many failed attempts")) {
          toast.warn("Invalid email or password.");
          return;
        }
        toast.warn(error);
        return;
      }

      if (
        typeof error === "object" &&
        Array.isArray(error.path) &&
        error.path[0].length > 0
      ) {
        setPath(error.path[0]);
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

      toast.success(resultAction.payload?.message);
      navigate("/verify-otp", { replace: true });
    }
  }

  const [disable, setDisable] = useState(false);
  const [tryPassReset, setTryPassReset] = useState(() => {
    return JSON.parse(localStorage.getItem("tryPassReset")) || false;
  });
  const runCountRef = useRef(JSON.parse(localStorage.getItem("runCount")) || 0);

  useEffect(() => {
    localStorage.setItem("tryRemains", JSON.stringify(tries));

    if (tries === 0) {
      trackTime();
    }

    let timer;

    if (tries === 2 && runCountRef.current < 1) {
      timer = setTimeout(() => {
        runCountRef.current += 1;
        localStorage.setItem("runCount", JSON.stringify(runCountRef.current));
        localStorage.setItem("tryPassReset", JSON.stringify(true));
        setTryPassReset(true);
      }, 500);
    }

    if (tries === 1 && runCountRef.current < 3) {
      timer = setTimeout(() => {
        runCountRef.current += 1;
        localStorage.setItem("runCount", JSON.stringify(runCountRef.current));
        localStorage.setItem("tryPassReset", JSON.stringify(true));
        setTryPassReset(true);
      }, 500);
    }

    return () => clearTimeout(timer);
  }, [tries]);

  function resetCancel() {
    localStorage.removeItem("tryPassReset");
    runCountRef.current += 1;
    localStorage.setItem("runCount", JSON.stringify(runCountRef.current));
    setTryPassReset(false);
  }

  function passReset() {
    localStorage.setItem("otpResetTrigger", JSON.stringify(true));
    navigate("/reset-password");
  }

  async function trackTime() {
    if (tries === 0) {
      setDisable(true);
      const time = await dispatch(logInOtpReceived(clientCredentials));

      if (logInOtpReceived.rejected.match(time)) {
        const error = time.payload.message;
        if (!error.includes("Too many failed attempts")) {
          setCountdown(0);
        }
        if (error.includes("Too many failed attempts")) {
          const match = error.match(/(\d+)m\s*(\d+)s/);
          if (match) {
            const minutes = Number(match[1]);
            const seconds = Number(match[2]);
            setCountdown(minutes * 60 + seconds);
          }
        }
      }
    }
  }

  useEffect(() => {
    if (countdown === null) return;

    if (countdown === 0) {
      console.clear();
      setDisable(false);
      localStorage.removeItem("runCount");
      runCountRef.current = 0;
      localStorage.setItem("tryRemains", JSON.stringify(3));
      setTries(3);
      return;
    }

    const timer = setInterval(() => {
      trackTime();
    }, 800);

    return () => clearInterval(timer);
  }, [countdown]);

  const minutes = countdown !== null ? Math.floor(countdown / 60) : 0;
  const seconds = countdown !== null ? countdown % 60 : 0;

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
    navigate("/signup", { replace: true });
  }

  const loadingEmail = "your email";
  if (!hydrated) return null;

  if (loading) {
      return (
        <section className={styles["auth-loading-state"]}>
          <div className={styles["auth-loading-card"]}>
            <img src={globMe} alt="globMe" className={styles["loading-logo"]} />
            <p className={styles["loading-kicker"]}>Signing you in</p>
            <h1 className={styles["loading-title"]}>Sending your verification code</h1>
            <p className={styles["loading-email"]}>
              {clientCredentials.email || loadingEmail}
            </p>
            <p className={styles["loading-copy"]}>
              Check your inbox in a moment and keep this tab open while we
              prepare the next step.
            </p>
            <span className={styles["loading-glow"]}></span>
          </div>
        </section>
      );
  }

  return (
    <main className={styles["auth-page"]}>
      {tryPassReset && (
        <section className={stylie["reset-overlay"]}>
          <div className={stylie["reset-overlay-card"]}>
            <p className={stylie["overlay-kicker"]}>Need a different path?</p>
            <h1>Use password reset if you no longer remember your password.</h1>
            <div className={stylie["overlay-actions"]}>
              <button className={stylie["cancel"]} onClick={resetCancel}>
                Cancel
              </button>
              <button className={stylie["reset"]} onClick={passReset}>
                Reset Password
              </button>
            </div>
          </div>
        </section>
      )}

      <section className={styles["auth-shell"]}>
        <aside className={styles["auth-brand-panel"]}>
          <div className={styles["brand-badge"]}>globMe</div>
          <img src={globMe} alt="globMe" className={styles["brand-logo"]} />
          <h1 className={styles["brand-title"]}>Meet people beyond your map.</h1>
          <p className={styles["brand-copy"]}>
            Log in to continue your world-wise conversations, profile updates,
            and friend discoveries in one place.
          </p>
          <div className={styles["brand-highlights"]}>
            <div>
              <span>Private sign-in</span>
              <p>Protected by email verification before access is granted.</p>
            </div>
            <div>
              <span>Fast recovery</span>
              <p>Reset guidance appears automatically when sign-in gets stuck.</p>
            </div>
          </div>
        </aside>

        <section className={styles["auth-card"]}>
          <div className={styles["auth-card-header"]}>
            <p className={styles["auth-kicker"]}>Welcome back</p>
            <h2 className={styles["auth-heading"]}>Log in to your account</h2>
            <p className={styles["auth-subcopy"]}>
              Enter your email and password. We will send an OTP before
              completing sign-in.
            </p>
          </div>

          {tries > 0 ? (
            <section className={stylie["status-banner"]}>
              <span className={stylie["status-label"]}>Attempts left</span>
              <strong>{tries}</strong>
            </section>
          ) : countdown > 0 ? (
            <section
              className={`${stylie["status-banner"]} ${stylie["status-warning"]}`}
            >
              <span className={stylie["status-label"]}>Session temporarily blocked</span>
              <strong>
                {minutes}m {seconds}s
              </strong>
              <p>{clientCredentials.email}</p>
            </section>
          ) : null}

          <div className={styles["login-form-container"]}>
            <form autoComplete="off" onSubmit={handleOnSubmit}>
              <div className={styles["input-elm"]}>
                <label htmlFor="email">Email address</label>
                <input
                  id="email"
                  type="email"
                  name="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="name@example.com"
                  onChange={handleOnChange}
                  value={clientCredentials.email}
                  onFocus={onFocusTrigger}
                  disabled={disable}
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
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  onChange={handleOnChange}
                  value={clientCredentials.password}
                  onFocus={onFocusTrigger}
                  disabled={disable}
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
                    disable ||
                    !clientCredentials.email.trim() ||
                    !clientCredentials.password.trim()
                  }
                >
                  Continue with OTP
                </button>
                <button
                  className={style["secondary-btn"]}
                  type="button"
                  onClick={handleNavigate}
                >
                  Create account
                </button>
              </div>

              <p className={styles["form-footer-note"]}>
                You will only be signed in after verifying the code sent to your
                email.
              </p>
            </form>
          </div>
        </section>
      </section>
    </main>
  );
};
