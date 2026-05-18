import { useEffect, useMemo, useRef, useState } from "react";
import { MdGraphicEq, MdPauseCircleFilled, MdPlayCircleFilled } from "react-icons/md";
import styles from "./PhotoShortPlayer.module.css";

const formatDurationLabel = (value) => {
  const safeValue = Number.isFinite(value) ? Math.max(0, value) : 0;
  const wholeSeconds = Math.floor(safeValue);
  const minutes = Math.floor(wholeSeconds / 60);
  const seconds = wholeSeconds % 60;

  return `${minutes}:${`${seconds}`.padStart(2, "0")}`;
};

const resolveEffectiveDuration = (requestedDuration, mediaDuration) => {
  const safeRequestedDuration = Number.isFinite(requestedDuration)
    ? Math.max(0, requestedDuration)
    : 0;
  const safeMediaDuration = Number.isFinite(mediaDuration) ? Math.max(0, mediaDuration) : 0;

  if (safeRequestedDuration > 0 && safeMediaDuration > 0) {
    return Math.min(safeRequestedDuration, safeMediaDuration);
  }

  return safeRequestedDuration || safeMediaDuration || 0;
};

export const PhotoShortPlayer = ({
  imageUrl,
  musicUrl,
  musicSourceType = "audio",
  durationSeconds = 0,
  title = "Photo short",
  className = "",
  imageClassName = "",
}) => {
  const mediaRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progressSeconds, setProgressSeconds] = useState(0);
  const [resolvedDurationSeconds, setResolvedDurationSeconds] = useState(
    Number.isFinite(durationSeconds) ? Math.max(0, durationSeconds) : 0,
  );
  const effectiveDurationSeconds = useMemo(
    () => resolveEffectiveDuration(durationSeconds, resolvedDurationSeconds),
    [durationSeconds, resolvedDurationSeconds],
  );
  const progressPercent =
    effectiveDurationSeconds > 0
      ? Math.min((progressSeconds / effectiveDurationSeconds) * 100, 100)
      : 0;
  const rootClassName = [styles.player, className].filter(Boolean).join(" ");
  const artworkClassName = [styles.artwork, imageClassName].filter(Boolean).join(" ");
  const shouldUseHiddenVideo = musicSourceType === "video";

  useEffect(() => {
    setProgressSeconds(0);
    setIsPlaying(false);
    setResolvedDurationSeconds(Number.isFinite(durationSeconds) ? Math.max(0, durationSeconds) : 0);

    if (mediaRef.current) {
      mediaRef.current.pause();
      mediaRef.current.currentTime = 0;
    }
  }, [durationSeconds, imageUrl, musicUrl]);

  useEffect(() => {
    const mediaNode = mediaRef.current;

    if (!mediaNode || !musicUrl) {
      return undefined;
    }

    const syncDuration = () => {
      setResolvedDurationSeconds((currentDuration) => {
        const nextDuration = resolveEffectiveDuration(
          durationSeconds,
          Number(mediaNode.duration),
        );

        return Math.abs(nextDuration - currentDuration) > 0.1 ? nextDuration : currentDuration;
      });
    };
    const handlePlay = () => {
      setIsPlaying(true);
    };
    const handlePause = () => {
      setIsPlaying(false);
    };
    const handleTimeUpdate = () => {
      const cappedDuration = resolveEffectiveDuration(durationSeconds, Number(mediaNode.duration));

      if (cappedDuration > 0 && mediaNode.currentTime >= cappedDuration - 0.1) {
        mediaNode.pause();
        mediaNode.currentTime = 0;
        setProgressSeconds(cappedDuration);
        setIsPlaying(false);
        return;
      }

      setProgressSeconds(mediaNode.currentTime || 0);
    };
    const handleEnded = () => {
      mediaNode.currentTime = 0;
      setProgressSeconds(0);
      setIsPlaying(false);
    };

    mediaNode.addEventListener("loadedmetadata", syncDuration);
    mediaNode.addEventListener("durationchange", syncDuration);
    mediaNode.addEventListener("play", handlePlay);
    mediaNode.addEventListener("pause", handlePause);
    mediaNode.addEventListener("timeupdate", handleTimeUpdate);
    mediaNode.addEventListener("ended", handleEnded);

    return () => {
      mediaNode.removeEventListener("loadedmetadata", syncDuration);
      mediaNode.removeEventListener("durationchange", syncDuration);
      mediaNode.removeEventListener("play", handlePlay);
      mediaNode.removeEventListener("pause", handlePause);
      mediaNode.removeEventListener("timeupdate", handleTimeUpdate);
      mediaNode.removeEventListener("ended", handleEnded);
    };
  }, [durationSeconds, musicUrl]);

  useEffect(
    () => () => {
      if (mediaRef.current) {
        mediaRef.current.pause();
      }
    },
    [],
  );

  const handlePlaybackToggle = async () => {
    const mediaNode = mediaRef.current;

    if (!mediaNode || !musicUrl) {
      return;
    }

    if (isPlaying) {
      mediaNode.pause();
      return;
    }

    if (effectiveDurationSeconds > 0 && mediaNode.currentTime >= effectiveDurationSeconds - 0.1) {
      mediaNode.currentTime = 0;
      setProgressSeconds(0);
    }

    try {
      await mediaNode.play();
    } catch {
      setIsPlaying(false);
    }
  };

  return (
    <div className={rootClassName}>
      <img src={imageUrl} alt={title} className={artworkClassName} />

      <div className={styles.overlay}>
        <div className={styles.topRow}>
          <span className={styles.badge}>
            <MdGraphicEq />
            Music short
          </span>
          <span className={styles.duration}>
            {formatDurationLabel(progressSeconds)} / {formatDurationLabel(effectiveDurationSeconds)}
          </span>
        </div>

        <div className={styles.bottomRow}>
          <button
            type="button"
            className={styles.playButton}
            onClick={handlePlaybackToggle}
            disabled={!musicUrl}
            aria-label={isPlaying ? "Pause photo short soundtrack" : "Play photo short soundtrack"}
          >
            {isPlaying ? <MdPauseCircleFilled /> : <MdPlayCircleFilled />}
            {isPlaying ? "Pause" : "Play music"}
          </button>

          <div className={styles.progressTrack} aria-hidden="true">
            <span
              className={styles.progressFill}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {shouldUseHiddenVideo ? (
        <video
          ref={mediaRef}
          src={musicUrl}
          className={styles.hiddenMedia}
          preload="metadata"
          playsInline
        />
      ) : (
        <audio
          ref={mediaRef}
          src={musicUrl}
          className={styles.hiddenMedia}
          preload="metadata"
        />
      )}
    </div>
  );
};
