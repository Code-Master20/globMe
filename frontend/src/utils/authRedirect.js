const POST_AUTH_REDIRECT_KEY = "post-auth-redirect";

export const rememberPostAuthRedirect = (path) => {
  if (typeof window === "undefined" || !path?.startsWith("/")) {
    return;
  }

  window.localStorage.setItem(POST_AUTH_REDIRECT_KEY, path);
};

export const peekPostAuthRedirect = () => {
  if (typeof window === "undefined") {
    return "";
  }

  return window.localStorage.getItem(POST_AUTH_REDIRECT_KEY) || "";
};

export const consumePostAuthRedirect = () => {
  const redirectPath = peekPostAuthRedirect();

  if (typeof window !== "undefined") {
    window.localStorage.removeItem(POST_AUTH_REDIRECT_KEY);
  }

  return redirectPath;
};
