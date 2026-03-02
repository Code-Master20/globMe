import { useEffect, useState, useRef } from "react";
import styles from "./HomeFeed.module.css";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";

export const HomeFeed = () => {
  const { successMessage, isAuthenticated, purpose, user } = useSelector(
    (state) => state.auth,
  );

  const [toastPoped, setToastPopped] = useState(
    JSON.parse(sessionStorage.getItem("toastPopped")) || false,
  );
  useEffect(() => {
    if (!toastPoped) {
      if (successMessage.length === 25) {
        toast.success(successMessage);
        setToastPopped(true);
        sessionStorage.setItem("toastPopped", JSON.stringify(true));
      }
    }
  }, [successMessage, toastPoped]);

  return <main className={styles["main-container"]}>Home Sections</main>;
};
