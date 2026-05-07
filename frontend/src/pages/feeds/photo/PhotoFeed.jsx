import { PublicFeedView } from "../../../components/public/PublicFeedView";

export const PhotoFeed = () => {
  return (
    <PublicFeedView
      title="Public image posts from the community"
      description="Browse photo-first posts shared publicly by globMe members. Open profiles freely, then log in when you want to interact."
      filterType="image"
      emptyHeading="No public photo posts yet"
      emptyCopy="Once public image posts are published, this page becomes a crawlable gallery for visitors and Google Search Console."
      seoTitle="Photo Feed"
      seoDescription="See public image posts and creator profiles on globMe."
    />
  );
};
