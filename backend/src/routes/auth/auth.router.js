// HERE AUTH RELATED ROUTES (DEFINED IN OTHER FILES) REQUIRED AND PASSED TO AUTH ROUTER AND THEN FINALLY EXPORTED
// CONCEPT IS TO BRING ALL AUTH RELATED ROUTES IN ONE PLACE SO THAT WE CAN DO LIKE THIS "authRouter" IN server.js
const router = require("express").Router();
const signUpRoute = require("./signup.router");
const logInRoute = require("./login.router");
const logOutRoute = require("./logout.router");
const passResetRoute = require("./resetPass.router");
const meRoute = require("./me.router");
const changeEmailRoute = require("./changeEmail.router");

router.use(signUpRoute);
router.use(logInRoute);
router.use(passResetRoute);
router.use(logOutRoute);
router.use(meRoute);
router.use(changeEmailRoute);

module.exports = router;
