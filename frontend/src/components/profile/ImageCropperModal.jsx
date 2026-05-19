import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MdClose } from "react-icons/md";
import styles from "./ImageCropperModal.module.css";

const outputSizeByVariant = {
  avatar: {
    height: 720,
    width: 720,
  },
  banner: {
    height: 540,
    width: 1620,
  },
};

const clamp = (value, minimum, maximum) =>
  Math.min(Math.max(value, minimum), maximum);

const getMimeType = (file) =>
  file?.type === "image/png" || file?.type === "image/webp"
    ? file.type
    : "image/jpeg";

export const ImageCropperModal = ({
  file,
  onCancel,
  onConfirm,
  open = false,
  submitting = false,
  variant = "avatar",
}) => {
  const cropAreaRef = useRef(null);
  const imageRef = useRef(null);
  const pointerStateRef = useRef({
    dragging: false,
    pointerId: null,
    startOffsetX: 0,
    startOffsetY: 0,
    startPointerX: 0,
    startPointerY: 0,
  });
  const [frameSize, setFrameSize] = useState({
    height: 0,
    width: 0,
  });
  const [imageNaturalSize, setImageNaturalSize] = useState({
    height: 0,
    width: 0,
  });
  const [offset, setOffset] = useState({
    x: 0,
    y: 0,
  });
  const [zoomFactor, setZoomFactor] = useState(1);

  const objectUrl = useMemo(
    () => (file ? URL.createObjectURL(file) : ""),
    [file],
  );

  useEffect(() => {
    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [objectUrl]);

  useEffect(() => {
    if (!open) {
      return;
    }

    setOffset({ x: 0, y: 0 });
    setZoomFactor(1);
  }, [file, open, variant]);

  useEffect(() => {
    if (!open || !cropAreaRef.current) {
      return undefined;
    }

    const updateFrameSize = () => {
      const rect = cropAreaRef.current?.getBoundingClientRect();

      if (!rect) {
        return;
      }

      setFrameSize({
        height: rect.height,
        width: rect.width,
      });
    };

    updateFrameSize();

    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => {
            updateFrameSize();
          })
        : null;

    resizeObserver?.observe(cropAreaRef.current);
    window.addEventListener("resize", updateFrameSize);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", updateFrameSize);
    };
  }, [open, variant]);

  const minimumScale =
    frameSize.width > 0 &&
    frameSize.height > 0 &&
    imageNaturalSize.width > 0 &&
    imageNaturalSize.height > 0
      ? Math.max(
          frameSize.width / imageNaturalSize.width,
          frameSize.height / imageNaturalSize.height,
        )
      : 1;

  const scale = minimumScale * zoomFactor;
  const displayWidth = imageNaturalSize.width * scale;
  const displayHeight = imageNaturalSize.height * scale;
  const maxOffsetX = Math.max(0, (displayWidth - frameSize.width) / 2);
  const maxOffsetY = Math.max(0, (displayHeight - frameSize.height) / 2);

  useEffect(() => {
    setOffset((currentOffset) => ({
      x: clamp(currentOffset.x, -maxOffsetX, maxOffsetX),
      y: clamp(currentOffset.y, -maxOffsetY, maxOffsetY),
    }));
  }, [maxOffsetX, maxOffsetY]);

  const handleImageLoad = (event) => {
    setImageNaturalSize({
      height: event.currentTarget.naturalHeight || 0,
      width: event.currentTarget.naturalWidth || 0,
    });
  };

  const handlePointerDown = (event) => {
    if (submitting) {
      return;
    }

    pointerStateRef.current = {
      dragging: true,
      pointerId: event.pointerId,
      startOffsetX: offset.x,
      startOffsetY: offset.y,
      startPointerX: event.clientX,
      startPointerY: event.clientY,
    };

    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const handlePointerMove = (event) => {
    const pointerState = pointerStateRef.current;

    if (!pointerState.dragging || pointerState.pointerId !== event.pointerId) {
      return;
    }

    const nextOffsetX =
      pointerState.startOffsetX + (event.clientX - pointerState.startPointerX);
    const nextOffsetY =
      pointerState.startOffsetY + (event.clientY - pointerState.startPointerY);

    setOffset({
      x: clamp(nextOffsetX, -maxOffsetX, maxOffsetX),
      y: clamp(nextOffsetY, -maxOffsetY, maxOffsetY),
    });
  };

  const handlePointerUp = (event) => {
    if (pointerStateRef.current.pointerId === event.pointerId) {
      pointerStateRef.current.dragging = false;
      pointerStateRef.current.pointerId = null;
    }
  };

  const handleConfirm = async () => {
    const imageElement = imageRef.current;
    const cropAreaElement = cropAreaRef.current;

    if (!file || !imageElement || !cropAreaElement || !frameSize.width || !frameSize.height) {
      return;
    }

    const canvas = document.createElement("canvas");
    const outputSize = outputSizeByVariant[variant] || outputSizeByVariant.avatar;
    const mimeType = getMimeType(file);
    const imageLeft = frameSize.width / 2 - displayWidth / 2 + offset.x;
    const imageTop = frameSize.height / 2 - displayHeight / 2 + offset.y;
    const sourceX = Math.max(0, (0 - imageLeft) / scale);
    const sourceY = Math.max(0, (0 - imageTop) / scale);
    const sourceWidth = Math.min(imageNaturalSize.width, frameSize.width / scale);
    const sourceHeight = Math.min(imageNaturalSize.height, frameSize.height / scale);

    canvas.width = outputSize.width;
    canvas.height = outputSize.height;

    const context = canvas.getContext("2d");

    if (!context) {
      return;
    }

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(
      imageElement,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      outputSize.width,
      outputSize.height,
    );

    const blob = await new Promise((resolve) => {
      canvas.toBlob(resolve, mimeType, mimeType === "image/jpeg" ? 0.92 : undefined);
    });

    if (!blob) {
      return;
    }

    const extension =
      mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : "jpg";
    const baseName = file.name.replace(/\.[^.]+$/, "") || variant;
    const croppedFile = new File([blob], `${baseName}-${variant}.${extension}`, {
      lastModified: Date.now(),
      type: mimeType,
    });

    onConfirm(croppedFile);
  };

  if (!open || !file) {
    return null;
  }

  const modalContent = (
    <div className={styles.overlay} onClick={submitting ? undefined : onCancel}>
      <div className={styles.dialog} onClick={(event) => event.stopPropagation()}>
        <div className={styles.header}>
          <div>
            <p>{variant === "banner" ? "Banner crop" : "Profile crop"}</p>
            <h2>{variant === "banner" ? "Choose banner framing" : "Choose profile framing"}</h2>
          </div>
          <button
            type="button"
            className={styles.closeButton}
            onClick={onCancel}
            disabled={submitting}
            aria-label="Close cropper"
          >
            <MdClose size={22} />
          </button>
        </div>

        <div className={styles.body}>
          <div
            ref={cropAreaRef}
            className={`${styles.cropArea} ${
              variant === "banner" ? styles.cropAreaBanner : styles.cropAreaAvatar
            }`}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onPointerLeave={handlePointerUp}
          >
            <img
              ref={imageRef}
              src={objectUrl}
              alt="Crop preview"
              className={styles.cropImage}
              onLoad={handleImageLoad}
              draggable="false"
              style={{
                height: `${displayHeight}px`,
                left: "50%",
                top: "50%",
                transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
                width: `${displayWidth}px`,
              }}
            />
          </div>

          <div className={styles.controls}>
            <label className={styles.zoomField}>
              <span>Zoom</span>
              <input
                type="range"
                min="1"
                max="3.5"
                step="0.01"
                value={zoomFactor}
                onChange={(event) => setZoomFactor(Number(event.target.value))}
                disabled={submitting}
              />
            </label>

            <p className={styles.helpText}>
              Drag the image to choose what stays visible. Use zoom if you want a tighter crop.
            </p>
          </div>
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={onCancel}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={handleConfirm}
            disabled={submitting}
          >
            {submitting ? "Uploading..." : "Use this crop"}
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined"
    ? createPortal(modalContent, document.body)
    : modalContent;
};
