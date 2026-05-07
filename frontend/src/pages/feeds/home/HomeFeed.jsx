import { PublicFeedView } from "../../../components/public/PublicFeedView";

export const HomeFeed = () => {
  return (
    <PublicFeedView
      title="Browse public posts before you join"
      description="Guests can explore public posts and member profiles across globMe. Sign in only when you want to react, comment, or connect."
      filterType="all"
      showStoryTray
      emptyHeading="No public posts yet"
      emptyCopy="Explore public profiles and community discovery on globMe as fresh posts begin to appear."
      seoTitle="Public Posts, Profiles, and Social Discovery"
      seoDescription="Discover public globMe posts, browse member profiles, and explore social discovery before signing up."
    />
  );
};
