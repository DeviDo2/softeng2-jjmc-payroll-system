import { useState } from "react";
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
import { useHistory, useLocation } from "react-router-dom";
import { signOut } from "firebase/auth";

import useAuthRole from "../hooks/useAuthRole";
import { auth } from "../database-components/firebaseConfig";
import "./Sidebar.css";

const PUBLIC_PATHS = [
  "/",
  "/welcome",
  "/login",
  "/login-base",
  "/signup-base",
  "/forgot-password",
  "/client-staff-login",
  "/client-staff-signup",
  "/bookkeeper-login",
  "/bookkeeper-signup",
  "/admin-login",
];

export default function Sidebar({ onLogout }) {
  const { loading, role, roleConfig } = useAuthRole();
  const history = useHistory();
  const location = useLocation();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const path = location.pathname.toLowerCase();
  const isPublicPage = PUBLIC_PATHS.some((publicPath) => path === publicPath);

  const handleLogout = async () => {
    if (isLoggingOut) return;

    setIsLoggingOut(true);
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      localStorage.clear();
      sessionStorage.clear();

      if (typeof onLogout === "function") {
        onLogout();
      } else {
        history.replace("/welcome");
      }

      setIsLoggingOut(false);
    }
  };

  if (isPublicPage) return null;

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

      <IonContent>
        <IonGrid>
          {/* Logo & Header */}
          
          <IonRow className="ion-justify-content-center">
            <IonCol size="12" className="ion-text-center">
          <div className="logo-card">
            <div className="logo-placeholder">
              <IonImg src="/JJMCLogo.png" />   {/* your logo image */}
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
              <IonMenuToggle autoHide={false}>
                <IonButton
                  expand="block"
                  className="logout-button"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                >
                  <IonIcon icon={logOutOutline} slot="start" />
                  {isLoggingOut ? "Logging out..." : "Log out"}
                </IonButton>
              </IonMenuToggle>
            </IonCol>
          </IonRow>
        </IonGrid>
      </IonContent>
    </IonMenu>
  );
}
