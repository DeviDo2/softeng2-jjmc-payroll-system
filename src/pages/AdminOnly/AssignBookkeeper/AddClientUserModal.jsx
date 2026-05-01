import React, { useState, useEffect } from "react";
import {
  IonModal,
  IonContent,
  IonItem,
  IonLabel,
  IonSelect,
  IonSelectOption,
  IonButton,
  IonText,
  IonInput,
  IonSpinner,
} from "@ionic/react";

import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase"; // adjust path

export default function AddClientUserModal({ isOpen, onDismiss, onSubmit, companyId }) {
  const [loading, setLoading] = useState(false);
  const [clientStaff, setClientStaff] = useState([]);
  const [selectedStaff, setSelectedStaff] = useState("");
  const [roleToAssign, setRoleToAssign] = useState("viewer");
  const [notes, setNotes] = useState("");

  const [error, setError] = useState("");

  // Fetch existing client-staff accounts
  useEffect(() => {
    if (!isOpen) return;

    const fetchStaff = async () => {
      setLoading(true);
      setError("");

      try {
        const q = query(
          collection(db, "users"),
          where("role", "==", "client-staff")
        );

        const snap = await getDocs(q);
        const staff = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

        setClientStaff(staff);
      } catch (err) {
        console.error(err);
        setError("Failed to load client-staff. Try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchStaff();
  }, [isOpen]);

  const handleSubmit = () => {
    if (!selectedStaff) {
      setError("Select a client-staff user first.");
      return;
    }

    onSubmit({
      companyId,
      staffUserId: selectedStaff,
      role: roleToAssign,
      notes,
    });
  };

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onDismiss}>
      <IonContent className="ion-padding">
        <h2>Add Client-User Account</h2>

        {loading && (
          <div style={{ textAlign: "center", margin: "20px 0" }}>
            <IonSpinner />
            <p>Loading client-staff…</p>
          </div>
        )}

        {!loading && (
          <>
            {/* SELECT CLIENT STAFF */}
            <IonItem>
              <IonLabel position="stacked">Select Client-Staff User</IonLabel>
              <IonSelect
                value={selectedStaff}
                onIonChange={(e) => setSelectedStaff(e.detail.value)}
              >
                {clientStaff.map((s) => (
                  <IonSelectOption key={s.id} value={s.id}>
                    {s.fullName} ({s.email})
                  </IonSelectOption>
                ))}
                {clientStaff.length === 0 && (
                  <IonSelectOption disabled>
                    No client-staff available
                  </IonSelectOption>
                )}
              </IonSelect>
            </IonItem>

            {/* ROLE SELECT */}
            <IonItem>
              <IonLabel position="stacked">Permission Level</IonLabel>
              <IonSelect
                value={roleToAssign}
                onIonChange={(e) => setRoleToAssign(e.detail.value)}
              >
                <IonSelectOption value="viewer">Viewer Only</IonSelectOption>
                <IonSelectOption value="approver">Approver</IonSelectOption>
              </IonSelect>
            </IonItem>

            {/* NOTES */}
            <IonItem>
              <IonLabel position="stacked">Notes (Optional)</IonLabel>
              <IonInput
                value={notes}
                onIonChange={(e) => setNotes(e.detail.value)}
                placeholder="Anything the bookkeeper should know?"
              />
            </IonItem>

            {error && (
              <IonText color="danger">
                <p>{error}</p>
              </IonText>
            )}

            {/* ACTIONS */}
            <IonButton expand="block" onClick={handleSubmit}>
              Add Client User
            </IonButton>

            <IonButton expand="block" className="cancel-button" onClick={onDismiss}>
              Cancel
            </IonButton>
          </>
        )}
      </IonContent>
    </IonModal>
  );
}
