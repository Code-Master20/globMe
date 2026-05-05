import { useRef } from "react";

export const ImageUpload = ({
  Icon,
  className,
  buttonClassName = "",
  onFileSelect,
  accept = "image/*",
  multiple = false,
  size = 25,
  label = "",
  disabled = false,
  title,
}) => {
  const fileInputRef = useRef(null);

  const handleIconClick = () => {
    if (disabled) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const files = multiple ? e.target.files : e.target.files[0];

    if (!files) return;

    if (onFileSelect) {
      onFileSelect(files);
    }

    // reset input so same file can be selected again
    e.target.value = "";
  };

  return (
    <div className={className}>
      <input
        type="file"
        accept={accept}
        multiple={multiple}
        ref={fileInputRef}
        onChange={handleFileChange}
        disabled={disabled}
        style={{ display: "none" }}
      />

      <button
        type="button"
        className={buttonClassName}
        onClick={handleIconClick}
        disabled={disabled}
        title={title || label || "Choose image"}
        aria-label={title || label || "Choose image"}
      >
        <Icon size={size} />
        {label ? <span>{label}</span> : null}
      </button>
    </div>
  );
};
