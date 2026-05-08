import { useEffect, useState } from "react";
import { MdOutlinePhotoLibrary, MdPlayCircleOutline } from "react-icons/md";
import { toast } from "react-toastify";
import { useLocation } from "react-router-dom";
import { usePageMetadata } from "../../hooks/usePageMetadata";
import api from "../../lib/api";
import { ImageUpload } from "../../components/media/ImgUpload";
import styles from "./UploadStudio.module.css";

const initialPostForm = {
  title: "",
  description: "",
  tags: "",
  contentFormat: "article",
  category: "",
};

const getDefaultContentFormat = (postType) => (postType === "video" ? "reel" : "article");

const normalizeUploadType = (value) => (value === "video" ? "video" : "image");

const normalizeUploadFormat = (postType, value) => {
  if (postType === "video") {
    return value === "long" ? "long" : "reel";
  }

  return value === "reel" ? "reel" : "article";
};

const formatPostKindLabel = (postType, contentFormat) => {
  if (postType === "video") {
    return contentFormat === "long" ? "Long video" : "Video reel";
  }

  return contentFormat === "reel" ? "Photo reel" : "Raw post";
};

export const UploadStudio = () => {
  usePageMetadata({
    title: "Upload studio",
    description: "Upload owner photo posts, reels, and long videos.",
    robots: "noindex, nofollow",
  });

  const location = useLocation();
  const [postForm, setPostForm] = useState(initialPostForm);
  const [selectedPostFile, setSelectedPostFile] = useState(null);
  const [postPreviewUrl, setPostPreviewUrl] = useState("");
  const [postUploadLoading, setPostUploadLoading] = useState(false);
  const [uploadIntent, setUploadIntent] = useState("image");
  const [ownerPlaylists, setOwnerPlaylists] = useState([]);
  const [playlistsLoading, setPlaylistsLoading] = useState(false);
  const [selectedPlaylistIds, setSelectedPlaylistIds] = useState([]);
  const [newPlaylistTitle, setNewPlaylistTitle] = useState("");
  const [newPlaylistDescription, setNewPlaylistDescription] = useState("");

  const selectedPostType = selectedPostFile?.type?.startsWith("video/")
    ? "video"
    : selectedPostFile?.type?.startsWith("image/")
      ? "image"
      : uploadIntent;

  useEffect(() => {
    if (!selectedPostFile) {
      setPostPreviewUrl("");
      return undefined;
    }

    const objectUrl = URL.createObjectURL(selectedPostFile);
    setPostPreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [selectedPostFile]);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const requestedType = searchParams.get("type");
    const requestedFormat = searchParams.get("format");

    if (!requestedType && !requestedFormat) {
      return;
    }

    const nextType = normalizeUploadType(requestedType);
    const nextFormat = normalizeUploadFormat(nextType, requestedFormat);

    setUploadIntent(nextType);
    setSelectedPostFile(null);
    setPostForm((prev) => ({
      ...prev,
      contentFormat: nextFormat,
      category: nextType === "video" ? prev.category : "",
    }));
  }, [location.search]);

  const loadOwnerPlaylists = async () => {
    try {
      setPlaylistsLoading(true);
      const response = await api.get("/user/playlists");
      setOwnerPlaylists(Array.isArray(response.data?.data) ? response.data.data : []);
    } catch (error) {
      toast.error(error.response?.data?.message || "Playlists could not be loaded");
      setOwnerPlaylists([]);
    } finally {
      setPlaylistsLoading(false);
    }
  };

  useEffect(() => {
    if (uploadIntent === "video") {
      loadOwnerPlaylists();
      return;
    }

    setSelectedPlaylistIds([]);
    setNewPlaylistTitle("");
    setNewPlaylistDescription("");
  }, [uploadIntent]);

  const handlePostInputChange = (event) => {
    const { name, value } = event.target;

    setPostForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const resetPostComposer = () => {
    setPostForm({
      ...initialPostForm,
      contentFormat: getDefaultContentFormat(uploadIntent),
    });
    setSelectedPostFile(null);
    setSelectedPlaylistIds([]);
    setNewPlaylistTitle("");
    setNewPlaylistDescription("");
  };

  const handlePostFileSelect = (file) => {
    setSelectedPostFile(file);
  };

  const handlePlaylistToggle = (playlistId) => {
    setSelectedPlaylistIds((prev) =>
      prev.includes(playlistId)
        ? prev.filter((item) => item !== playlistId)
        : [...prev, playlistId],
    );
  };

  const handlePostPublish = async (event) => {
    event.preventDefault();

    if (!selectedPostFile) {
      toast.error("Choose a photo or video first");
      return;
    }

    try {
      setPostUploadLoading(true);
      const formData = new FormData();
      formData.append("media", selectedPostFile);
      formData.append("title", postForm.title.trim());
      formData.append("description", postForm.description.trim());
      formData.append("tags", postForm.tags.trim());
      formData.append("contentFormat", postForm.contentFormat);

      if (uploadIntent === "video") {
        if (postForm.category.trim()) {
          formData.append("category", postForm.category.trim().toLowerCase());
        }

        if (selectedPlaylistIds.length) {
          formData.append("playlistIds", JSON.stringify(selectedPlaylistIds));
        }

        if (newPlaylistTitle.trim()) {
          formData.append("newPlaylistTitle", newPlaylistTitle.trim());
        }

        if (newPlaylistDescription.trim()) {
          formData.append("newPlaylistDescription", newPlaylistDescription.trim());
        }
      }

      const response = await api.post("/user/posts/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      toast.success(response.data?.message || "Post published successfully");
      resetPostComposer();
      if (uploadIntent === "video") {
        await loadOwnerPlaylists();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Post upload failed");
    } finally {
      setPostUploadLoading(false);
    }
  };

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <p className={styles.kicker}>Owner upload studio</p>
        <h1>{formatPostKindLabel(uploadIntent, postForm.contentFormat)} upload</h1>
        <p className={styles.subcopy}>
          Your choice is confirmed from the plus icon menu. Add the matching media
          and publish.
        </p>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <div>
            <p>Publish</p>
            <h2>{formatPostKindLabel(uploadIntent, postForm.contentFormat)}</h2>
          </div>
        </div>

        <form className={styles.form} onSubmit={handlePostPublish}>
          <div className={styles.confirmedChoice}>
            <strong>Selected upload type</strong>
            <span>{formatPostKindLabel(uploadIntent, postForm.contentFormat)}</span>
          </div>

          <div className={styles.publishPicker}>
            <ImageUpload
              Icon={uploadIntent === "video" ? MdPlayCircleOutline : MdOutlinePhotoLibrary}
              className={styles.publishUploader}
              buttonClassName={styles.primaryAction}
              onFileSelect={handlePostFileSelect}
              accept={uploadIntent === "video" ? "video/*" : "image/*"}
              label={selectedPostFile ? "Change media" : `Choose ${uploadIntent === "video" ? "video" : "photo"}`}
              disabled={postUploadLoading}
              title={`Choose a ${uploadIntent === "video" ? "video" : "photo"} for your post`}
            />

            {selectedPostFile ? (
              <button
                type="button"
                className={styles.secondaryAction}
                onClick={resetPostComposer}
              >
                Clear draft
              </button>
            ) : null}
          </div>

          {selectedPostFile ? (
            <div className={styles.postPreviewCard}>
              {selectedPostType === "video" ? (
                <video
                  src={postPreviewUrl}
                  className={styles.postPreviewMedia}
                  controls
                  preload="metadata"
                />
              ) : (
                <img
                  src={postPreviewUrl}
                  alt="Selected post draft"
                  className={styles.postPreviewMedia}
                />
              )}

              <div className={styles.postPreviewMeta}>
                <strong>{formatPostKindLabel(selectedPostType, postForm.contentFormat)}</strong>
                <small>{selectedPostFile.name}</small>
                {postForm.tags.trim() ? <small>Tags: {postForm.tags.trim()}</small> : null}
              </div>
            </div>
          ) : (
              <div className={styles.emptyState}>
                Pick the matching {uploadIntent === "video" ? "video" : "photo"} file for this upload.
              </div>
            )}

          <label className={styles.field}>
            <span>Title</span>
            <input
              type="text"
              name="title"
              placeholder="Give this post a title"
              value={postForm.title}
              onChange={handlePostInputChange}
            />
          </label>

          <label className={styles.field}>
            <span>Description</span>
            <textarea
              name="description"
              placeholder="Write a short caption or article intro"
              value={postForm.description}
              onChange={handlePostInputChange}
            />
          </label>

          <label className={styles.field}>
            <span>Tags</span>
            <input
              type="text"
              name="tags"
              placeholder="funny video, educational, songs, movie, article"
              value={postForm.tags}
              onChange={handlePostInputChange}
            />
          </label>

          {uploadIntent === "video" ? (
            <div className={styles.playlistPanel}>
              <div className={styles.playlistHeader}>
                <div>
                  <strong>Add to playlists</strong>
                  <p>Attach this upload to existing playlists or create a new public playlist.</p>
                </div>
              </div>

              {playlistsLoading ? (
                <div className={styles.emptyState}>Loading your playlists...</div>
              ) : ownerPlaylists.length === 0 ? (
                <div className={styles.emptyState}>
                  No playlists yet. You can create a new one below while uploading this video.
                </div>
              ) : (
                <div className={styles.playlistPicker}>
                  {ownerPlaylists.map((playlist) => (
                    <label key={playlist._id} className={styles.playlistOption}>
                      <input
                        type="checkbox"
                        checked={selectedPlaylistIds.includes(playlist._id)}
                        onChange={() => handlePlaylistToggle(playlist._id)}
                      />
                      <div>
                        <strong>{playlist.title}</strong>
                        <small>{playlist.videoCount || 0} videos</small>
                      </div>
                    </label>
                  ))}
                </div>
              )}

              <label className={styles.field}>
                <span>Create new playlist</span>
                <input
                  type="text"
                  placeholder="travel vlogs, tutorials, highlights..."
                  value={newPlaylistTitle}
                  onChange={(event) => setNewPlaylistTitle(event.target.value)}
                />
              </label>

              <label className={styles.field}>
                <span>New playlist description</span>
                <textarea
                  placeholder="Tell visitors what this playlist is about"
                  value={newPlaylistDescription}
                  onChange={(event) => setNewPlaylistDescription(event.target.value)}
                />
              </label>
            </div>
          ) : null}

          {uploadIntent === "video" ? (
            <label className={styles.field}>
              <span>Video category</span>
              <input
                type="text"
                name="category"
                placeholder="tutorial, vlog, travel..."
                value={postForm.category}
                onChange={handlePostInputChange}
              />
            </label>
          ) : null}

          <button
            type="submit"
            className={styles.primarySubmit}
            disabled={postUploadLoading || !selectedPostFile}
          >
            {postUploadLoading ? "Publishing..." : "Publish post"}
          </button>
        </form>
      </section>
    </main>
  );
};
