import {
  IonPage,
  IonContent,
  IonGrid,
  IonRow,
  IonCol,
  IonText,
  IonButton,
  IonIcon,
  IonImg,
} from "@ionic/react";
import { logInOutline } from "ionicons/icons";
import "./WelcomePage.css";

function WelcomePage() {
  return (
    <IonPage>
      <IonContent fullscreen className="welcome-content">
        <IonImg src="/Ellipse 1 (1).png" className="ellipse-top" alt="Background Ellipse Top" />
        <IonImg src="/Ellipse 2 (1).png" className="ellipse-bottom" alt="Background Ellipse Bottom" />

        <IonGrid className="ion-text-center ion-justify-content-center ion-align-items-center full-height">
          <IonRow>
            <IonCol>
              <IonText color="primary"
                className="welcome-title">Welcome
              </IonText>
            </IonCol>
          </IonRow>

          <IonRow>
            <IonCol size="12" sizeMd="8" offsetMd="2">
              <IonImg
                src="/welcome-illustration.png"
                alt="Welcome Illustration"
                className="welcome-img"
              />
            </IonCol>
          </IonRow>

          <IonRow className="ion-justify-content-center">
            <IonCol size="12" sizeSm="8" sizeMd="5" sizeLg="4">
              <IonButton
                expand="block"
                shape="round"
                fill="solid"
                routerLink="/login"
                className="welcome-login-button"
              >
                <IonIcon icon={logInOutline} slot="start" />
                Login
              </IonButton>
            </IonCol>
          </IonRow>
        </IonGrid>
      </IonContent>
    </IonPage>
  );
}

export default WelcomePage;
