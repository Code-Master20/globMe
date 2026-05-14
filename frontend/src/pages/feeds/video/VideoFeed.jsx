import { PublicFeedView } from "../../../components/public/PublicFeedView";

export const VideoFeed = () => {
  return (
    <PublicFeedView
      title="Public video posts on globMe"
      description="Visitors can open this route and browse public video content whenever creators publish it, while interaction stays gated behind auth."
      filterType="video"
      autoPlayVisibleVideos
      emptyHeading="No public video posts yet"
      emptyCopy="Video posts will appear here automatically once creators begin publishing public video content."
      seoTitle="Video Feed"
      seoDescription="Browse public globMe video posts and visit creator profiles."
    />
  );
};
