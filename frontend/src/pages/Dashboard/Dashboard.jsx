import styles from "./Dashboard.module.css";
import { LuSkipBack } from "react-icons/lu";
import { useDispatch, useSelector } from "react-redux";
import { NavLink } from "react-router-dom";

export const Dashboard = () => {
  const dispatch = useDispatch();
  const {
    dashboard,
    creating,
    searching,
    texting,
    homeFeed,
    videoFeed,
    photoFeed,
    postFeed,
    publicFeed,
    notificationFeed,
    profileFeed,
  } = useSelector((state) => state.pageTracker);
  console.log(dashboard);

  const backToPrePage = () => {};
  return (
    <>
      <main className={styles["main-container"]}>
        <section className={styles["content-container"]}>
          <article className={styles["heading-back-toggle"]}>
            <h1>Progress</h1>
            <NavLink to="#">
              <LuSkipBack className={styles.back} />
            </NavLink>
          </article>
        </section>
      </main>
    </>
  );
};
