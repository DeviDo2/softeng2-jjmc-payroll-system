import React, { useState, useEffect } from "react";
import {
  IonApp,
  IonPage,
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonInput,
  IonSearchbar,
  IonButton,
  IonCard,
  IonCardContent,
  IonModal,
  IonGrid,
  IonRow,
  IonCol,
  IonItem,
  IonLabel,
  IonToast,
  IonSpinner,
  IonText,
  IonAlert,
  IonImg,
} from "@ionic/react";

import {
  collection,
  addDoc,
  onSnapshot,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";

import { db } from "../../database-components/firebaseConfig";
import useAuthRole from "../../hooks/useAuthRole";

import { uploadMedia } from "../../database-components/handleUpload";
import { deleteFromCloudinary } from "../../database-components/deleteFromCloudinary";

import "./ManageTutorialsAdmin.css";
import Sidebar from "../../components/Sidebar";
import FooterNav from "../../components/FooterNav";

const tutorialsRef = collection(db, "tutorialVideos");

const ManageTutorialsAdmin = () => {
  const [tutorials, setTutorials] = useState([]);
  const [search, setSearch] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [videoFile, setVideoFile] = useState(null);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");

  const [editModal, setEditModal] = useState(false);
  const [editData, setEditData] = useState(null);

  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ open: false, message: "" });
  
  // Confirmation dialogs
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showUpdateConfirm, setShowUpdateConfirm] = useState(false);
  const [videoToDelete, setVideoToDelete] = useState(null);
  const [videoToUpdate, setVideoToUpdate] = useState(null);

  const { user } = useAuthRole();

  /* --------------------------------------------------
     LIVE FETCH
  -------------------------------------------------- */
  useEffect(() => {
    const unsubscribe = onSnapshot(tutorialsRef, (snap) => {
      setTutorials(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsubscribe;
  }, []);

  /* --------------------------------------------------
     UPLOAD VIDEO (refactored to use uploadMedia)
  -------------------------------------------------- */
  const handleUploadVideo = async () => {
    if (!videoFile || !title || !desc) {
      return setToast({ open: true, message: "Please fill in all fields." });
    }

    setLoading(true);

    try {
      const { url: videoUrl, publicId } = await uploadMedia(videoFile, "video");

      await addDoc(tutorialsRef, {
        title,
        description: desc,
        videoUrl,
        thumbnailUrl: null,
        publicId,
        createdAt: new Date(),
      });

      setToast({ open: true, message: "Uploaded successfully!" });

      setShowModal(false);
      setVideoFile(null);
      setTitle("");
      setDesc("");

    } catch (err) {
      console.error("Upload error:", err);
      setToast({ open: true, message: err.message || "Upload failed." });
    } finally {
      setLoading(false);
    }
  };

  /* --------------------------------------------------
     UPDATE VIDEO WITH CONFIRMATION
  -------------------------------------------------- */
  const confirmUpdateVideo = (video) => {
    setVideoToUpdate(video);
    setShowUpdateConfirm(true);
  };

  const handleUpdateVideo = async () => {
    if (!editData) return;

    setLoading(true);
    try {
      await updateDoc(doc(db, "tutorialVideos", editData.id), {
        title: editData.title,
        description: editData.description,
      });

      setToast({ open: true, message: "Updated successfully!" });
      setEditModal(false);

    } catch (err) {
      console.error(err);
      setToast({ open: true, message: "Update failed." });

    } finally {
      setLoading(false);
      setShowUpdateConfirm(false);
      setVideoToUpdate(null);
    }
  };

  /* --------------------------------------------------
     DELETE VIDEO WITH CONFIRMATION
  -------------------------------------------------- */
  const confirmDeleteVideo = (video) => {
    setVideoToDelete(video);
    setShowDeleteConfirm(true);
  };

  const handleDeleteVideo = async () => {
    if (!videoToDelete) return;

    try {
      setLoading(true);
      
      console.log("Starting delete for video:", videoToDelete.id);
      
      // 1. Delete from Firestore
      await deleteDoc(doc(db, "tutorialVideos", videoToDelete.id));
      console.log("Firestore delete successful");
      
      // 2. Try Cloudinary delete (optional)
      if (videoToDelete.publicId && typeof videoToDelete.publicId === "string" && videoToDelete.publicId.length > 5) {
        try {
          await deleteFromCloudinary(videoToDelete.publicId, "video");
          console.log("Cloudinary delete successful");
        } catch (cloudErr) {
          console.warn("Cloudinary delete failed:", cloudErr.message);
        }
      }
      
      setToast({ open: true, message: "Video deleted successfully!" });
      
    } catch (err) {
      console.error("DELETE ERROR:", err);
      
      if (err.code === "permission-denied") {
        setToast({ 
          open: true, 
          message: "Permission denied. Only admins can delete videos." 
        });
      } else {
        setToast({ 
          open: true, 
          message: `Error: ${err.code || "Unknown error"}` 
        });
      }
    } finally {
      setLoading(false);
      setShowDeleteConfirm(false);
      setVideoToDelete(null);
    }
  };

  /* --------------------------------------------------
     FILTERING
  -------------------------------------------------- */
  const filteredTutorials = tutorials.filter((t) =>
    (t.title || "").toLowerCase().includes(search.toLowerCase())
  );

  /* --------------------------------------------------
     RENDER
  -------------------------------------------------- */
  return (
    <IonApp>
      <Sidebar />
      <IonPage>

        <IonContent className="tutorial-content" fullscreen>
          <IonImg
                      src="../assets/Gradient-Ellipses.png"
                      alt="Background Ellipse"
                      className="ellipse-bg"
                    />
          <div className="full-height-wrapper" style={{ padding: '16px' }}>
          <div className="tutorial-card-container">
            {/* Title and Subheader */}
            <h1 className="tutorial-title">Manage Tutorial Videos</h1>
            <p className="tutorial-subheader">Upload a new tutorial for your users</p>

            {/* Search bar – rounded */}
            <IonSearchbar
              className="tutorial-searchbar"
              value={search}
              onIonInput={(e) => setSearch(e.detail.value ?? "")}
              placeholder="Search tutorials..."
            />

            {/* Video counter */}
            <div className="video-count">
              {filteredTutorials.length} {filteredTutorials.length === 1 ? 'Tutorial' : 'Tutorials'}
            </div>

            {/* List of videos */}
            {loading && <IonSpinner className="ion-text-center" />}

            <div className="video-grid">
              {filteredTutorials.map((item) => (
                <IonCard key={item.id} className="video-card">
                  <IonCardContent className="video-card-content">
                    <IonGrid>
                      <IonRow>
                        <IonCol size="12" size-md="4">
                          <img
                            src={item.thumbnailUrl || "/assets/video-placeholder.png"}
                            alt="thumbnail"
                            className="video-thumb"
                          />
                        </IonCol>
                        <IonCol size="12" size-md="8">
                          <div className="video-info">
                            <div>
                              <h3 className="video-title">{item.title}</h3>
                              <p className="video-description">{item.description}</p>
                            </div>
                            <div className="video-actions">
                              <IonButton
                                size="small"
                                className="edit-btn"
                                onClick={() => {
                                  setEditData(item);
                                  setEditModal(true);
                                }}
                              >
                                Edit
                              </IonButton>
                              <IonButton
                                size="small"
                                className="delete-btn"
                                onClick={() => confirmDeleteVideo(item)}
                              >
                                Delete
                              </IonButton>
                            </div>
                          </div>
                        </IonCol>
                      </IonRow>
                    </IonGrid>
                  </IonCardContent>
                </IonCard>
              ))}
            </div>

            {/* Upload button below videos */}
            <div className="upload-button-wrapper">
              <IonButton
                className="upload-tutorial-btn"
                onClick={() => setShowModal(true)}
              >
                + Upload New Tutorial
              </IonButton>
            </div>
          </div>
        </div>


          {/* Upload Modal */}
          <IonModal isOpen={showModal} onDidDismiss={() => setShowModal(false)}>
            <IonHeader>
              <IonToolbar>
                <IonTitle>Upload Tutorial</IonTitle>
              </IonToolbar>
            </IonHeader>

            <IonContent className="ion-padding">
              <IonItem>
                <IonLabel position="stacked">Title</IonLabel>
                <IonInput
                  value={title}
                  onIonChange={(e) => setTitle(e.detail.value)}
                />
              </IonItem>

              <IonItem>
                <IonLabel position="stacked">Description</IonLabel>
                <IonInput
                  value={desc}
                  onIonChange={(e) => setDesc(e.detail.value)}
                />
              </IonItem>

              <IonItem>
                <input
                  type="file"
                  accept="video/*"
                  onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                />
              </IonItem>

              <IonButton
                  className="upload-submit-btn"
                  onClick={handleUploadVideo}
                  disabled={loading}
                >
                  {loading ? <IonSpinner name="crescent" /> : "Upload"}
                </IonButton>
                <IonButton
                  className="modal-cancel-btn"
                  fill="solid"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
              </IonButton>
            </IonContent>
          </IonModal>

          {/* Edit Modal */}
          <IonModal isOpen={editModal} onDidDismiss={() => setEditModal(false)}>
            <IonHeader>
              <IonToolbar>
                <IonTitle>Edit Tutorial</IonTitle>
              </IonToolbar>
            </IonHeader>

            <IonContent className="ion-padding">
              {editData && (
                <>
                  <IonItem>
                    <IonLabel position="stacked">Title</IonLabel>
                    <IonInput
                      value={editData.title}
                      onIonChange={(e) =>
                        setEditData({ ...editData, title: e.detail.value })
                      }
                    />
                  </IonItem>

                  <IonItem>
                    <IonLabel position="stacked">Description</IonLabel>
                    <IonInput
                      value={editData.description}
                      onIonChange={(e) =>
                        setEditData({ ...editData, description: e.detail.value })
                      }
                    />
                  </IonItem>

                  <IonButton 
                  className="upload-submit-btn" 
                  onClick={() => confirmUpdateVideo(editData)}>
                    {loading ? <IonSpinner /> : "Update Tutorial"}
                  </IonButton>

                  <IonButton className="modal-cancel-btn" onClick={() => setEditModal(false)}>
                    Cancel
                  </IonButton>
                </>
              )}
            </IonContent>
          </IonModal>

          {/* Delete Confirmation Alert */}
          <IonAlert
            isOpen={showDeleteConfirm}
            onDidDismiss={() => setShowDeleteConfirm(false)}
            header="Confirm Delete"
            message={`Are you sure you want to delete "${videoToDelete?.title}"? This action cannot be undone.`}
            buttons={[
              {
                text: 'Cancel',
                role: 'cancel',
                handler: () => {
                  setShowDeleteConfirm(false);
                  setVideoToDelete(null);
                }
              },
              {
                text: 'Delete',
                role: 'destructive',
                handler: handleDeleteVideo
              }
            ]}
          />

          {/* Update Confirmation Alert */}
          <IonAlert
            isOpen={showUpdateConfirm}
            onDidDismiss={() => setShowUpdateConfirm(false)}
            header="Confirm Update"
            message={`Are you sure you want to update "${videoToUpdate?.title}"?`}
            buttons={[
              {
                text: 'Cancel',
                role: 'cancel',
                handler: () => {
                  setShowUpdateConfirm(false);
                  setVideoToUpdate(null);
                }
              },
              {
                text: 'Update',
                handler: handleUpdateVideo
              }
            ]}
          />

          <IonToast
            isOpen={toast.open}
            onDidDismiss={() => setToast({ open: false, message: "" })}
            message={toast.message}
            duration={2000}
          />
        </IonContent>

        <FooterNav />
      </IonPage>
    </IonApp>
  );
};

export default ManageTutorialsAdmin;