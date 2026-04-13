import { useNavigate } from "react-router-dom";
import { useState, useRef } from "react";
import { useDispatch } from "react-redux";
import styles from "./EditPassword.module.css";
import { resetPassViaOldPass } from "../../features/auth/authThunks";
import { InvalidInputTracker } from "../InvalidInputTracker/InvalidInputTracker";
import { toast } from "react-toastify";
import { checkMe } from "../../features/auth/authThunks";

export const ResetPassWithOldPass = ({ setOtpResetTrigger }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  function passRememberedNot() {
    setOtpResetTrigger(true);
    localStorage.setItem("otpResetTrigger", JSON.stringify(true));
  }

  // ✅ INITIAL STATE
  const [clientCredentials, setClientCredentials] = useState(() => {
    const storedUser = localStorage.getItem("user");

    return {
      email: storedUser ? JSON.parse(storedUser)?.email : "",
      password: "",
      newPassword: "",
    };
  });

  const debounceRef = useRef({});

  function handleOnChange(event) {
    let { name, value } = event.target;

    if (debounceRef.current[name]) {
      clearTimeout(debounceRef.current[name]);
    }

    // ✅ MATCH LOGIN LOGIC (TRIM PASSWORD + EMAIL)
    const formattedValue =
      name === "email"
        ? value.trim().toLowerCase()
        : name === "password" || name === "newPassword"
          ? value.trim()
          : value;

    // ✅ ONLY STORE EMAIL (SECURE)
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

  // ================= ERROR HANDLING =================
  const [inputErrorString, setInputErrorString] = useState("");
  const [path, setPath] = useState(null);
  const [timerArr, setTimerArr] = useState([]);

  function invalidView(immediateTrigger) {
    if (immediateTrigger) {
      setInputErrorString("");
      setPath(null);
    } else {
      const timer = setTimeout(() => {
        setInputErrorString("");
        setPath(null);
      }, 3000);

      setTimerArr((prev) => [...prev, timer]);

      for (let i = 0; i < timerArr.length - 1; i++) {
        clearTimeout(timerArr[i]);
      }
    }
  }

  // ================= SUBMIT =================
  const [loading, setLoading] = useState(false);

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
        message?.path.length > 0
      ) {
        invalidView(message?.msg);
        setPath(message?.path[0]);
        setInputErrorString(message?.msg);
      } else {
        setPath(null);
        setInputErrorString("");
        toast.warn(message);
      }
    }

    if (resetPassViaOldPass.fulfilled.match(resultAction)) {
      // ✅ CLEANUP
      localStorage.clear();

      setClientCredentials({
        email: "",
        password: "",
        newPassword: "",
      });

      await dispatch(checkMe());

      toast.success("Password exchanged successfully ✅");

      navigate("/home-feed", { replace: true });
    }
  }

  // ================= VIEW PASSWORD =================
  const [view, setView] = useState(false);

  function viewInputField() {
    setView(true);
    invalidView(true);
  }

  function hideInputField() {
    setView(false);
  }

  // ================= UI =================
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
              value={clientCredentials.email}
              disabled
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
            Don't want to alter your old password? Go back to login
          </p>
        </form>
      </section>
    </main>
  );
};
