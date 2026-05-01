import { useState } from "react";
import {
  IonPage,
  IonContent,
  IonGrid,
  IonRow,
  IonCol,
  IonText,
  IonButton,
  IonIcon,
  IonList,
  IonItem,
  IonLabel,
  IonImg,
  useIonRouter
} from "@ionic/react";
import { chevronDownOutline, chevronUpOutline, personCircleOutline } from "ionicons/icons";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import "./WelcomePage.css";

function WelcomePage() {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const userRoles = ["Admin", "Bookkeeper", "Client-Staff"];
  const router = useIonRouter();
  const db = getFirestore();
  const auth = getAuth();

  const handleButtonClick = () => {
    setIsDropdownOpen(prev => !prev);
  };
  
  const handleRoleSelect = (role) => {
    setIsDropdownOpen(false);

    const normalizedRole = role.toLowerCase().replace(/\s+/g, "-");

    // Save selected role to localStorage (used later after login/signup)
    localStorage.setItem("selectedRole", role);

    // Route based on role
    if (role === "Admin") {
      router.push("/admin-login", "forward");
    } else {
      router.push(`/${normalizedRole}-login`, "forward");
    }
  };

  return (
    <IonPage>
      <IonContent fullscreen className="welcome-content">
        <IonImg src="/assets/Ellipse 1 (1).png" className="ellipse-top" alt="Background Ellipse Top" />
        <IonImg src="/assets/Ellipse 2 (1).png" className="ellipse-bottom" alt="Background Ellipse Bottom" />

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
                src="/assets/welcome-illustration.png"
                alt="Welcome Illustration"
                className="welcome-img"
              />
            </IonCol>
          </IonRow>

          <IonRow className="ion-justify-content-center">
            <IonCol size="12" sizeSm="8" sizeMd="5" sizeLg="4">
              <IonButton expand="block" shape="round" fill="solid" onClick={handleButtonClick}>
                <IonIcon icon={personCircleOutline} slot="start" />
                Login As
                <IonIcon icon={isDropdownOpen ? chevronUpOutline : chevronDownOutline} slot="end" />
              </IonButton>

              {isDropdownOpen && (
                <IonList inset>
                  {userRoles.map((role, index) => (
                    <IonItem
                    className="ion-list"
                      key={index}
                      button
                      detail={false}
                      onClick={() => handleRoleSelect(role)}
                      lines="none"
                    >
                      <IonLabel className="ion-text-center">{role}</IonLabel>
                    </IonItem>
                  ))}
                </IonList>
              )}
            </IonCol>
          </IonRow>
        </IonGrid>
      </IonContent>
    </IonPage>
  );
}

export default WelcomePage;
