import { useEffect, useRef, useState } from "react";

const PREVIEW_LOOP_SECONDS = 3;

export const VideoThumbnail = ({ src, className, alt }) => {
  const canvasRef = useRef(null);
  const videoRef = useRef(null);
  const frameRef = useRef(0);
  const [previewReady, setPreviewReady] = useState(false);

  useEffect(() => {
    const videoElement = videoRef.current;
    const canvasElement = canvasRef.current;

    if (!src || !videoElement || !canvasElement) {
      setPreviewReady(false);
      return undefined;
    }

    let disposed = false;

    const drawFrame = () => {
      if (disposed) {
        return;
      }

      const context = canvasElement.getContext("2d");

      if (!context || !videoElement.videoWidth || !videoElement.videoHeight) {
        frameRef.current = window.requestAnimationFrame(drawFrame);
        return;
      }

      if (
        canvasElement.width !== videoElement.videoWidth ||
        canvasElement.height !== videoElement.videoHeight
      ) {
        canvasElement.width = videoElement.videoWidth;
        canvasElement.height = videoElement.videoHeight;
      }

      context.drawImage(
        videoElement,
        0,
        0,
        canvasElement.width,
        canvasElement.height,
      );
      frameRef.current = window.requestAnimationFrame(drawFrame);
    };

    const restartPreview = () => {
      if (disposed) {
        return;
      }

      if (videoElement.currentTime >= PREVIEW_LOOP_SECONDS) {
        try {
          videoElement.currentTime = 0;
        } catch {
          return;
        }
      }

      const playPromise = videoElement.play();

      if (playPromise?.catch) {
        playPromise.catch(() => {});
      }
    };

    const handleLoadedData = () => {
      setPreviewReady(true);
      restartPreview();
      frameRef.current = window.requestAnimationFrame(drawFrame);
    };

    const handleTimeUpdate = () => {
      if (videoElement.currentTime >= PREVIEW_LOOP_SECONDS) {
        videoElement.currentTime = 0;
      }
    };

    const handleSeeked = () => {
      restartPreview();
    };

    videoElement.muted = true;
    videoElement.defaultMuted = true;
    videoElement.loop = false;
    videoElement.playsInline = true;
    videoElement.autoplay = true;
    videoElement.preload = "auto";
    videoElement.currentTime = 0;

    videoElement.addEventListener("loadeddata", handleLoadedData);
    videoElement.addEventListener("timeupdate", handleTimeUpdate);
    videoElement.addEventListener("seeked", handleSeeked);
    videoElement.addEventListener("pause", restartPreview);
    videoElement.src = src;
    videoElement.load();

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frameRef.current);
      videoElement.pause();
      videoElement.removeEventListener("loadeddata", handleLoadedData);
      videoElement.removeEventListener("timeupdate", handleTimeUpdate);
      videoElement.removeEventListener("seeked", handleSeeked);
      videoElement.removeEventListener("pause", restartPreview);
      videoElement.removeAttribute("src");
      videoElement.load();
    };
  }, [src]);

  return (
    <>
      <canvas
        ref={canvasRef}
        className={className}
        role="img"
        aria-label={alt}
        style={{ opacity: previewReady ? 1 : undefined }}
      />
      <video
        ref={videoRef}
        muted
        playsInline
        preload="auto"
        aria-hidden="true"
        tabIndex={-1}
        style={{ display: "none" }}
      />
    </>
  );
};
