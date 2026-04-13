import { useEffect, useState } from "react";
import { ResetPassWithOldPass } from "./ResetPassWithOldPass";
import { ResetPassWithOtp } from "./ResetPassWithOtp";

export const EditPassword = () => {
  const [otpResetTrigger, setOtpResetTrigger] = useState(() => {
    const val = localStorage.getItem("otpResetTrigger");
    return val ? JSON.parse(val) : false;
  });

  useEffect(() => {
    localStorage.setItem("otpResetTrigger", JSON.stringify(otpResetTrigger));
  }, [otpResetTrigger]);

  return otpResetTrigger ? (
    <ResetPassWithOtp setOtpResetTrigger={setOtpResetTrigger} />
  ) : (
    <ResetPassWithOldPass setOtpResetTrigger={setOtpResetTrigger} />
  );
};
