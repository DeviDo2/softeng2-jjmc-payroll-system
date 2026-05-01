import { useEffect } from "react";
import { useHistory } from "react-router-dom";
import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from "@ionic/react";

const Home: React.FC = () => {
  const history = useHistory();

  useEffect(() => {
    const stored = sessionStorage.getItem("jjmcUser");

    if (!stored) {
      // no user found → send to login
      history.replace("/login");
      return;
    }

    const userData = JSON.parse(stored);
    const role = userData.role;

    console.log("Redirecting home for role:", role);

    if (role === "client-staff") {
      history.replace("/menu-client-staff");
    } else if (role === "bookkeeper") {
      history.replace("/menu-bookkeeper");
    } else if (role === "admin") {
      history.replace("/menu-admin");
    } else {
      history.replace("/login");
    }
  }, [history]);

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Redirecting...</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent />
    </IonPage>
  );
};

export default Home;
