import { PublicFeedView } from "../../../components/public/PublicFeedView";

export const PostFeed = () => {
  return (
    <PublicFeedView
      eyebrow="Community posts"
      title="Explore public posts across globMe"
      description="This page gives visitors a browseable stream of public posts and profile links while keeping actions behind account access."
      filterType="all"
      emptyHeading="No public posts available"
      emptyCopy="As members publish public posts, this route becomes useful for both human visitors and search indexing."
      seoTitle="Posts Feed"
      seoDescription="Browse public globMe posts and jump into member profiles."
    />
  );
};
