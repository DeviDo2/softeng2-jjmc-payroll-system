import React, { useState } from "react";
import {
  IonContent,
  IonPage,
  IonInput,
  IonButton,
  IonItem,
  IonLabel,
  IonIcon,
  IonText,
  IonGrid,
  IonRow,
  IonCol,
  IonSelect,
  IonSelectOption,
  IonAlert,
  IonLoading,
  IonImg,
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonDatetime,
} from "@ionic/react";

import { useHistory, useLocation } from "react-router-dom";
import {
  eyeOutline,
  eyeOffOutline,
  calendarOutline,
  closeOutline,
  arrowBackOutline,
} from "ionicons/icons";

import "./SignUpPage.css";

import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../../database-components/firebaseConfig";

function SignUpBase() {
  const history = useHistory();
  const location = useLocation();

  /**
   * ROLE HANDLING
   * We get the role from router or localStorage
   * Convert it to the required format: "client-staff" or "bookkeeper"
   */
  const passedRole = location.state?.role;
  const storedRole = localStorage.getItem("selectedRole");

  const role =
    passedRole?.toLowerCase().replace(/\s+/g, "-") ||
    storedRole?.toLowerCase().replace(/\s+/g, "-") ||
    "client-staff";

  console.log("Signup Role:", role);

  /* -----------------------------------------
     STATE
  ------------------------------------------*/
  const [currentStep, setCurrentStep] = useState(1);

  // Step 1
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [gender, setGender] = useState("");
  const [address, setAddress] = useState("");

  // Step 2
  const [phoneNumber, setPhoneNumber] = useState("");
  const [company, setCompany] = useState("");
  const [position, setPosition] = useState("");
  const [department, setDepartment] = useState("");
  const [salaryRate, setSalaryRate] = useState("");
  const [taxIdNumber, setTaxIdNumber] = useState("");

  // UI Helpers
  const [isLoading, setIsLoading] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [showCalendar, setShowCalendar] = useState(false);

  /* -----------------------------------------
     STEP HANDLING
  ------------------------------------------*/
  const togglePasswordVisibility = () => setShowPassword(!showPassword);

  const handleNext = () => {
    if (!email || !password || !firstName || !lastName || !birthdate || !gender || !address) {
      setAlertMessage("Please fill in all required fields.");
      setShowAlert(true);
      return;
    }
    setCurrentStep(2);
  };

  const handleBack = () => setCurrentStep(1);

  /* -----------------------------------------
     SIGNUP
     - Creates authentication user
     - Saves profile
     - Saves role to pendingRoles to be picked up by Cloud Function
  ------------------------------------------*/
  const handleRegister = async (e) => {
    e.preventDefault();
    if (!phoneNumber || !company || !position || !department || !salaryRate || !taxIdNumber) {
      setAlertMessage("Please fill in all required fields.");
      setShowAlert(true);
      return;
    }

    setIsLoading(true);

    try {
      /** 1️⃣ Create account */
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      /** 2️⃣ Save profile information */
      await setDoc(
        doc(db, "users", user.uid),
        {
          email,
          role,
          firstName,
          lastName,
          birthdate,
          gender,
          address,
          phoneNumber,
          company,
          position,
          department,
          salaryRate,
          taxIdNumber,
          createdAt: new Date(),
        },
        { merge: true }
      );

      /** 3️⃣ Save role for Cloud Function assignment */
      await setDoc(doc(db, "pendingRoles", user.uid), { role });

      setAlertMessage("Account created! Your role is being activated.");
      setShowAlert(true);

      setTimeout(() => {
        history.push(`/login-${role}`);
      }, 1200);
    } catch (err) {
      console.error("Signup error:", err);
      setAlertMessage(err.message || "Something went wrong during signup.");
      setShowAlert(true);
    } finally {
      setIsLoading(false);
    }
  };

  /* -----------------------------------------
     RENDER
  ------------------------------------------*/
  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar style={{ '--background': 'transparent' }}>
          <IonButton slot="start" fill="clear" routerLink="/Welcome">
            <IonIcon icon={arrowBackOutline} />
          </IonButton>
        </IonToolbar>
      </IonHeader>

      <IonContent className="signup-screen" fullscreen scrollY={true}>
        <IonImg src="/assets/Ellipse 1 (1).png" className="signup-ellipse-top" />
        <IonImg src="/assets/Ellipse 2 (1).png" className="signup-ellipse-bottom" />

        <div className="full-height-wrapper">
        <IonGrid className="signup-container-grid">

          <IonRow>
            <IonCol size="12"  className="ion-text-center">
             <IonText className="signup-title">Create your account</IonText>
          </IonCol>
          </IonRow>

               <IonRow>
              <IonCol size="12">
              <form onSubmit={currentStep === 2 ? handleRegister : (e) => e.preventDefault()}>
               
                {/* STEP 1 */}
                {currentStep === 1 && (
                  <>
                    <IonItem className="input-item"lines="none">
                      <IonLabel position="stacked">Email</IonLabel>
                      <IonInput
                        type="email"
                        value={email}
                        onIonChange={(e) => setEmail(e.detail.value)}
                        placeholder="youremail@gmail.com"
                      />
                    </IonItem>

                    <IonItem className="input-item">
                      <IonLabel position="stacked">Password</IonLabel>
                      <IonInput
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onIonChange={(e) => setPassword(e.detail.value)}
                      />
                      <IonButton fill="clear" slot="end" onClick={togglePasswordVisibility}>
                        <IonIcon 
                        icon={showPassword ? eyeOffOutline : eyeOutline} 
                          slot="end" 
                          onClick={togglePasswordVisibility}
                          className="password-icon"/>
                      </IonButton>
                    </IonItem>

                    <IonRow>
                      <IonCol size="6" size-sm="6">
                        <IonItem className="input-item">
                          <IonLabel position="stacked">First Name</IonLabel>
                          <IonInput value={firstName} onIonChange={(e) => setFirstName(e.detail.value)} />
                        </IonItem>
                      </IonCol>

                      <IonCol size="6">
                        <IonItem className="input-item">
                          <IonLabel position="stacked">Last Name</IonLabel>
                          <IonInput value={lastName} onIonChange={(e) => setLastName(e.detail.value)} />
                        </IonItem>
                      </IonCol>
                    </IonRow>

                    <IonRow>
                      <IonCol size="12" size-sm="6">
                        <IonItem className="input-item">
                          <IonLabel position="stacked">Birthdate</IonLabel>
                          <IonInput value={birthdate} readonly placeholder="Select Birthdate" />
                          <IonButton fill="clear" slot="end" onClick={() => setShowCalendar(true)}>
                            <IonIcon icon={calendarOutline} />
                          </IonButton>
                        </IonItem>

                        <IonModal isOpen={showCalendar} onDidDismiss={() => setShowCalendar(false)}>
                          <IonHeader>
                            <IonToolbar color="primary">
                              <IonTitle>Select Date</IonTitle>
                              <IonButtons slot="end">
                                <IonButton onClick={() => setShowCalendar(false)}>
                                  <IonIcon icon={closeOutline} />
                                </IonButton>
                              </IonButtons>
                            </IonToolbar>
                          </IonHeader>
                          <IonContent>
                            <IonDatetime
                              presentation="date"
                              value={birthdate}
                              onIonChange={(e) =>
                                setBirthdate(e.detail.value?.split("T")[0] || "")
                              }
                              showDefaultButtons={true}
                            />
                          </IonContent>
                        </IonModal>
                      </IonCol>

                      <IonCol size="6">
                        <IonItem className="input-item">
                          <IonLabel position="stacked">Gender</IonLabel>
                          <IonSelect value={gender} onIonChange={(e) => setGender(e.detail.value)}>
                            <IonSelectOption value="male">Male</IonSelectOption>
                            <IonSelectOption value="female">Female</IonSelectOption>
                            <IonSelectOption value="other">Other</IonSelectOption>
                          </IonSelect>
                        </IonItem>
                      </IonCol>
                    </IonRow>

                    <IonItem className="input-item">
                      <IonLabel position="stacked">Address</IonLabel>
                      <IonInput value={address} onIonChange={(e) => setAddress(e.detail.value)} />
                    </IonItem>
                  </>
                )}

                {/* STEP 2 */}
                {currentStep === 2 && (
                  <>
                    <IonItem className="input-item">
                      <IonLabel position="stacked">Phone Number</IonLabel>
                      <IonInput value={phoneNumber} onIonChange={(e) => setPhoneNumber(e.detail.value)} />
                    </IonItem>

                    <IonItem className="input-item">
                      <IonLabel position="stacked">Company</IonLabel>
                      <IonInput value={company} onIonChange={(e) => setCompany(e.detail.value)} />
                    </IonItem>

                    <IonRow>
                      <IonCol size="6">
                        <IonItem className="input-item">
                          <IonLabel position="stacked">Position</IonLabel>
                          <IonInput value={position} onIonChange={(e) => setPosition(e.detail.value)} />
                        </IonItem>
                      </IonCol>

                      <IonCol size="6">
                        <IonItem className="input-item">
                          <IonLabel position="stacked">Department</IonLabel>
                          <IonInput value={department} onIonChange={(e) => setDepartment(e.detail.value)} />
                        </IonItem>
                      </IonCol>
                    </IonRow>

                    <IonItem className="input-item">
                      <IonLabel position="stacked">Salary Rate</IonLabel>
                      <IonInput
                        type="number"
                        value={salaryRate}
                        onIonChange={(e) => setSalaryRate(e.detail.value)}
                      />
                    </IonItem>

                    <IonItem className="input-item">
                      <IonLabel position="stacked">Tax ID Number</IonLabel>
                      <IonInput value={taxIdNumber} onIonChange={(e) => setTaxIdNumber(e.detail.value)} />
                    </IonItem>
                  </>
                )}

                {/* BUTTONS */}
                <IonRow className="ion-margin-top ion-justify-content-between">
                  {currentStep === 2 && (
                    <IonCol size="6">
                      <IonButton 
                      expand="block" 
                      fill="outline" 
                      onClick={handleBack} 
                      disabled={isLoading}
                      >
                        Back
                      </IonButton>
                    </IonCol>
                  )}

                  <IonCol size={currentStep === 1 ? "12" : "5"}>
                    <IonButton
                      expand="block"
                      type={currentStep === 2 ? "submit" : "button"}
                      onClick={currentStep === 1 ? handleNext : undefined}
                      disabled={isLoading}
                      className="next-button"
                    >
                      {currentStep === 1 ? "Next" : "Sign Up"}
                    </IonButton>
                  </IonCol>
                </IonRow>
              </form>
              </IonCol>
                        </IonRow>
        </IonGrid>
        </div>

        <IonLoading isOpen={isLoading} message="Please wait..." spinner="crescent" />

        <IonAlert
          isOpen={showAlert}
          onDidDismiss={() => setShowAlert(false)}
          header="Information"
          message={alertMessage}
          buttons={["OK"]}
        />

        
      </IonContent>
    </IonPage>
  );
}

export default SignUpBase;