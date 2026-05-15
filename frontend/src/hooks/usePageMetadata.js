import { useEffect } from "react";

const BRAND_NAME = "globMe";
const defaultDescription =
  "globMe helps people discover public posts, profiles, and social updates in one place.";
const defaultRobots = "index, follow";

const ensureMetaTag = (selector, attributeName, attributeValue) => {
  let tag = document.querySelector(selector);

  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute(attributeName, attributeValue);
    document.head.appendChild(tag);
  }

  return tag;
};

export const usePageMetadata = ({
  title,
  description = defaultDescription,
  robots = defaultRobots,
}) => {
  useEffect(() => {
    const previousTitle = document.title;
    const trimmedTitle = `${title || ""}`.trim();
    const resolvedTitle = !trimmedTitle
      ? BRAND_NAME
      : trimmedTitle.toLowerCase().includes(BRAND_NAME.toLowerCase())
        ? trimmedTitle
        : `${trimmedTitle} | ${BRAND_NAME}`;
    document.title = resolvedTitle;

    let descriptionTag = document.querySelector('meta[name="description"]');

    if (!descriptionTag) {
      descriptionTag = document.createElement("meta");
      descriptionTag.setAttribute("name", "description");
      document.head.appendChild(descriptionTag);
    }

    const previousDescription = descriptionTag.getAttribute("content");
    descriptionTag.setAttribute("content", description);

    let canonicalTag = document.querySelector('link[rel="canonical"]');

    if (!canonicalTag) {
      canonicalTag = document.createElement("link");
      canonicalTag.setAttribute("rel", "canonical");
      document.head.appendChild(canonicalTag);
    }

    const previousCanonical = canonicalTag.getAttribute("href");
    canonicalTag.setAttribute("href", window.location.href);

    const ogTitleTag = ensureMetaTag(
      'meta[property="og:title"]',
      "property",
      "og:title",
    );
    const previousOgTitle = ogTitleTag.getAttribute("content");
    ogTitleTag.setAttribute("content", resolvedTitle);

    const ogDescriptionTag = ensureMetaTag(
      'meta[property="og:description"]',
      "property",
      "og:description",
    );
    const previousOgDescription = ogDescriptionTag.getAttribute("content");
    ogDescriptionTag.setAttribute("content", description);

    const ogUrlTag = ensureMetaTag('meta[property="og:url"]', "property", "og:url");
    const previousOgUrl = ogUrlTag.getAttribute("content");
    ogUrlTag.setAttribute("content", window.location.href);

    const twitterTitleTag = ensureMetaTag(
      'meta[name="twitter:title"]',
      "name",
      "twitter:title",
    );
    const previousTwitterTitle = twitterTitleTag.getAttribute("content");
    twitterTitleTag.setAttribute("content", resolvedTitle);

    const twitterDescriptionTag = ensureMetaTag(
      'meta[name="twitter:description"]',
      "name",
      "twitter:description",
    );
    const previousTwitterDescription =
      twitterDescriptionTag.getAttribute("content");
    twitterDescriptionTag.setAttribute("content", description);

    let robotsTag = document.querySelector('meta[name="robots"]');

    if (!robotsTag) {
      robotsTag = document.createElement("meta");
      robotsTag.setAttribute("name", "robots");
      document.head.appendChild(robotsTag);
    }

    const previousRobots = robotsTag?.getAttribute("content") || null;

    if (robotsTag) {
      robotsTag.setAttribute("content", robots);
    }

    let googlebotTag = document.querySelector('meta[name="googlebot"]');

    if (!googlebotTag) {
      googlebotTag = document.createElement("meta");
      googlebotTag.setAttribute("name", "googlebot");
      document.head.appendChild(googlebotTag);
    }

    const previousGooglebot = googlebotTag?.getAttribute("content") || null;

    if (googlebotTag) {
      googlebotTag.setAttribute("content", robots);
    }

    return () => {
      document.title = previousTitle;

      if (previousDescription) {
        descriptionTag.setAttribute("content", previousDescription);
      }

      if (previousCanonical) {
        canonicalTag.setAttribute("href", previousCanonical);
      }

      if (ogTitleTag) {
        if (previousOgTitle) {
          ogTitleTag.setAttribute("content", previousOgTitle);
        } else {
          ogTitleTag.remove();
        }
      }

      if (ogDescriptionTag) {
        if (previousOgDescription) {
          ogDescriptionTag.setAttribute("content", previousOgDescription);
        } else {
          ogDescriptionTag.remove();
        }
      }

      if (ogUrlTag) {
        if (previousOgUrl) {
          ogUrlTag.setAttribute("content", previousOgUrl);
        } else {
          ogUrlTag.remove();
        }
      }

      if (twitterTitleTag) {
        if (previousTwitterTitle) {
          twitterTitleTag.setAttribute("content", previousTwitterTitle);
        } else {
          twitterTitleTag.remove();
        }
      }

      if (twitterDescriptionTag) {
        if (previousTwitterDescription) {
          twitterDescriptionTag.setAttribute("content", previousTwitterDescription);
        } else {
          twitterDescriptionTag.remove();
        }
      }

      if (robotsTag) {
        if (previousRobots) {
          robotsTag.setAttribute("content", previousRobots);
        } else {
          robotsTag.remove();
        }
      }

      if (googlebotTag) {
        if (previousGooglebot) {
          googlebotTag.setAttribute("content", previousGooglebot);
        } else {
          googlebotTag.remove();
        }
      }
    };
  }, [description, robots, title]);
};
