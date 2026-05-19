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
          <IonImg
            src="/Gradient-Ellipses.png"
            alt="Background Ellipse"
            className="ellipse-bg"
          />

          <div className="full-height-wrapper">
            <div className="tutorial-card-container">
              {/* Title and Subheader */}
              <h1 className="tutorial-title">Tutorials</h1>
              <p className="tutorial-subheader">
                Quick walkthroughs to help you move faster.
              </p>

              <IonCard className="tutorial-search-card">
                <IonCardContent>
                  <IonRow className="tutorial-search-row">
                    <IonCol size="12" sizeMd="7">
                      <IonSearchbar
                        className="tutorial-searchbar"
                        value={search}
                        placeholder="Search tutorials..."
                        onIonInput={(e) => setSearch(e.detail.value ?? "")}
                      />
                    </IonCol>
                    <IonCol size="12" sizeMd="5" className="video-count-col">
                      <div className="video-count">
                        {filteredTutorials.length}{" "}
                        {filteredTutorials.length === 1
                          ? "Tutorial"
                          : "Tutorials"}
                      </div>
                    </IonCol>
                  </IonRow>
                </IonCardContent>
              </IonCard>

              <IonCard className="tutorial-list-card">
                <IonCardContent>
                  {filteredTutorials.length === 0 ? (
                    <div className="empty-state">
                      <h3>No tutorials yet</h3>
                      <p>Try a different search or check back later.</p>
                    </div>
                  ) : (
                    <div className="video-grid">
                      {filteredTutorials.map((item) => (
                        <IonCard key={item.id} className="video-card">
                          <IonCardContent className="video-card-content">
                            <IonGrid>
                              <IonRow>
                                <IonCol size="12" sizeMd="4">
                                  <img
                                    src={
                                      item.thumbnailUrl ||
                                      "/video-placeholder.png"
                                    }
                                    alt="video thumbnail"
                                    className="video-thumb"
                                  />
                                </IonCol>
                                <IonCol size="12" sizeMd="8">
                                  <div className="video-info">
                                    <div>
                                      <h3 className="video-title">
                                        {item.title}
                                      </h3>
                                      <p className="video-description">
                                        {item.description}
                                      </p>
                                    </div>
                                    <IonButton
                                      size="small"
                                      className="watch-btn"
                                      onClick={() => setSelectedVideo(item)}
                                    >
                                      Watch Video
                                    </IonButton>
                                  </div>
                                </IonCol>
                              </IonRow>
                            </IonGrid>
                          </IonCardContent>
                        </IonCard>
                      ))}
                    </div>
                  )}
                </IonCardContent>
              </IonCard>
            </div>
          </div>

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

            <IonContent className="watch-modal-content ion-padding">
              {selectedVideo && (
                <video
                  controls
                  className="watch-video"
                >
                  <source src={selectedVideo.videoUrl} type="video/mp4" />
                </video>
              )}
              <IonText className="watch-description">
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
