import { VideoThumbnail } from "./VideoThumbnail";
import styles from "./StoryRail.module.css";

export const StoryRail = ({
  items = [],
  loading = false,
  skeletonCount = 4,
  onSelect,
  getItemLabel,
}) => {
  const fallbackItems = Array.from({ length: skeletonCount }, (_, index) => index);

  return (
    <div className={styles.scroller}>
      {loading
        ? fallbackItems.map((item) => <div key={item} className={styles.skeleton} />)
        : items.map((item, index) => {
            const itemLabel =
              getItemLabel?.(item, index) || item?.title || `Open story ${index + 1}`;

            return (
              <button
                type="button"
                key={item?.id || `${item?.mediaUrl || "story"}-${index}`}
                className={styles.card}
                onClick={() => onSelect?.(item, index)}
                aria-label={itemLabel}
              >
                <div
                  className={`${styles.frame} ${
                    item?.accent === "current" ? styles.frameCurrent : ""
                  }`}
                >
                  <div className={styles.frameInner}>
                    {item?.mediaType === "video" ? (
                      <VideoThumbnail
                        src={item?.mediaUrl}
                        className={styles.media}
                        alt={itemLabel}
                      />
                    ) : (
                      <img
                        src={item?.mediaUrl}
                        alt={itemLabel}
                        className={styles.media}
                        loading="lazy"
                      />
                    )}

                    <div className={styles.overlayTop}>
                      {item?.badge ? (
                        <span className={styles.badge}>{item.badge}</span>
                      ) : (
                        <span className={styles.badgeMuted}>story</span>
                      )}
                    </div>

                    <div className={styles.overlayBottom}>
                      <strong>{item?.title || `Story ${index + 1}`}</strong>
                      {item?.subtitle ? <span>{item.subtitle}</span> : null}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
    </div>
  );
};
