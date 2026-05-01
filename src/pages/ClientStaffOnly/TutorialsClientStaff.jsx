import React, { useState, useEffect } from "react";
import {
  IonApp,
  IonPage,
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonSearchbar,
  IonCard,
  IonCardContent,
  IonImg,
  IonText,
  IonButton,
  IonModal,
  IonGrid,
  IonRow,
  IonCol,
  IonIcon,
} from "@ionic/react";

import { closeOutline } from "ionicons/icons";
import { db } from "../../database-components/firebaseConfig";
import { collection, onSnapshot } from "firebase/firestore";

import Sidebar from "../../components/Sidebar";
import FooterNav from "../../components/FooterNav";
import "./TutorialsClientStaff.css";

const TutorialsClientStaff = () => {
  const [tutorials, setTutorials] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedVideo, setSelectedVideo] = useState(null);

  const tutorialsRef = collection(db, "tutorialVideos");

  // FETCH VIDEOS LIVE
  useEffect(() => {
    const unsubscribe = onSnapshot(tutorialsRef, (snap) => {
      setTutorials(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsubscribe;
  }, []);

  // 🔍 SEARCH FILTER
  const safeSearch = (search || "").toLowerCase();
  const filteredTutorials = tutorials.filter((tutorial) =>
    (tutorial?.title || "").toLowerCase().includes(safeSearch)
  );

  return (
    <IonApp>
      <Sidebar />

      <IonPage id="main-content">
        <IonContent className="tutorial-content">
          {/* Background Ellipse */}
          <IonImg src="/assets/Gradient-Ellipses.png" className="ellipse-bg" />

          {/* HEADER */}
          <IonGrid>
            <IonRow>
              <IonCol className="ion-text-center">
                <IonTitle className="tutorial-title" style={{ marginTop: 20 }}>
                  Tutorials
                </IonTitle>
              </IonCol>
            </IonRow>
          </IonGrid>

          {/* SEARCH BAR */}
          <IonGrid>
            <IonRow>
              <IonCol>
                <IonSearchbar
                  value={search}
                  placeholder="Search video..."
                  onIonInput={(e) => setSearch(e.detail.value ?? "")}
                />
              </IonCol>
            </IonRow>
          </IonGrid>

          {/* VIDEO COUNT */}
          <IonGrid>
            <IonRow>
              <IonCol>
                <IonText>
                  <h2 className="video-count">{filteredTutorials.length} Videos</h2>
                </IonText>
              </IonCol>
            </IonRow>
          </IonGrid>

          {/* VIDEO LIST */}
          <IonGrid>
            {filteredTutorials.map((item) => (
              <IonRow key={item.id}>
                <IonCol size="12" sizeMd="6" sizeLg="12">
                  <IonCard className="video-card">
                    <IonCardContent>
                      <IonGrid>
                        <IonRow>
                          {/* Thumbnail */}
                          <IonCol size="4">
                            <img
                              src={item.thumbnailUrl}
                              alt="thumbnail"
                              style={{ width: "100%", borderRadius: "8px" }}
                            />
                          </IonCol>

                          {/* Details */}
                          <IonCol size="8">
                            <IonText className="video-title">
                              {item.title}
                            </IonText>
                            <p className="video-description">
                              {item.description}
                            </p>
                            <IonButton
                              size="small"
                              expand="block"
                              onClick={() => setSelectedVideo(item)}
                            >
                              Watch Video
                            </IonButton>
                          </IonCol>
                        </IonRow>
                      </IonGrid>
                    </IonCardContent>
                  </IonCard>
                </IonCol>
              </IonRow>
            ))}
          </IonGrid>

          {/* WATCH MODAL */}
          <IonModal
            isOpen={!!selectedVideo}
            onDidDismiss={() => setSelectedVideo(null)}
          >
            <IonHeader>
              <IonToolbar color="light">
                <IonTitle>{selectedVideo?.title || "Video"}</IonTitle>
                <IonButton
                  slot="end"
                  fill="clear"
                  onClick={() => setSelectedVideo(null)}
                >
                  <IonIcon icon={closeOutline} />
                </IonButton>
              </IonToolbar>
            </IonHeader>

            <IonContent className="ion-padding">
              {selectedVideo && (
                <video
                  controls
                  style={{
                    width: "100%",
                    borderRadius: "12px",
                    marginBottom: "16px",
                  }}
                >
                  <source src={selectedVideo.videoUrl} type="video/mp4" />
                </video>
              )}
              <IonText>
                <p>{selectedVideo?.description}</p>
              </IonText>
            </IonContent>
          </IonModal>
        </IonContent>

        <FooterNav />
      </IonPage>
    </IonApp>
  );
};

export default TutorialsClientStaff;
