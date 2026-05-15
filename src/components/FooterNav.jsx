// 
import {
  IonFooter,
  IonGrid,
  IonRow,
  IonCol,
  IonButton,
  IonIcon,
  IonMenuToggle
} from "@ionic/react";
import { homeOutline, personOutline, menuOutline, refreshOutline } from "ionicons/icons";
import useAuthRole from "../hooks/useAuthRole";
import { roleConfig } from "../hooks/roleConfig";
import "./FooterNav.css";

export default function FooterNav() {
  const { role, loading } = useAuthRole();

  if (loading || !role) return null;

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <IonFooter className="footer-bar">
      <IonGrid>
        <IonRow className="ion-justify-content-around ion-text-center">

          {/* Home */}
          <IonCol>
            <IonButton
              fill="clear"
              color="light"
              routerLink={roleConfig[role]?.homePath}
              routerDirection="root"
            >
              <IonIcon icon={homeOutline} slot="icon-only" />
            </IonButton>
          </IonCol>

          {/* Profile */}
          <IonCol>
            <IonButton
              fill="clear"
              color="light"
              routerLink="/profile-details-base"
              routerDirection="forward"
            >
              <IonIcon icon={personOutline} slot="icon-only" />
            </IonButton>
          </IonCol>

          {/* Menu toggle */}
          <IonCol>
            <IonMenuToggle>
                <IonButton fill="clear" color="light">
              <IonIcon icon={menuOutline} slot="icon-only" />
            </IonButton>
            </IonMenuToggle>
            </IonCol>

          {/* Refresh */}
          <IonCol>
            <IonButton
              fill="clear"
              color="light"
              onClick={handleRefresh}
              aria-label="Refresh page"
              title="Refresh page"
            >
              <IonIcon icon={refreshOutline} slot="icon-only" />
            </IonButton>
          </IonCol>

        </IonRow>
      </IonGrid>
    </IonFooter>
  );
}
