import { useNavigate } from "react-router-dom";
import { useRef, useState } from "react";
import { useDispatch } from "react-redux";
import styles from "./EditPassword.module.css";
import {
  checkMe,
  resetPassViaOldPass,
} from "../../store/auth/authThunks";
import { InvalidInputTracker } from "./InvalidInputTracker";
import { toast } from "react-toastify";

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

export const ResetPassWithOldPass = ({ setOtpResetTrigger }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  function passRememberedNot() {
    setOtpResetTrigger(true);
    localStorage.setItem("otpResetTrigger", JSON.stringify(true));
  }

  const [clientCredentials, setClientCredentials] = useState(() => {
    const storedUser = readStoredUser();

    return {
      email: getStoredText(storedUser, "email"),
      password: "",
      newPassword: "",
    };
  });

  const debounceRef = useRef({});

  function handleOnChange(event) {
    const { name, value } = event.target;
    const safeValue = normalizeTextInput(value);

    if (debounceRef.current[name]) {
      clearTimeout(debounceRef.current[name]);
    }

    const formattedValue =
      name === "email"
        ? safeValue.trim().toLowerCase()
        : name === "password" || name === "newPassword"
          ? safeValue.trim()
          : safeValue;

    if (name === "email") {
      localStorage.setItem(
        "user",
        JSON.stringify({
          email: formattedValue,
        }),
      );
    }

    debounceRef.current[name] = setTimeout(() => {
      setClientCredentials((prev) => ({
        ...prev,
        [name]: formattedValue,
      }));
    }, 5);
  }

  const [inputErrorString, setInputErrorString] = useState("");
  const [path, setPath] = useState(null);
  const [timerArr, setTimerArr] = useState([]);
  const [loading, setLoading] = useState(false);

  function invalidView(immediateTrigger) {
    if (immediateTrigger) {
      setInputErrorString("");
      setPath(null);
      return;
    }

    const timer = setTimeout(() => {
      setInputErrorString("");
      setPath(null);
    }, 3000);

    setTimerArr((prev) => [...prev, timer]);

    for (let i = 0; i < timerArr.length - 1; i += 1) {
      clearTimeout(timerArr[i]);
    }
  }

  async function handleOnSubmit(event) {
    event.preventDefault();
    setLoading(true);

    const resultAction = await dispatch(resetPassViaOldPass(clientCredentials));

    setLoading(false);

    if (resetPassViaOldPass.rejected.match(resultAction)) {
      const message = resultAction?.payload?.message;

      if (
        message &&
        typeof message === "object" &&
        Array.isArray(message.path) &&
        message.path.length > 0
      ) {
        invalidView(true);
        setPath(message.path[0]);
        setInputErrorString(message.msg);
      } else {
        setPath(null);
        setInputErrorString("");
        toast.warn(message);
      }

      return;
    }

    if (resetPassViaOldPass.fulfilled.match(resultAction)) {
      localStorage.removeItem("user");
      localStorage.removeItem("otpResetTrigger");
      localStorage.removeItem("tries");
      localStorage.removeItem("timeRemains");
      localStorage.removeItem("tryPassReset");
      localStorage.removeItem("tryRemains");
      localStorage.removeItem("runCount");

      setClientCredentials({
        email: "",
        password: "",
        newPassword: "",
      });

      await dispatch(checkMe());

      toast.success("Password changed successfully.");

      navigate("/home-feed", { replace: true });
    }
  }

  const [view, setView] = useState(false);

  function viewInputField() {
    setView(true);
    invalidView(true);
  }

  function hideInputField() {
    setView(false);
  }

  return (
    <main className={styles.container}>
      <section className={styles.card}>
        <article className={styles.topSwitch}>
          <button onClick={passRememberedNot} className={styles.switchBtn}>
            Old password not remembered? <span>Reset via OTP</span>
          </button>
        </article>

        <h1 className={styles.heading}>Change Password</h1>

        <form className={styles.form} onSubmit={handleOnSubmit}>
          <fieldset className={styles.fieldset}>
            <legend className={styles.legend}>Your Email</legend>
            <input
              type="text"
              className={styles.input}
              name="email"
              placeholder="Enter your email"
              onChange={handleOnChange}
              value={clientCredentials.email}
            />
          </fieldset>

          <fieldset className={styles.fieldset}>
            <legend className={styles.legend}>Old Password</legend>
            <input
              type={view ? "text" : "password"}
              className={styles.input}
              name="password"
              onChange={handleOnChange}
              value={clientCredentials.password}
              onFocus={viewInputField}
              onBlur={hideInputField}
            />
            {path === "password" && (
              <InvalidInputTracker
                className={styles.errorTracker}
                inputErrorString={inputErrorString}
              />
            )}
          </fieldset>

          <fieldset className={styles.fieldset}>
            <legend className={styles.legend}>New Password</legend>
            <input
              type={view ? "text" : "password"}
              className={styles.input}
              name="newPassword"
              onChange={handleOnChange}
              value={clientCredentials.newPassword}
              onFocus={viewInputField}
              onBlur={hideInputField}
            />
            {path === "newPassword" && (
              <InvalidInputTracker
                className={styles.errorTracker}
                inputErrorString={inputErrorString}
              />
            )}
          </fieldset>

          <button className={styles.button} type="submit" disabled={loading}>
            {loading ? "Exchanging password..." : "Exchange Password"}
          </button>

          <p className={styles.link} onClick={() => navigate("/login")}>
            Don&apos;t want to alter your old password? Go back to login
          </p>
        </form>
      </section>
    </main>
  );
};
