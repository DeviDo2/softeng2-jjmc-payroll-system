// ===============================
// ConfirmModal.jsx
// ===============================
import React from "react";
import { IonModal, IonContent, IonButton } from "@ionic/react";

export default function ConfirmModal({ isOpen, onYes, onNo }) {
  return (
    <IonModal isOpen={isOpen} onDidDismiss={onNo}>
      <IonContent className="ion-padding">
        <h2>Are the client company details and file correct?</h2>

        <IonButton expand="block" color="success" onClick={onYes}>
          Yes
        </IonButton>

        <IonButton expand="block" color="danger" onClick={onNo}>
          No
        </IonButton>
      </IonContent>
    </IonModal>
  );
}
