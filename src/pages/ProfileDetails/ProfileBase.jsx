// ProfileBase.jsx
import React, { useState, useEffect } from "react";
import {
  IonPage,
  IonContent,
  IonText,
  IonImg,
  IonGrid,
  IonRow,
  IonCol,
  IonCard,
  IonCardContent,
  IonButton,
  IonIcon,
  IonAlert,
  IonApp,
} from "@ionic/react";

import { chevronForwardOutline } from "ionicons/icons";

import "./ProfileBase.css";

import useAuthRole from "../../hooks/useAuthRole";

import Sidebar from "../../components/Sidebar";
import FooterNav from "../../components/FooterNav";

import { auth, db } from "../../database-components/firebaseConfig";
import { doc, onSnapshot } from "firebase/firestore";

function ProfilePageBase() {
  const [showAlert, setShowAlert] = useState(false);
  const [profilePic, setProfilePic] = useState(null);
  const [username, setUsername] = useState("");

  // get user role
  const { role } = useAuthRole();

  // load user data
  useEffect(() => {
  const uid = auth.currentUser?.uid;
  if (!uid) return;

  const unsubscribe = onSnapshot(doc(db, "users", uid), (snap) => {
    if (!snap.exists()) return;

    const data = snap.data();

    setProfilePic(data.profilePic || null);

    const combinedName = `${data.firstName || ""} ${data.lastName || ""}`.trim();
    setUsername(combinedName || "Unnamed User");
  });

  return unsubscribe;
  }, []);

  return (
      <IonPage id="main-content">
        <IonContent fullscreen className="home-content">
          <IonImg
            src="/assets/Gradient-Ellipses.png"
            alt="Background"
            className="ellipse-bg"
          />

          <IonGrid className="ion-padding">
            <IonRow>
              <IonCol>
                <IonText>
                  <h1 className="myprofile-title">My Profile</h1>
                </IonText>
              </IonCol>
            </IonRow>

            {/* Profile Card */}
            <IonRow className="ion-justify-content-center">
              <IonCol size="12" size-md="6">
                <IonCard className="dashboard-card">
                  <IonCardContent>
                    <img
                      src={
                        profilePic
                          ? profilePic
                          : "/assets/myprofilesample.png"
                      }
                      alt="User"
                      className="profile-photo"
                      style={{
                        width: "150px",
                        height: "150px",
                        borderRadius: "50%",
                        objectFit: "cover",
                        display: "block",
                        margin: "auto",
                        marginBottom: "12px",
                      }}
                    />

                    <IonText className="username">{username}</IonText>

                    <IonButton
                      className="edit-profile-pic-btn"
                      expand="block"
                      fill="solid"
                      routerLink="/edit-profile-pic"
                    >
                      Edit Profile Picture
                    </IonButton>
                  </IonCardContent>
                </IonCard>
              </IonCol>
            </IonRow>

            {/* buttons */}
            <IonRow className="ion-justify-content-center">
              <IonCol size="12" size-md="6">
                <IonButton
                  className="edit-detail-btn"
                  expand="block"
                  fill="solid"
                  routerLink={`/edit-personal-details?role=${role}`}
                >
                  <IonText>Edit Personal Details</IonText>
                  <IonIcon icon={chevronForwardOutline} slot="end" />
                </IonButton>
                </IonCol>
                </IonRow>

                    
            <IonRow className="ion-justify-content-center">
              <IonCol size="12" size-md="6">
                <IonButton
                  className="edit-detail-btn"
                  expand="block"
                  fill="solid"
                  routerLink={`/edit-work-details?role=${role}`}
                >
                  <IonText>Edit Work Details</IonText>
                  <IonIcon icon={chevronForwardOutline} slot="end" />
                </IonButton>
                </IonCol>
                </IonRow>
                      
            <IonRow className="ion-justify-content-center">
              <IonCol size="12" size-md="6">
                <IonButton
                  className="edit-detail-btn"
                  expand="block"
                  fill="solid"
                  routerLink={`/view-details-base?role=${role}`}
                >
                  <IonText>View Details</IonText>
                  <IonIcon icon={chevronForwardOutline} slot="end" />
                </IonButton>
                </IonCol>
                </IonRow>

            <IonRow className="ion-justify-content-center">
              <IonCol size="12" size-md="6">  
                <IonButton
                  className="save-changes-btn"
                  expand="block"
                  fill="solid"
                  onClick={() => setShowAlert(true)}
                >
                  Save Changes
                </IonButton>
              </IonCol>
            </IonRow>
          </IonGrid>

          <IonAlert
            isOpen={showAlert}
            onDidDismiss={() => setShowAlert(false)}
            header="Confirmation"
            message="Your changes have been saved."
            buttons={["OK"]}
          />

        </IonContent>
        <FooterNav />

      </IonPage>
  );
}

export default ProfilePageBase;
