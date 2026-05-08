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
