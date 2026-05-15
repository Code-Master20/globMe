import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  MdClose,
  MdContentCopy,
  MdMessage,
  MdOpenInNew,
  MdShare,
} from "react-icons/md";
import { FaTelegramPlane, FaWhatsapp } from "react-icons/fa";
import { toast } from "react-toastify";
import styles from "./PublicShareSheet.module.css";

const CLOSE_DURATION_MS = 220;

const trimShareText = (value) => {
  const text = `${value || ""}`.trim();

  if (!text) {
    return "Check this out on globMe.";
  }

  if (text.length <= 180) {
    return text;
  }

  return `${text.slice(0, 177).trimEnd()}...`;
};

export const PublicShareSheet = ({
  open,
  onClose,
  title = "",
  description = "",
  shareUrl = "",
}) => {
  const [closing, setClosing] = useState(false);
  const [nativeShareBusy, setNativeShareBusy] = useState(false);
  const closeTimeoutRef = useRef(null);
  const isVisible = open || closing;

  const sharePayload = useMemo(() => {
    const shareTitle = `${title || "globMe post"}`.trim();
    const shareText = trimShareText(description || title);
    const url = `${shareUrl || ""}`.trim();

    return {
      title: shareTitle,
      text: shareText,
      url,
      combinedText: `${shareTitle}\n${shareText}\n${url}`.trim(),
    };
  }, [description, shareUrl, title]);

  const requestClose = useCallback(() => {
    if (closing) {
      return;
    }

    setClosing(true);

    if (closeTimeoutRef.current) {
      window.clearTimeout(closeTimeoutRef.current);
    }

    closeTimeoutRef.current = window.setTimeout(() => {
      setClosing(false);
      closeTimeoutRef.current = null;
      onClose?.();
    }, CLOSE_DURATION_MS);
  }, [closing, onClose]);

  useEffect(() => {
    if (!open) {
      return;
    }

    if (closeTimeoutRef.current) {
      window.clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }

    setClosing(false);
  }, [open]);

  useEffect(() => {
    if (!isVisible) {
      return undefined;
    }

    const previousBodyOverflow = document.body.style.overflow;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        requestClose();
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isVisible, requestClose]);

  useEffect(
    () => () => {
      if (closeTimeoutRef.current) {
        window.clearTimeout(closeTimeoutRef.current);
      }
    },
    [],
  );

  if (!isVisible) {
    return null;
  }

  const openShareUrl = (targetUrl) => {
    window.open(targetUrl, "_blank", "noopener,noreferrer");
    requestClose();
  };

  const handleNativeShare = async () => {
    if (typeof navigator === "undefined" || typeof navigator.share !== "function") {
      toast.info("Native device sharing is not available here.");
      return;
    }

    try {
      setNativeShareBusy(true);
      await navigator.share({
        title: sharePayload.title,
        text: sharePayload.text,
        url: sharePayload.url,
      });
    } catch (error) {
      if (error?.name !== "AbortError") {
        toast.error("Share could not be opened.");
      }
    } finally {
      setNativeShareBusy(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(sharePayload.url || sharePayload.combinedText);
      toast.success("Share link copied");
      requestClose();
    } catch {
      toast.error("Link could not be copied");
    }
  };

  const smsUrl = `sms:?body=${encodeURIComponent(sharePayload.combinedText)}`;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(sharePayload.combinedText)}`;
  const telegramUrl =
    `https://t.me/share/url?url=${encodeURIComponent(sharePayload.url)}` +
    `&text=${encodeURIComponent(`${sharePayload.title}\n${sharePayload.text}`.trim())}`;

  return (
    <div
      className={`${styles.overlay} ${closing ? styles.overlayClosing : ""}`}
      onClick={requestClose}
    >
      <div
        className={`${styles.sheet} ${closing ? styles.sheetClosing : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Share post"
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.header}>
          <div>
            <p>Share</p>
            <h2>{sharePayload.title}</h2>
          </div>
          <button
            type="button"
            className={styles.closeButton}
            onClick={requestClose}
            aria-label="Close share sheet"
          >
            <MdClose />
          </button>
        </div>

        <div className={styles.previewCard}>
          <strong>{sharePayload.title}</strong>
          <span>{sharePayload.text}</span>
          <small>{sharePayload.url}</small>
        </div>

        <div className={styles.actionsGrid}>
          <button
            type="button"
            className={styles.actionButton}
            onClick={handleNativeShare}
            disabled={nativeShareBusy}
          >
            <MdShare />
            <span>{nativeShareBusy ? "Opening..." : "More apps"}</span>
          </button>

          <button
            type="button"
            className={styles.actionButton}
            onClick={() => openShareUrl(smsUrl)}
          >
            <MdMessage />
            <span>Message</span>
          </button>

          <button
            type="button"
            className={styles.actionButton}
            onClick={() => openShareUrl(whatsappUrl)}
          >
            <FaWhatsapp />
            <span>WhatsApp</span>
          </button>

          <button
            type="button"
            className={styles.actionButton}
            onClick={() => openShareUrl(telegramUrl)}
          >
            <FaTelegramPlane />
            <span>Telegram</span>
          </button>

          <button
            type="button"
            className={styles.actionButton}
            onClick={handleCopyLink}
          >
            <MdContentCopy />
            <span>Copy link</span>
          </button>

          <a
            className={styles.actionButton}
            href={sharePayload.url}
            target="_blank"
            rel="noreferrer"
          >
            <MdOpenInNew />
            <span>Open post</span>
          </a>
        </div>
      </div>
    </div>
  );
};
