import React, { useState } from "react";
import {
  IonContent,
  IonPage,
  IonInput,
  IonButton,
  IonItem,
  IonText,
  IonRouterLink,
  IonImg,
  IonGrid,
  IonRow,
  IonCol,
  IonIcon,
  IonHeader,
  IonToolbar,
} from "@ionic/react";
import { eye, eyeOff, arrowBackOutline } from "ionicons/icons";
import { useHistory } from "react-router-dom";

import {
  signInWithEmailAndPassword,
  setPersistence,
  browserSessionPersistence,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../../database-components/firebaseConfig";

import "./LoginPage.css";

function LoginBase() {
  const history = useHistory();

  // Form State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // UI State
  const [loginError, setLoginError] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const tooManyAttempts = attempts >= 5;

  // Error Map
  const errorMessages = {
    "auth/user-not-found": "Invalid email or password.",
    "auth/wrong-password": "Invalid email or password.",
    "auth/invalid-credential": "Invalid email or password.",
    "auth/too-many-requests":
      "Account temporarily locked due to too many failed attempts.",
    "role-missing": "Account has no assigned role.",
    "role-unknown": "Your account role is not recognized.",
    "no-user-doc": "Account not found.",
    "account-disabled": "This account is disabled. Please contact an administrator.",
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    if (tooManyAttempts) {
      setLoginError("Too many failed attempts. Try again later.");
      return;
    }

    setLoginError("");
    setIsLoading(true);

    try {
      // Set session to expire on browser close
      await setPersistence(auth, browserSessionPersistence);

      // Sign In
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

      const user = userCredential.user;

      // Fetch Firestore profile
      const userSnap = await getDoc(doc(db, "users", user.uid));
      if (!userSnap.exists()) throw { code: "no-user-doc" };

      const userData = userSnap.data();
      if (userData.disabled === true) throw { code: "account-disabled" };

      const role = userData.role?.trim().toLowerCase().replace(/\s+/g, "-");

      if (!role) throw { code: "role-missing" };

      // Save session info
      sessionStorage.setItem(
        "jjmcUser",
        JSON.stringify({
          uid: user.uid,
          email: user.email,
          ...userData,
          role,
        })
      );
      localStorage.setItem("role", role);

      // Redirect based on role
      const routeMap = {
        "client-staff": "/client-staff-home",
        bookkeeper: "/bookkeeper-home",
        admin: "/admin-home",
      };

      const route = routeMap[role];
      if (!route) throw { code: "role-unknown" };

      history.push(route);
    } catch (error) {
      const message =
        errorMessages[error.code] ||
        "Login failed. Please check your credentials.";

      setLoginError(message);
      setAttempts((prev) => prev + 1);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar style={{ '--background': 'transparent' }}>
          <IonButton slot="start" fill="clear" routerLink="/welcome">
            <IonIcon icon={arrowBackOutline} />
          </IonButton>
        </IonToolbar>
      </IonHeader>

      <IonContent className="login-screen" fullscreen>
        <IonImg src="/Ellipse 1 (1).png" className="login-ellipse-top" />
        <IonImg
          src="/Ellipse 2 (1).png"
          className="login-ellipse-bottom"
        />

          <div className="full-height-wrapper">
        <IonGrid className="login-container-grid">
          {/* Logo Row */}
          <IonRow>
                <IonCol size="12">
                  <IonImg src="/JJMCLogo.png" className="JJMClogo" />
                </IonCol>
              </IonRow>
              
         {/* Title Row */}
          <IonRow>
            <IonCol size="12" className="ion-text-center">
              <IonText className="login-title">Login to your account
              </IonText>
              </IonCol>
            </IonRow>

      
      {/* Form Row */}
            <IonRow>
              <IonCol size="12">
              <form onSubmit={handleLogin}>
                <IonItem className="input-item">
                  <IonInput
                    type="email"
                    placeholder="Enter your email address"
                    value={email}
                    onIonChange={(e) => setEmail(e.detail.value)}
                  />
                </IonItem>

                <IonItem className="input-item">
                  <IonInput
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onIonChange={(e) => setPassword(e.detail.value)}
                  />
                  <IonIcon
                    icon={showPassword ? eyeOff : eye}
                    slot="end"
                    onClick={() => setShowPassword((s) => !s)}
                    style={{ fontSize: "22px", cursor: "pointer" }}
                  />
                </IonItem>
  
                <IonRow className="ion-padding-top">
                      <IonCol size="12" className="ion-text-end ion-no-padding">
                          <IonRouterLink color="primary" href="/forgot-password">
                              <IonText color="primary">
                                  <p className="forgot-password-text">Forgot Password?</p>
                              </IonText>
                          </IonRouterLink>
                      </IonCol>
                  </IonRow>


                {loginError && (
                  <IonRow>
                    <IonCol className="ion-text-center">
                      <IonText color="danger">
                        <p className="error-message">{loginError}</p>
                      </IonText>
                    </IonCol>
                  </IonRow>
                )}

                {/* Login Button Row */}
                <IonRow>
                    <IonCol size="12">
                <IonButton
                  expand="block"
                  className="login-button"
                  type="submit"
                  disabled={isLoading || tooManyAttempts}
                >
                  {isLoading ? "Please wait..." : "Login"}
                </IonButton>
                </IonCol>
                </IonRow>

                  {/* Sign Up Section Row */}
                <IonRow className="ion-margin-top">
                  <IonCol size="12" className="signup-text">
                    <IonText>
                      Don't have an account?
                    </IonText>

                    <IonButton
                      fill="outline"
                      expand="block"
                      className="signup-button"
                      routerLink="/signup-base"
                    >
                      Sign Up
                    </IonButton>
                  </IonCol>
                </IonRow>
              </form>
            </IonCol>
          </IonRow>
        </IonGrid>
        </div>
      </IonContent>
    </IonPage>
  );
}

export default LoginBase;
