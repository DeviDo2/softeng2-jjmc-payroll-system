import React from "react";
import {
  IonApp,
  IonPage,
  IonContent,
  IonText,
  IonImg,
  IonGrid,
  IonRow,
  IonCol,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
} from "@ionic/react";

import "./HomePageBase.css";
import useAuthRole from "../../hooks/useAuthRole";

import Sidebar from "../../components/Sidebar";
import FooterNav from "../../components/FooterNav";

function HomePageBase() {
  const { loading, user, roleConfig } = useAuthRole();

  if (loading) return <p>Loading...</p>;
  if (!user) return <p>You are not logged in</p>;

  const role = user?.role?.toLowerCase() || "client-staff";
  const username =
    user?.firstName || localStorage.getItem("username") || "User";

  const cfg =
    roleConfig?.[role] ||
    roleConfig?.["client-staff"] || {
      greetingRole: "User",
      dashboardCards: [],
      menuItems: [],
    };

  const { dashboardCards = [] } = cfg;

  return (
    <IonApp>
      {/* 👇 Sidebar must be INSIDE IonApp, but OUTSIDE IonPage */}
      <Sidebar />

      <IonPage id="main-content">
        <IonContent fullscreen className="home-content">
          <IonImg src="/Gradient-Ellipses.png" className="ellipse-bg" />

          <IonGrid>
            <IonRow>
              <IonCol>
                <IonText>
                  <h1 className="home-title">Hello, {username}!</h1>
                  <p className="welcome-subtitle">
                    Welcome to JJMC Tax and Accounting
                  </p>
                </IonText>
              </IonCol>
            </IonRow>

            <IonRow className="ion-justify-content-center">
              {dashboardCards.map((card, i) => (
                <IonCol key={i} size="12" size-md="6" size-lg="5" size-xl="6">
                  <IonCard routerLink={card.path} className="dashboard-card">
                    <IonCardHeader>
                      <IonCardTitle>{card.title}</IonCardTitle>
                    </IonCardHeader>
                    <IonCardContent>
                      <IonText>
                        <p>{card.subtitle}</p>
                      </IonText>
                    </IonCardContent>
                  </IonCard>
                </IonCol>
              ))}
            </IonRow>
          </IonGrid>
        </IonContent>

        {/* Footer Nav */}
        <FooterNav />
      </IonPage>
    </IonApp>
  );
}

export default HomePageBase;
