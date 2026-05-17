// src/pages/Computation/ClientList/ClientListBase.jsx
import React, { useEffect, useState } from "react";
import {
  IonApp,
  IonPage,
  IonContent,
  IonGrid,
  IonRow,
  IonCol,
  IonText,
  IonButton,
  IonSpinner,
  IonImg,
  IonCard,
  IonCardContent,
} from "@ionic/react";

import { useHistory } from "react-router-dom";

import Sidebar from "../../../components/Sidebar";
import FooterNav from "../../../components/FooterNav";

// Firebase
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../../database-components/firebaseConfig";

// Hooks
import useAuthRole from "../../../hooks/useAuthRole";

import "./ClientListBase.css";

const ClientListBase = () => {
  const { loading, user } = useAuthRole();
  const [clientCompanies, setClientCompanies] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const history = useHistory();

  // ------------------------------------------------------
  // Load assigned clients
  // ------------------------------------------------------
  useEffect(() => {
    if (!user) return;

    const loadClients = async () => {
      setIsLoading(true);
      try {
        const q = query(
          collection(db, "clientCompanies"),
          where("bookkeeperId", "==", user.uid)
        );
        const snap = await getDocs(q);
        const list = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setClientCompanies(list);
      } catch (err) {
        console.error("Error loading assigned clients:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadClients();
  }, [user]);

  // ------------------------------------------------------
  // Handle client selection
  // ------------------------------------------------------
  const handleSelectClient = (client) => {
    history.push(
      `/bookkeeper-client-list?clientId=${client.id}&clientName=${encodeURIComponent(
        client.name
      )}`
    );
  };

  // ------------------------------------------------------
  // UI States
  // ------------------------------------------------------
  if (loading) return <p>Loading user info...</p>;
  if (!user) return <p>You are not logged in.</p>;

  return (
    <IonApp>
      <Sidebar />

      <IonPage id="main-content">
        <IonContent fullscreen className="client-list-content">
          <IonImg
            src="/Gradient-Ellipses.png"
            className="ellipse-bg"
            onError={(e) => (e.target.style.display = "none")}
          />

          <IonGrid className="ion-padding">
            <IonRow className="ion-text-center">
              <IonCol>
                <IonText>
                  <h1>Select a Client Company</h1>
                </IonText>

                {isLoading && <IonSpinner name="crescent" />}

                {!isLoading && clientCompanies.length === 0 && (
                  <IonCard color="warning">
                    <IonCardContent className="ion-text-center">
                      <IonText>
                        <p>No clients assigned yet.</p>
                        <p>Please contact your admin.</p>
                      </IonText>
                    </IonCardContent>
                  </IonCard>
                )}

                {!isLoading &&
                  clientCompanies.map((client) => (
                    <IonButton
                      key={client.id}
                      className="client-select-btn"
                      expand="block"
                      onClick={() => handleSelectClient(client)}
                    >
                      {client.name}
                    </IonButton>
                  ))}
              </IonCol>
            </IonRow>
          </IonGrid>
        </IonContent>

        <FooterNav />
      </IonPage>
    </IonApp>
  );
};

export default ClientListBase;
