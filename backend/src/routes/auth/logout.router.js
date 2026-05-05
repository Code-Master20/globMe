const router = require("express").Router();
const logOut = require("../../controllers/auth/logout.controller");

router.post("/log-out", logOut);

module.exports = router;
