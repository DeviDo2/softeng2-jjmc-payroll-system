// AskInquiryForm.jsx
import React from "react";
import { IonCard, IonCardContent, IonInput, IonTextarea, IonButton, IonItem, IonText } from "@ionic/react";

export default function AskInquiryForm({ title, body, setTitle, setBody, onSubmit, onCancel }) {
  return (
    <IonCard className="forum-card">
      <IonCardContent>
        <IonText>
          <h3 className="subject-title">Title</h3>
        </IonText>
        <IonItem lines="solid">
          <IonInput
            placeholder="Short title"
            value={title}
            onIonChange={(e) => setTitle(e.detail.value)}
          />
        </IonItem>

        <IonText>
          <h3 className="subject-title ion-margin-top">Message</h3>
        </IonText>
        <IonItem lines="solid">
          <IonTextarea
            placeholder="Type your message..."
            value={body}
            rows={6}
            autoGrow
            onIonChange={(e) => setBody(e.detail.value)}
          />
        </IonItem>

        <IonButton expand="block" className="submit-button ion-margin-top" onClick={onSubmit}>
          Submit
        </IonButton>

        <IonButton className="cancel-button" fill="clear" onClick={onCancel}>
          Cancel
        </IonButton>
      </IonCardContent>
    </IonCard>
  );
}
