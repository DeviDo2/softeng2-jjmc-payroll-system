import React, { useState, useEffect, useRef } from "react";
import {
  IonPage,
  IonContent,
  IonGrid,
  IonRow,
  IonCol,
  IonApp,
  IonButton,
  IonToast,
  IonImg,
  IonText,
} from "@ionic/react";

import {
  collection,
  addDoc,
  updateDoc,
  doc,
  onSnapshot,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";

import { db, auth } from "../../../database-components/firebaseConfig";

import Sidebar from "../../../components/Sidebar";
import FooterNav from "../../../components/FooterNav";

import AddClientModal from "./AddClientModal";
import ConfirmModal from "./ConfirmModal";
import AssignRow from "./AssignRow";

import "./AssignBookeeper.css";

export default function AssignBookkeeper() {
  const [role, setRole] = useState(null);
  const [clientCompanies, setClients] = useState([]);
  const [bookkeepers, setBookkeepers] = useState([]);

  const [modal, setModal] = useState({ add: false, confirm: false });
  const [pendingData, setPendingData] = useState(null);

  const [toastMessage, setToastMessage] = useState("");
  const scrollPos = useRef(0);

  // Load Role
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const loadRole = async () => {
      const snap = await getDoc(doc(db, "users", user.uid));
      setRole(snap.data()?.role || null);
    };

    loadRole();
  }, []);

  // Live Firestore updates
  useEffect(() => {
    const unsubClients = onSnapshot(collection(db, "clientCompanies"), (snap) => {
      setClients(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    const unsubBk = onSnapshot(collection(db, "users"), (snap) => {
      setBookkeepers(
        snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((u) => u.role === "bookkeeper")
      );
    });

    return () => {
      unsubClients();
      unsubBk();
    };
  }, []);

  // Scroll Helpers
  const saveScroll = () => (scrollPos.current = window.scrollY);
  const restoreScroll = () =>
    setTimeout(() => window.scrollTo(0, scrollPos.current), 50);

  // Add Client Step 1
  const handleAddSubmit = (data) => {
    saveScroll();
    setPendingData(data);
    setModal({ add: false, confirm: true });
  };

  // Add Client Step 2
  const handleConfirmAdd = async () => {
    try {
      const {
        clientName,
        file,
        parsedCSV,
        tag,
        businessType,
        assignedTo,
      } = pendingData;

      const csvText = await file.text();

      await addDoc(collection(db, "clientCompanies"), {
        name: clientName,
        csv: csvText,
        parsedCSV,
        tag,
        businessType,
        bookkeeperId: assignedTo !== "NONE" ? assignedTo : null,
        status: assignedTo === "NONE" ? "Awaiting Assignment" : "Assigned",
        createdAt: new Date(),
      });

      setToastMessage(`${clientName} added successfully.`);
    } catch (err) {
      console.error(err);
      setToastMessage("Failed to add client.");
    } finally {
      setPendingData(null);
      setModal({ add: false, confirm: false });
      restoreScroll();
    }
  };

  const handleCancelAdd = () => {
    setModal({ add: false, confirm: false });
    restoreScroll();
  };

  // Assign Bookkeeper (with proper conflict check)
  const assignBookkeeper = async (client, bk) => {
    try {
      if (bk.id !== "NONE") {
        // Check if bookkeeper is already assigned elsewhere
        const qRef = query(
          collection(db, "clientCompanies"),
          where("bookkeeperId", "==", bk.id)
        );

        const results = await getDocs(qRef);

        if (!results.empty) {
          const assignedClient = results.docs[0].data().name || "another client";

          alert(`Declined: Bookkeeper is already assigned to ${assignedClient}`);
          return;
        }
      }

      await updateDoc(doc(db, "clientCompanies", client.id), {
        bookkeeperId: bk.id !== "NONE" ? bk.id : null,
        status: bk.id === "NONE" ? "Awaiting Assignment" : "Assigned",
      });

      if (bk.id !== "NONE") {
        await addDoc(collection(db, "notifications"), {
          userId: bk.id,
          message: `You have been assigned: ${client.name}`,
          createdAt: new Date(),
          read: false,
        });
      }

      setToastMessage("Bookkeeper updated.");
    } catch (err) {
      console.error(err);
      setToastMessage("Assignment failed.");
    }
  };

  return (
    <IonApp>
      <Sidebar />

      <IonPage id="assign-content">
        <IonContent>
          <IonImg
            src="../assets/Gradient-Ellipses.png"
            alt="Background Ellipse"
            className="ellipse-bg"
          />

          <IonGrid id="ion-padding">
            <IonRow>
              <IonCol>
                <IonText>
               <h1 className="assign-main-title">Client Companies</h1>
              <p className="assign-subheader">
                Add clients and assign them to your trusted bookkeeper
              </p>
                </IonText>
              </IonCol>
            </IonRow>

            <IonRow>
              <IonCol size="12" sizeMd="2">
                <IonButton
                  expand="block"
                  className="add-client-btn"
                  onClick={() => setModal({ ...modal, add: true })}
                >
                  + Add Client
                </IonButton>
              </IonCol>
            </IonRow>

            <IonRow>
              <IonCol>
                <div className="table-wrapper">
                <table className="results-data-table">
                  <thead>
                    <tr>
                      <th>Client</th>
                      <th>CSV File</th>
                      <th>Bookkeeper</th>
                      <th>Status</th>
                      <th>Assign</th>
                    </tr>
                  </thead>

                  <tbody>
                    {clientCompanies.map((client) => (
                      <AssignRow
                        key={client.id}
                        client={client}
                        bookkeepers={bookkeepers}
                        onAssign={assignBookkeeper}
                      />
                    ))}
                  </tbody>
                </table>
                </div>
              </IonCol>
            </IonRow>
          </IonGrid>
        </IonContent>

        <FooterNav />

        {/* Modals */}
        <AddClientModal
          isOpen={modal.add}
          onDismiss={() => setModal({ ...modal, add: false })}
          onSubmit={handleAddSubmit}
        />

        <ConfirmModal
          isOpen={modal.confirm}
          onYes={handleConfirmAdd}
          onNo={handleCancelAdd}
        />

        <IonToast
          isOpen={toastMessage.length > 0}
          message={toastMessage}
          duration={2000}
          onDidDismiss={() => setToastMessage("")}
        />
      </IonPage>
    </IonApp>
  );
}
