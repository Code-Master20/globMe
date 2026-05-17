import { useEffect, useRef, useState } from "react";
import styles from "./LogInSignUp.module.css";
import style from "./SignUp.module.css";
import stylie from "./LogIn.module.css";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { logInOtpReceived } from "../../store/auth/authThunks";
import { InvalidInputTracker } from "../../components/auth/InvalidInputTracker";
import { usePageMetadata } from "../../hooks/usePageMetadata";
import { toast } from "react-toastify";
import { MdOutlineRemoveRedEye } from "react-icons/md";
import { IoClose } from "react-icons/io5";
import { FaRegEyeSlash } from "react-icons/fa6";
import globMe from "../../assets/globme.png";

const BLOCKED_STORAGE_KEY = "login-block-countdown";

const readStoredUser = () => {
  try {
    const rawValue = localStorage.getItem("user");

    if (!rawValue) {
      return null;
    }

    const parsedValue = JSON.parse(rawValue);

    return parsedValue && typeof parsedValue === "object" ? parsedValue : null;
  } catch {
    return null;
  }
};

const getStoredText = (source, key, fallback = "") =>
  typeof source?.[key] === "string" ? source[key] : fallback;

const normalizeTextInput = (value) => `${value ?? ""}`;

const parseBlockedCountdown = (message) => {
  if (typeof message !== "string") {
    return null;
  }

  const match = message.match(/(\d+)m\s*(\d+)s/);

  if (!match) {
    return null;
  }

  const minutes = Number(match[1]);
  const seconds = Number(match[2]);
  return minutes * 60 + seconds;
};

const readStoredBlockedCountdown = () => {
  const storedTime = localStorage.getItem(BLOCKED_STORAGE_KEY);

  if (!storedTime) {
    return null;
  }

  const parsed = Number(JSON.parse(storedTime));
  return parsed > 0 ? parsed : null;
};

export const LogIn = () => {
  usePageMetadata({
    title: "Log in",
    description:
      "Log in to globMe to react, connect with people, and manage your profile.",
    robots: "noindex, nofollow",
  });

  const { errorMessage } = useSelector((state) => state.auth);

  const storedUser = readStoredUser();

  const [clientCredentials, setClientCredentials] = useState({
    email: getStoredText(storedUser, "email"),
    password: getStoredText(storedUser, "password"),
    purpose: getStoredText(storedUser, "purpose", "login"),
  });

  function handleOnChange(event) {
    const { name, value } = event.target;
    const safeValue = normalizeTextInput(value);
    const formattedValue =
      name === "email"
        ? safeValue.trim()
        : name === "password"
          ? safeValue.trim()
          : safeValue;

    setClientCredentials((prev) => ({
      ...prev,
      [name]: formattedValue,
    }));

    const existingUser = readStoredUser() || {
      purpose: "login",
    };
    localStorage.setItem(
      "user",
      JSON.stringify({
        ...existingUser,
        [name]: formattedValue,
      }),
    );
  }

  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [path, setPath] = useState(null);
  const [timerIdArr, setTimerIdArr] = useState([]);
  const [countdown, setCountdown] = useState(() => readStoredBlockedCountdown());
  const [disable, setDisable] = useState(() => readStoredBlockedCountdown() > 0);
  const [tries, setTries] = useState(() => {
    const storedTries = localStorage.getItem("tryRemains");
    return storedTries ? JSON.parse(storedTries) : 3;
  });

  useEffect(() => {
    if (countdown === null) return;
    setDisable(countdown > 0);
  }, [countdown]);

  async function handleOnSubmit(event) {
    event.preventDefault();
    setLoading(true);

    const normalizedCredentials = {
      ...clientCredentials,
      email: `${clientCredentials.email ?? ""}`.trim().toLowerCase(),
      password: `${clientCredentials.password ?? ""}`.trim(),
    };

    localStorage.setItem(
      "user",
      JSON.stringify({
        ...(readStoredUser() || { purpose: "login" }),
        ...normalizedCredentials,
      }),
    );

    const resultAction = await dispatch(logInOtpReceived(normalizedCredentials));

    if (logInOtpReceived.rejected.match(resultAction)) {
      setLoading(false);
      const error = resultAction.payload.message;
      const status = resultAction.payload.status;

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
        if (status === 429 || error.includes("Too many failed attempts")) {
          const blockedCountdown = parseBlockedCountdown(error);

          setDisable(true);
          setTries(0);
          setCountdown(blockedCountdown);

          if (blockedCountdown) {
            localStorage.setItem(
              BLOCKED_STORAGE_KEY,
              JSON.stringify(blockedCountdown),
            );
          }

          toast.warn(error);
          return;
        }

        setTries((prev) => {
          if (prev <= 0) return 0;
          return prev - 1;
        });

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

  const [tryPassReset, setTryPassReset] = useState(() => {
    return JSON.parse(localStorage.getItem("tryPassReset")) || false;
  });
  const runCountRef = useRef(JSON.parse(localStorage.getItem("runCount")) || 0);

  useEffect(() => {
    if (countdown === null) {
      localStorage.setItem("tryRemains", JSON.stringify(tries));
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
  }, [tries, countdown]);

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

  useEffect(() => {
    if (countdown === null) return;

    if (countdown === 0) {
      setDisable(false);
      setCountdown(null);
      localStorage.removeItem(BLOCKED_STORAGE_KEY);
      localStorage.removeItem("runCount");
      runCountRef.current = 0;
      localStorage.setItem("tryRemains", JSON.stringify(3));
      setTries(3);
      return;
    }

    const timer = setTimeout(() => {
      setCountdown((prev) => {
        if (prev === null) return null;

        const nextValue = prev - 1;

        if (nextValue > 0) {
          localStorage.setItem(BLOCKED_STORAGE_KEY, JSON.stringify(nextValue));
          return nextValue;
        }

        localStorage.removeItem(BLOCKED_STORAGE_KEY);
        return 0;
      });
    }, 1000);

    return () => clearTimeout(timer);
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

  function handleMobileExit() {
    localStorage.removeItem("user");
    navigate("/home-feed", { replace: true });
  }

  const loadingEmail = "your email";

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
          <button
            type="button"
            className={styles["mobile-auth-close"]}
            onClick={handleMobileExit}
            aria-label="Close login"
          >
            <IoClose />
          </button>
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
                    !`${clientCredentials.email ?? ""}`.trim() ||
                    !`${clientCredentials.password ?? ""}`.trim()
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
