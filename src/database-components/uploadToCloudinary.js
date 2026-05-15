
/* -------------------------------------------------------
   CONFIG
------------------------------------------------------- */
const cloudName = "dwmunntbg"; // your cloud name
const defaultPreset = "cloud_unsigned_upload";

// ❗ Only used for server-side deletion — DO NOT expose in production
const cloudApiKey = "412925926362597";
const cloudApiSecret = "pj6L18hc7MwLpSgYKgUtVlHiMmo";

/* -------------------------------------------------------
   RESOURCE TYPE DETECTOR
------------------------------------------------------- */
const detectResourceType = (file) => {
  if (!file || !file.type) return "raw";
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  return "raw";
};

/* -------------------------------------------------------
   UPLOAD: Unified uploader for images/videos/raw files
------------------------------------------------------- */
export const uploadToCloudinary = async (file, options = null) => {
  if (!file) throw new Error("No file provided for Cloudinary upload.");

  // Determine resource type
  let resourceType = detectResourceType(file);
  let preset = defaultPreset;

  if (typeof options === "string") {
    // options = "image" or "video"
    resourceType = options;
  }

  if (typeof options === "object" && options !== null) {
    resourceType = options.resourceType || resourceType;
    preset = options.preset || preset;
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", preset);

  const uploadURL = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;

  try {
    const res = await fetch(uploadURL, { method: "POST", body: formData });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Cloudinary upload failed (${res.status}): ${errorText}`);
    }

    const json = await res.json();

    if (!json.secure_url) {
      console.error("❌ Cloudinary invalid response:", json);
      throw new Error("Upload succeeded but no URL returned.");
    }

    return {
      url: json.secure_url,
      publicId: json.public_id || null,
      resourceType,
      width: json.width || null,
      height: json.height || null,
    };
  } catch (err) {
    console.error("❌ Cloudinary upload failed:", err);
    throw err;
  }
};
