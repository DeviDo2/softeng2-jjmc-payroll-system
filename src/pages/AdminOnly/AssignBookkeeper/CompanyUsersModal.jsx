import React from "react";
import {
  IonModal,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonButton,
  IonText,
} from "@ionic/react";

export default function CompanyUsersModal({
  isOpen,
  onDismiss,
  users = [],
  onRemove,
}) {
  return (
    <IonModal isOpen={isOpen} onDidDismiss={onDismiss}>
      <IonContent className="ion-padding">
        <h2>Assigned Users</h2>

        {users.length === 0 && (
          <IonText>
            <p>No client-staff assigned yet.</p>
          </IonText>
        )}

        <IonList>
          {users.map((u) => (
            <IonItem key={u.id}>
              <IonLabel>
                <strong>{u.fullName}</strong>
                <br />
                {u.email}
              </IonLabel>

              <IonButton
                slot="end"
                color="danger"
                onClick={() => onRemove(u.id)}
              >
                Remove
              </IonButton>
            </IonItem>
          ))}
        </IonList>

        <IonButton expand="block" onClick={onDismiss}>
          Close
        </IonButton>
      </IonContent>
    </IonModal>
  );
}
