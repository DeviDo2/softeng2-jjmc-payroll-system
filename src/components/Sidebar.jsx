import {
  IonMenu,
  IonContent,
  IonItem,
  IonIcon,
  IonLabel,
  IonMenuToggle,
  IonImg,
  IonButton,
  IonSpinner,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonGrid,
  IonRow,
  IonCol,
  IonText,
} from "@ionic/react";
import { logOutOutline } from "ionicons/icons";

import useAuthRole from "../hooks/useAuthRole";
import "./Sidebar.css";

export default function Sidebar() {
  const { loading, role, roleConfig } = useAuthRole();

  if (loading) return <IonSpinner />;

  if (!role || !roleConfig[role]) {
  return null; // or return <></> or some placeholder
  }

  // Pull role-specific config
  const cfg = roleConfig[role] || roleConfig["client-staff"];
  const menuItems = cfg.menuItems || [];

  return (
    <IonMenu
      menuId="main-menu"
      contentId="main-content"
      type="overlay"
      side="start"
    >
      <IonHeader>
        <IonToolbar>
          <IonTitle>JJMC Menu</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        <IonGrid>
          {/* Logo & Header */}
          
          <IonRow className="ion-justify-content-center">
            <IonCol size="12" className="ion-text-center">
          <div className="logo-card">
            <div className="logo-placeholder">
              <IonImg src="/assets/JJMCLogo.png" />   {/* your logo image */}
            </div>
            <IonText className="company-subtitle">
              Tax and Accounting services
            </IonText>
            <IonText className="role-title">{cfg.greetingRole}</IonText>
          </div>
            </IonCol>
          </IonRow>

          {/* Dynamic Menu Items */}
          {menuItems.map((item, i) => (
            <IonRow key={i}>
              <IonCol>
                <IonMenuToggle autoHide={false}>
                  <IonItem button routerLink={item.path}>
                    <IonIcon slot="start" icon={item.icon} />
                    <IonLabel>{item.label}</IonLabel>
                  </IonItem>
                </IonMenuToggle>
              </IonCol>
            </IonRow>
          ))}

          {/* Logout */}
          <IonRow>
            <IonCol>
              <IonButton expand="block" routerLink="/welcome" className="logout-button">
                <IonIcon icon={logOutOutline} slot="start" />
                Log out
              </IonButton>
            </IonCol>
          </IonRow>
        </IonGrid>
      </IonContent>
    </IonMenu>
  );
}
