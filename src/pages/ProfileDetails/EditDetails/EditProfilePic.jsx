// EditProfilePic.jsx
import React, { useState, useEffect } from "react";
import {
  IonApp,
  IonPage,
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButton,
  IonImg,
  IonGrid,
  IonRow,
  IonCol,
  IonLoading,
  IonToast,
} from "@ionic/react";

import "./EditDetailsBase.css";

import { auth, db } from "../../../database-components/firebaseConfig";
import { doc, updateDoc, onSnapshot } from "firebase/firestore";

function EditProfilePic() {
  const [selectedImage, setSelectedImage] = useState(null);
  const [preview, setPreview] = useState("");
  const [currentImage, setCurrentImage] = useState("");
  const [loading, setLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState("");

  // 🔥 Live update of current profile pic
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const unsub = onSnapshot(doc(db, "users", uid), (snap) => {
      if (snap.exists()) {
        const pic = snap.data().profilePic;
        setCurrentImage(pic);

        // store to local cache for instant reload
        if (pic) localStorage.setItem("cachedProfilePic", pic);
      }
    });

    return unsub;
  }, []);

  // -----------------------------
  // 1. Compress + crop (same logic)
  // -----------------------------
  const compressAndCropImage = (file) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = URL.createObjectURL(file);

      img.onload = () => {
        const size = Math.min(img.width, img.height);
        const canvas = document.createElement("canvas");
        canvas.width = 500;
        canvas.height = 500;

        const ctx = canvas.getContext("2d");
        const offsetX = (img.width - size) / 2;
        const offsetY = (img.height - size) / 2;

        ctx.drawImage(img, offsetX, offsetY, size, size, 0, 0, 500, 500);

        canvas.toBlob(
          (blob) => resolve(blob),
          "image/jpeg",
          0.75
        );
      };

      img.onerror = () => reject("Image processing failed");
    });
  };

  // -----------------------------
  // 2. File → preview (instant)
  // -----------------------------
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      return setToastMsg("Unsupported file type!");
    }

    try {
      setLoading(true);
      const processed = await compressAndCropImage(file);

      setSelectedImage(processed);
      setPreview(URL.createObjectURL(processed));
    } catch {
      setToastMsg("Failed to process image.");
    } finally {
      setLoading(false);
    }
  };

  // -----------------------------
  // 3. Upload to Cloudinary
  // -----------------------------
  const uploadToCloudinary = async (file) => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("upload_preset", "cloud_unsigned_upload");

    const CLOUD_NAME = "dwmunntbg";

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`,
      { method: "POST", body: fd }
    );

    return res.json();
  };

  // -----------------------------
  // 4. Upload handler
  // -----------------------------
  const handleUpload = async () => {
    if (!selectedImage) return setToastMsg("Select an image first.");

    try {
      setLoading(true);

      // upload to Cloudinary
      const uploadRes = await uploadToCloudinary(selectedImage);
      if (!uploadRes.secure_url) throw new Error("Cloudinary upload failed");

      const imageURL = uploadRes.secure_url;

      // update Firestore
      const uid = auth.currentUser.uid;
      await updateDoc(doc(db, "users", uid), { profilePic: imageURL });

      // instant client-side update
      localStorage.setItem("cachedProfilePic", imageURL);
      setCurrentImage(imageURL);

      setToastMsg("Profile picture updated!");

      // No need to refresh — just navigate back
      setTimeout(() => (window.location.href = "/profile-details-base"), 600);
    } catch (err) {
      console.error(err);
      setToastMsg("Upload failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonTitle>Edit Profile Picture</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="edit-content">
      
        <div className="full-height-wrapper">
           <div className="edit-card">
          <IonRow className="ion-text-center">
            <IonCol>
              <h2>Choose a new photo</h2>
                 </IonCol>
          </IonRow>

              {/* Preview first → fallback to current → fallback sample */}
              <IonImg
                src={
                  preview ||
                  currentImage ||
                  "/myprofilesample.png"
                }
                className="profile-preview"
               
              />
           

          <IonRow className="ion-margin-top ion-justify-content-center">
            <IonCol>
              <p style={{ color: "#666", marginTop: "8px" }}>
                Supported formats: JPEG, PNG, WEBP
              </p>
            </IonCol>
          </IonRow>
          
          <IonRow className="ion-margin-top ion-justify-content-center">
            <IonCol>
              <input
                type="file"
                accept="image/jpeg, image/png, image/webp"
                onChange={handleFileChange}
                style={{
                  marginTop: "16px",
                  padding: "10px",
                  width: "100%",
                  borderRadius: "8px",
                  border: "1px solid #ccc",
                }}
              />
            </IonCol>
          </IonRow>
          
          <IonRow className="ion-margin-top ion-justify-content-center">
            <IonCol>
              <IonButton
                expand="block"
                fill="outline"
                className="cancel-button"
                routerLink="/profile-details-base"
              >
                Cancel
              </IonButton>
            </IonCol>
             <IonCol size="12" size-md="6">
              <IonButton
                expand="block"
                className="ion-margin-top"
                onClick={handleUpload}
              >
                Save Picture
              </IonButton>
            </IonCol>
          </IonRow>
        </div>
        </div>

        <IonLoading isOpen={loading} message="Processing..." />
        <IonToast
          isOpen={toastMsg !== ""}
          message={toastMsg}
          duration={1400}
          onDidDismiss={() => setToastMsg("")}
        />
      </IonContent>
    </IonPage>
  );
}

export default EditProfilePic;
