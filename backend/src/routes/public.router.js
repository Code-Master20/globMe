const router = require("express").Router();
const optionalAuthMiddleware = require("../middleware/auth/optionalAuth.middleware");
const {
  getPublicPosts,
  getPublicPostById,
} = require("../controllers/post.controller");
const { getDynamicSitemap } = require("../controllers/public.controller");

router.get("/posts", optionalAuthMiddleware, getPublicPosts);
router.get("/posts/:postId", optionalAuthMiddleware, getPublicPostById);
router.get("/sitemap.xml", getDynamicSitemap);

module.exports = router;
