import React, { useEffect, useState } from "react";
import {
  IonApp,
  IonPage,
  IonContent,
  IonGrid,
  IonRow,
  IonCol,
  IonItem,
  IonLabel,
  IonButton,
  IonAccordionGroup,
  IonAccordion,
  IonList,
  IonCard,
  IonCardContent,
  IonIcon
} from "@ionic/react";

import { personOutline, briefcaseOutline } from "ionicons/icons";

import useAuthRole from "../../../hooks/useAuthRole";
import FooterNav from "../../../components/FooterNav";
import Sidebar from "../../../components/Sidebar";

import { db } from "../../../database-components/firebaseConfig";
import { doc, onSnapshot } from "firebase/firestore";

export default function ViewDetailsBase({ role: roleOverride }) {
  const { loading, user, role } = useAuthRole();
  const resolvedRole = roleOverride || role;

  const [details, setDetails] = useState({
    email: "",
    firstName: "",
    lastName: "",
    birthdate: "",
    gender: "",
    address: "",
    phoneNumber: "",
    company: "",
    position: "",
    department: "",
    salary: "",
    taxId: ""
  });

  // ⭐ Real-Time Listener for user document
  useEffect(() => {
    if (!loading && user?.uid) {
      const ref = doc(db, "users", user.uid);

      const unsubscribe = onSnapshot(
        ref, 
        (snap) => {
          if (snap.exists()) {
            setDetails({
              email: snap.data().email || "",
              firstName: snap.data().firstName || "",
              lastName: snap.data().lastName || "",
              birthdate: snap.data().birthdate || "",
              gender: snap.data().gender || "",
              address: snap.data().address || "",
              phoneNumber: snap.data().phoneNumber || "",
              company: snap.data().company || "",
              position: snap.data().position || "",
              department: snap.data().department || "",
              salary: snap.data().salary || snap.data().salaryRate || "",
              taxId: snap.data().taxId || snap.data().taxIdNumber || ""
            });
          }
        }
      );

      return () => unsubscribe();
    }
  }, [loading, user]);

  if (loading) return <p>Loading...</p>;
  if (!user) return <p>You are not logged in</p>;

  const handleCancel = () => window.history.back();

  // fields
  const personalFields = [
    { label: "Email", value: details.email },
    { label: "First Name", value: details.firstName },
    { label: "Last Name", value: details.lastName },
    { label: "Birthdate", value: details.birthdate },
    { label: "Gender", value: details.gender },
    { label: "Address", value: details.address }
  ];

  const workFields = [
    { label: "Phone", value: details.phoneNumber },
    { label: "Company", value: details.company },
    { label: "Position", value: details.position },
    { label: "Department", value: details.department },
    { label: "Salary", value: details.salary },
    { label: "Tax ID", value: details.taxId }
  ].filter((field) => {
    if (resolvedRole === "admin" || resolvedRole === "bookkeeper") {
      return field.label === "Phone";
    }

    return true;
  });

  const renderFields = (fields) =>
    fields.map((item, i) => (
      <IonItem key={i}>
        <IonLabel>
          <strong>{item.label}:</strong> {item.value || "—"}
        </IonLabel>
      </IonItem>
    ));

  return (
    <IonApp>
      <Sidebar />

      <IonPage id="main-page">
        <IonContent className="view-content">
          <IonGrid className="view-grid ion-padding">
            <IonRow>
              <IonCol className="ion-text-center">
                <h1 className="view-title">User Details</h1>
              </IonCol>
            </IonRow>

            {/* Accordions */}
            <IonAccordionGroup value="personal" expand="inset">

              {/* PERSONAL */}
              <IonAccordion value="personal">
                <IonCard slot="header">
                  <IonItem lines="none">
                    <IonIcon icon={personOutline} slot="start" />
                    <IonLabel>Personal Details</IonLabel>
                  </IonItem>
                </IonCard>
                <IonCardContent slot="content">
                  <IonList style={{ position: 'static' }}>{renderFields(personalFields)}</IonList>
                </IonCardContent>
              </IonAccordion>

              {/* WORK */}
              <IonAccordion value="work">
                <IonCard slot="header">
                  <IonItem lines="none">
                    <IonIcon icon={briefcaseOutline} slot="start" />
                    <IonLabel>Work Details</IonLabel>
                  </IonItem>
                </IonCard>
                <IonCardContent slot="content">
                  <IonList style={{ position: 'static' }}>{renderFields(workFields)}</IonList>
                </IonCardContent>
              </IonAccordion>
              
            </IonAccordionGroup>

            {/* Back Button */}
            <IonRow className="ion-margin-top">
              <IonCol>
                <IonButton expand="block" onClick={handleCancel}>
                  Back
                </IonButton>
              </IonCol>
            </IonRow>
          </IonGrid>
        </IonContent>

        <FooterNav />
      </IonPage>
    </IonApp>
  );
}
