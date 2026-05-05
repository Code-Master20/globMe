import "./Root.css";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { HeaderOne } from "../components/layout/Header/HeaderOne";
import { HeaderTwo } from "../components/layout/Header/HeaderTwo";
import { Outlet } from "react-router-dom";
import { checkMe } from "../store/auth/authThunks";

export const Root = () => {
  const dispatch = useDispatch();
  const { checkingAuth, isAuthenticated } = useSelector((state) => state.auth);

  useEffect(() => {
    dispatch(checkMe());
  }, [dispatch]);

  if (checkingAuth) {
    return (
      <div className="first-loading-content">
        <h1>checking if you are an existing user...</h1>
      </div>
    );
  }

  return (
    <div className="root-container">
      {isAuthenticated && (
        <>
          <HeaderOne />
          <HeaderTwo />
        </>
      )}
      <Outlet />
    </div>
  );
};
