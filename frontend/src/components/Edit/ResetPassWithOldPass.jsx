import { useNavigate } from "react-router-dom";
import { useState, useRef } from "react";
import styles from "./EditPassword.module.css";
import { resetPassViaOldPass } from "../../features/auth/authThunks";

export const ResetPassWithOldPass = ({ setOtpResetTrigger }) => {
  const navigate = useNavigate();
  //============if not remembered old password toggle to another page to reset password with otp==========
  //========================================passRememberedNot=======================================
  function passRememberedNot() {
    setOtpResetTrigger(true);
    localStorage.setItem("otpResetTrigger", JSON.stringify(true));
  }

  //=======================reading input field's credentials for sending to backend===============
  //============================================handleOnChange==================================
  const [clientCredentials, setClientCredentials] = useState(() => {
    const storedUser = localStorage.getItem("user");

    let data = {
      email: storedUser ? JSON.parse(storedUser)?.email : "",
      password: storedUser ? JSON.parse(storedUser)?.password : "",
      newPassword: storedUser ? JSON.parse(storedUser)?.newPassword : "",
    };
    return data;
  });

  const debounceRef = useRef({});
  const storedUser = JSON.parse(localStorage.getItem("user"));
  function handleOnChange(event) {
    let { name, value } = event.target;

    if (debounceRef.current[name]) {
      clearTimeout(debounceRef.current[name]);
    }

    localStorage.setItem(
      "user",
      JSON.stringify({
        ...storedUser,
        [name]: value,
      }),
    );

    debounceRef.current[name] = setTimeout(() => {
      setClientCredentials((prev) => ({ ...prev, [name]: value }));
    }, 5);
  }

  //====================receiving credentials from handleOnChange function for sending to backend===========
  //=========================================handleOnSubmit=============================================

  async function handleOnSubmit(event) {
    event.preventDefault();
  }

  //=========================seeing input fields' credentials specially password type's=================
  //=====================================handleViewField=====================================
  const [view, setView] = useState(false);

  function viewInputField(e) {
    setView(true);
  }

  function hideInputField(e) {
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
              type="password"
              placeholder="Enter your email"
              className={styles.input}
              name="email"
              onChange={handleOnChange}
              value={clientCredentials.email}
              disabled
            />
          </fieldset>

          <fieldset className={styles.fieldset}>
            <legend className={styles.legend}>Old Password</legend>
            <input
              type={view ? "text" : "password"}
              placeholder="Enter Old password"
              className={styles.input}
              name="password"
              onChange={handleOnChange}
              value={clientCredentials.password}
              onFocus={viewInputField}
              onBlur={hideInputField}
            />
          </fieldset>

          <fieldset className={styles.fieldset}>
            <legend className={styles.legend}>New Password</legend>
            <input
              type={view ? "text" : "password"}
              placeholder="Enter new password"
              className={styles.input}
              name="newPassword"
              onChange={handleOnChange}
              value={clientCredentials.newPassword}
              onFocus={viewInputField}
              onBlur={hideInputField}
            />
          </fieldset>

          <button className={styles.button}>exchange Password</button>

          <p className={styles.link} onClick={() => navigate("/login")}>
            Don't want to alter your old password? Go back to login
          </p>
        </form>
      </section>
    </main>
  );
};
