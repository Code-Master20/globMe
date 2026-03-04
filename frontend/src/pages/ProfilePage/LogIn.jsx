import { useState, useEffect, useRef } from "react";
import styles from "./LogInSignUp.module.css";
import style from "./SignUp.module.css";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { logInOtpReceived } from "../../features/auth/authThunks";
import { InvalidInputTracker } from "../../components/InvalidInputTracker/InvalidInputTracker";
import { toast } from "react-toastify";

export const LogIn = () => {
  const storedOtp = localStorage.getItem("otp-sent");
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const { user, successMessage, isAuthenticated, otp, errorMessage } =
    useSelector((state) => state.auth);

  const [clientCredentials, setClientCredentials] = useState({
    email: "",
    password: "",
  });

  const handleOnChange = (e) => {
    let { name, value } = e.target;
    setClientCredentials((prev) => ({ ...prev, [name]: value }));
  };

  const [path, setPath] = useState("");
  const [timerIdArr, setTimerIdArr] = useState([]);

  const activeAccountNotFoundToast = (accountNotFoundError) => {
    toast.warn(accountNotFoundError);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const trimedClientCredentials = {
      email: clientCredentials.email.trim().toLowerCase(),
      password: clientCredentials.password.trim(),
    };

    const resultAction = await dispatch(
      logInOtpReceived(trimedClientCredentials),
    );

    if (logInOtpReceived.rejected.match(resultAction)) {
      setLoading(false); // stop loading
      const error = resultAction.payload?.message;
      let id = setTimeout(() => {
        setPath("");
      }, 5000);
      setTimerIdArr((prev) => [...prev, id]);

      //clearing all timerId except the last one
      if (timerIdArr.length > 1) {
        for (let index = 0; index < timerIdArr.length; index++) {
          clearTimeout(timerIdArr[index]);
        }
      }

      if (typeof error === "string") {
        activeAccountNotFoundToast(error);
      }

      if (
        error &&
        typeof error === "object" &&
        Array.isArray(error.path) &&
        error.path.length > 0
      ) {
        const field = error.path[0];
        setPath(field);
      }

      return; // ⛔ stop further execution
    }

    if (logInOtpReceived.fulfilled.match(resultAction)) {
      setLoading(false);
      navigate("/verify-otp", { replace: true });

      setClientCredentials((prev) => ({
        ...prev,
        email: "",
        password: "",
      }));
    }
  };

  const handleFocus = (e) => {
    if (path === e.target.name) {
      setPath("");
    }
  };

  useEffect(() => {
    if (loading) {
      const timer = setTimeout(() => {
        setPath("");
      }, 5000);
      setTimerIdArr((prev) => [...prev, timer]);
    }
  }, [loading]);

  useEffect(() => {
    if (successMessage) {
      setTimeout(() => {
        toast.success(successMessage);
      }, 600);
    }
  }, [successMessage]);

  const email = "email";
  if (loading) {
    return (
      <section className={styles["form-loading-state"]}>
        <h1>
          sending otp to{" "}
          {clientCredentials.email ? clientCredentials.email : email}
        </h1>
      </section>
    );
  }

  return (
    <main className={styles["main-container-first"]}>
      <section className={styles["main-container-second"]}>
        <article className={styles["main-container-third"]}>
          <h1 className={styles["login-main-heading"]}>please log in first</h1>
          <div className={styles["login-form-container"]}>
            <form onSubmit={handleSubmit} autoComplete="off">
              <div className={styles["input-elm"]}>
                <label htmlFor="email">Email :</label>
                <input
                  id="email"
                  type="text"
                  name="email"
                  placeholder="your email"
                  value={clientCredentials.email}
                  onChange={handleOnChange}
                  onFocus={handleFocus}
                />
                {path === "email" && errorMessage?.msg && (
                  <InvalidInputTracker
                    className={styles["invalid-input-tracker"]}
                    inputErrorString={errorMessage.msg}
                  />
                )}
              </div>

              <div className={styles["input-elm"]}>
                <label htmlFor="password">Password :</label>
                <input
                  id="password"
                  type="password"
                  name="password"
                  placeholder="your password"
                  value={clientCredentials.password}
                  onChange={handleOnChange}
                  onFocus={handleFocus}
                />
                {path === "password" && errorMessage?.msg && (
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
                  onClick={() => navigate("/signup")}
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
