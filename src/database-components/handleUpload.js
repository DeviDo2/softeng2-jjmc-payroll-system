// utils/handleUpload.js
import { updateDoc, doc, getDoc, addDoc } from "firebase/firestore";
import { auth, db } from "../database-components/firebaseConfig";
import { uploadToCloudinary } from "./uploadToCloudinary";

/* -------------------------------------------------------
   BASE UNIFIED CLOUDINARY UPLOADER
------------------------------------------------------- */
export const uploadMedia = async (file, type = "image") => {
  if (!file) throw new Error(`Please select a ${type} first.`);

  const uploadOptions = {
    resourceType: type === "video" ? "video" : "image",
    preset: "cloud_unsigned_upload",
  };

  const { url, publicId } = await uploadToCloudinary(file, uploadOptions);

  if (!url) {
    throw new Error(`Cloudinary did not return a ${type} URL.`);
  }

  return { url, publicId };
};

/* -------------------------------------------------------
   PROFILE IMAGE UPLOAD
------------------------------------------------------- */
export const handleImageUpload = async ({
  file,
  setToastMsg,
  setLoading,
}) => {
  try {
    setLoading(true);

    const { url, publicId } = await uploadMedia(file, "image");

    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error("User not logged in.");

    const userRef = doc(db, "users", uid);
    const existing = await getDoc(userRef);

    if (!existing.exists()) throw new Error("User document not found.");

    await updateDoc(userRef, {
      profilePic: url,
      profilePicPublicId: publicId,
    });

    localStorage.setItem("cachedProfilePic", url);
    setToastMsg("Profile picture updated!");

    setTimeout(() => {
      window.location.href = "/profile-details-base";
    }, 900);

  } catch (err) {
    console.error("❌ Image upload error:", err);
    setToastMsg(err.message || "Error uploading image.");
  } finally {
    setLoading(false);
  }
};

/* -------------------------------------------------------
   VIDEO UPLOAD (tutorialVideos collection)
------------------------------------------------------- */
export const handleVideoUpload = async ({
  file,
  title,
  description,
  tutorialsRef,
  setToast,
  setLoading,
  resetFields,
  closeModal,
}) => {
  try {
    if (!file || !title || !description) {
      return setToast({ open: true, message: "Please fill in all fields." });
    }

    setLoading(true);

    const { url: videoUrl, publicId } = await uploadMedia(file, "video");

    await addDoc(tutorialsRef, {
      title,
      description,
      videoUrl,
      thumbnailUrl: null, // change if you generate thumbnails later
      publicId,
      createdAt: new Date(),
    });

    setToast({ open: true, message: "Uploaded successfully!" });
    closeModal?.();
    resetFields?.();

  } catch (err) {
    console.error("❌ Upload error:", err);
    setToast({ open: true, message: err.message || "Upload failed." });
  } finally {
    setLoading(false);
  }
};

/* -------------------------------------------------------
   SINGLE ENTRY POINT
------------------------------------------------------- */
export const handleUpload = async (params) => {
  const type = params?.type;

  if (type === "image") return handleImageUpload(params);
  if (type === "video") return handleVideoUpload(params);

  throw new Error("Invalid upload type. Use 'image' or 'video'.");
};
