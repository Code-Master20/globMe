import { useEffect, useRef, useState } from "react";
import styles from "./LogInSignUp.module.css";
import style from "./LogIn.module.css";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { signUpOtpReceived } from "../../features/auth/authThunks";
import { InvalidInputTracker } from "../../components/InvalidInputTracker/InvalidInputTracker";
import { MdOutlineRemoveRedEye } from "react-icons/md";
import { FaRegEyeSlash } from "react-icons/fa6";
import { toast } from "react-toastify";

export const SignUp = () => {
  localStorage.removeItem("otpExpiry");
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const { errorMessage, successMessage, formLoading } = useSelector(
    (state) => state.auth,
  );

  const storedUser = JSON.parse(localStorage.getItem("user"));

  const [clientCredentials, setClientCredentials] = useState({
    username: storedUser ? storedUser.username : "",
    email: storedUser ? storedUser.email : "",
    password: "",
  });

  const [path, setPath] = useState("");

  const handleOnChange = (e) => {
    const { name, value } = e.target;
    setClientCredentials((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const [timerIdArr, setTimerIdArr] = useState([]);
  const handleSubmit = async (e) => {
    e.preventDefault();

    setLoading(true); // ✅ Always explicitly set true

    const trimmedCredentials = {
      username: clientCredentials.username.trim().toLowerCase(),
      email: clientCredentials.email.trim().toLowerCase(),
      password: clientCredentials.password.trim(),
    };

    const resultAction = await dispatch(signUpOtpReceived(trimmedCredentials));

    // ❌ If rejected
    if (signUpOtpReceived.rejected.match(resultAction)) {
      setLoading(false); // stop loading

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

      const error = resultAction.payload?.message;

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

    // ✅ If fulfilled
    if (signUpOtpReceived.fulfilled.match(resultAction)) {
      localStorage.setItem(
        "user",
        JSON.stringify({
          ...(JSON.parse(localStorage.getItem("user")) || {}),
          username: clientCredentials.username,
        }),
      );

      setClientCredentials({
        username: "",
        email: "",
        password: "",
      });

      setPath("");

      navigate("/verify-otp", { replace: true });
      // replace prevents going back to signup
    }
  };

  const handleFocus = (e) => {
    if (path === e.target.name) {
      setPath("");
    }
  };

  const [view, setView] = useState(false);
  const [inputType, setInputType] = useState("password");

  const handleInputViewer = () => {
    setView((prev) => !prev);
    if (inputType === "password") {
      setInputType("text");
    }
    if (inputType === "text") {
      setInputType("password");
    }
  };

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
          <h1 className={styles["login-main-heading"]}>create account</h1>
          <div className={styles["login-form-container"]}>
            <form onSubmit={handleSubmit}>
              <div className={styles["input-elm"]}>
                <label htmlFor="username">Username :</label>
                <input
                  id="username"
                  type="text"
                  name="username"
                  placeholder="your username"
                  value={clientCredentials.username}
                  onChange={handleOnChange}
                  onFocus={handleFocus}
                />
                {path === "username" && errorMessage?.msg && (
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

              <div
                className={`${styles["input-elm"]} ${styles["password-input"]}`}
              >
                <span
                  className={styles["view-password"]}
                  onClick={handleInputViewer}
                >
                  {view ? (
                    <MdOutlineRemoveRedEye className={styles["eye"]} />
                  ) : (
                    <FaRegEyeSlash className={styles["eye"]} />
                  )}
                </span>
                <label htmlFor="password">Password :</label>
                <input
                  id="password"
                  type={inputType}
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
                <button className={`${styles["sign-up-btn"]} `} type="submit">
                  sign-up
                </button>
                <button
                  className={style["log-in-btn"]}
                  type="button"
                  onClick={() => navigate("/login")}
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
