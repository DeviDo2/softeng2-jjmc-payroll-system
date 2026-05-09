import {
  IonPopover,
  IonList,
  IonItem,
  IonLabel,
  IonSpinner
} from "@ionic/react";

import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../../database-components/firebaseConfig";

const getDisplayName = (user) =>
  [user.firstName, user.lastName].filter(Boolean).join(" ") ||
  user.displayName ||
  user.email ||
  "Unnamed Bookkeeper";

export default function BookkeeperSelectPopover({
  isOpen,
  event,
  onDismiss,
  onSelect,
}) {
  const [bookkeepers, setBookkeepers] = useState([]);
  const [loading, setLoading] = useState(false);

  // sanitize Ionic event
  const safeEvent = event ? { ...event } : undefined;

  useEffect(() => {
    if (!isOpen) return;

    const fetchBookkeepers = async () => {
      setLoading(true);

      try {
        const usersRef = collection(db, "users");
        const snapshot = await getDocs(usersRef);

        const list = snapshot.docs
          .map((doc) => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
              fullName: getDisplayName(data),
            };
          })
          .filter((user) => user.role?.toLowerCase() === "bookkeeper");

        setBookkeepers(list);
      } catch (error) {
        console.error("Error fetching bookkeepers:", error);
        setBookkeepers([]);
      }

      setLoading(false);
    };

    fetchBookkeepers();
  }, [isOpen]);

  return (
    <IonPopover isOpen={isOpen} event={safeEvent} onDidDismiss={onDismiss}>
      <IonList>

        {/* UNASSIGN OPTION */}
        <IonItem button onClick={() => onSelect({ id: "NONE" })}>
          <IonLabel>None / Unassigned</IonLabel>
        </IonItem>

        {/* LOADING STATE */}
        {loading && (
          <IonItem>
            <IonLabel>Loading bookkeepers...</IonLabel>
            <IonSpinner name="crescent" slot="end" />
          </IonItem>
        )}

        {/* DATA */}
        {!loading && bookkeepers.length > 0 &&
          bookkeepers.map((bk) => (
            <IonItem key={bk.id} button onClick={() => onSelect(bk)}>
              <IonLabel>{bk.fullName}</IonLabel>
            </IonItem>
          ))}

        {/* EMPTY STATE */}
        {!loading && bookkeepers.length === 0 && (
          <IonItem>
            <IonLabel>No bookkeepers found</IonLabel>
          </IonItem>
        )}
      </IonList>
    </IonPopover>
  );
}
