const router = require("express").Router();
const optionalAuthMiddleware = require("../middleware/auth/optionalAuth.middleware");
const {
  getPublicPosts,
  getPublicPostById,
  incrementPublicPostView,
} = require("../controllers/post.controller");
const { getPublicPostComments } = require("../controllers/comment.controller");
const {
  getPublicStories,
  getPublicStoryByUserId,
} = require("../controllers/story.controller");
const { getDynamicSitemap } = require("../controllers/public.controller");

router.get("/posts", optionalAuthMiddleware, getPublicPosts);
router.get("/posts/:postId", optionalAuthMiddleware, getPublicPostById);
router.get("/posts/:postId/comments", optionalAuthMiddleware, getPublicPostComments);
router.post("/posts/:postId/view", optionalAuthMiddleware, incrementPublicPostView);
router.get("/stories", optionalAuthMiddleware, getPublicStories);
router.get("/stories/:userId", optionalAuthMiddleware, getPublicStoryByUserId);
router.get("/sitemap.xml", getDynamicSitemap);

module.exports = router;
