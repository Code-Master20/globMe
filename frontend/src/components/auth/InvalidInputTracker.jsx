import { useSelector, useDispatch } from "react-redux";
import styles from "./InvalidInputTracker.module.css";

export const InvalidInputTracker = ({ className, inputErrorString }) => {
  return (
    <span className={`${className} ${styles["input-error"]}`}>
      ⚠️{inputErrorString}
    </span>
  );
};
