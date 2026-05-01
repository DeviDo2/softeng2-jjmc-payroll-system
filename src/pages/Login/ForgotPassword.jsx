import {
  IonContent,
  IonPage,
  IonInput,
  IonButton,
  IonItem,
  IonText,
  IonRouterLink,
  IonGrid,
  IonRow,
  IonCol,
  IonIcon,
  IonHeader,
  IonToolbar,
  IonImg,              
  IonLoading,
} from "@ionic/react";
import { arrowBackOutline } from "ionicons/icons";
import { useHistory } from "react-router-dom";
import { useState, useRef } from "react";
import { auth, db } from "../../database-components/firebaseConfig";
import { sendPasswordResetEmail, confirmPasswordReset } from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import "./ForgotPassword.css";

function ForgotPassword() {
  const history = useHistory();
  const [email, setEmail] = useState("");
  const [step, setStep] = useState("email");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState("");
  const inputsRef = useRef([]);

  const generateOTP = () =>
    Math.floor(100000 + Math.random() * 900000).toString();

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    try {
      const otpCode = generateOTP();
      await setDoc(doc(db, "passwordResets", email), {
        otp: otpCode,
        createdAt: serverTimestamp(),
        email,
      });

      await sendPasswordResetEmail(auth, email);
      setSuccess("Email sent! Check inbox & enter the OTP.");
      setStep("otp");
    } catch (err) {
      setErrors({ email: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    const otpCode = otp.join("");
    setLoading(true);

    try {
      const ref = doc(db, "passwordResets", email);
      const docSnap = await getDoc(ref);

      if (!docSnap.exists() || docSnap.data().otp !== otpCode) {
        throw new Error("Incorrect OTP.");
      }

      setSuccess("OTP verified!");
      setStep("newPassword");
    } catch (err) {
      setErrors({ otp: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (newPassword !== confirmPassword) {
        throw new Error("Passwords do not match.");
      }

      setSuccess("Password reset successful! Redirecting...");
      setTimeout(() => history.push("/login"), 2000);
    } catch (err) {
      setErrors({ password: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (value, index) => {
    if (/^\d?$/.test(value)) {
      const newOtp = [...otp];
      newOtp[index] = value;
      setOtp(newOtp);
      if (value && index < 5) inputsRef.current[index + 1]?.focus();
    }
  };

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar style={{ '--background': 'transparent' }}>
          <IonButton slot="start" fill="clear" routerLink="/login">
            <IonIcon icon={arrowBackOutline} />
          </IonButton>
        </IonToolbar>
      </IonHeader>

      <IonContent className="forgot-screen" fullscreen scrollY={true}>
         <IonImg src="/assets/Ellipse 1 (1).png" className="forgot-ellipse-top" />
        <IonImg src="/assets/Ellipse 2 (1).png" className="forgot-ellipse-bottom" />
        
        <div className="full-height-wrapper">

       
        <IonGrid className="forgot-container-grid">
          <IonRow>
            <IonCol size="12" size-md="8"  className="ion-text-center">
               <IonText className="forgot-title">
                {step === "email"
                  ? "Forgot Password"
                  : step === "otp"
                  ? "Enter OTP"
                  : "Create New Password"}
              </IonText>
               </IonCol>
            </IonRow>

              <IonRow>
              <IonCol size="12">
              {/* Step 1: Email */}
              {step === "email" && (
                <form onSubmit={handleEmailSubmit}>
                  <IonItem className="input-item">
                    <IonInput
                      type="email"
                      placeholder="Enter your email"
                      onIonChange={(e) => setEmail(e.detail.value)}
                      disabled={loading}
                    />
                  </IonItem>
                  {errors.email && <IonText color="danger">{errors.email}</IonText>}
                  {success && <IonText color="success">{success}</IonText>}
                  <IonButton expand="block" type="submit" disabled={loading}>
                    {loading ? "Sending..." : "Send OTP"}
                  </IonButton>
                </form>
              )}
              </IonCol>
            </IonRow>

              {/* Step 2: OTP */}
              {step === "otp" && (
                <form onSubmit={handleOtpSubmit}>
                  <IonRow className="otp-container">
                    {otp.map((digit, index) => (
                      <IonCol size="2" key={index}>
                        <input
                          className={`otp-input ${digit ? "filled" : ""}`}
                          ref={(el) => (inputsRef.current[index] = el)}
                          type="text"
                          maxLength="1"
                          value={digit}
                          onChange={(e) =>
                            handleOtpChange(e.target.value, index)
                          }
                        />
                      </IonCol>
                    ))}
                  </IonRow>
                  {errors.otp && <IonText color="danger">{errors.otp}</IonText>}
                  <IonButton expand="block" type="submit" disabled={loading}>
                    {loading ? "Verifying..." : "Submit"}
                  </IonButton>
                </form>
              )}

              {/* Step 3: New Password */}
              {step === "newPassword" && (
                <form onSubmit={handlePasswordSubmit}>
                  <IonItem>
                    <IonInput
                      type="password"
                      placeholder="New password"
                      onIonChange={(e) => setNewPassword(e.detail.value)}
                    />
                  </IonItem>
                  <IonItem>
                    <IonInput
                      type="password"
                      placeholder="Confirm password"
                      onIonChange={(e) => setConfirmPassword(e.detail.value)}
                    />
                  </IonItem>
                  {errors.password && (
                    <IonText color="danger">{errors.password}</IonText>
                  )}
                  <IonButton expand="block" type="submit" disabled={loading}>
                    {loading ? "Updating…" : "Reset Password"}
                  </IonButton>
                </form>
              )}

              <IonRouterLink routerLink="/login">
                <IonText className="return-link">
                  Return to Login
                </IonText>
              </IonRouterLink>
            
        </IonGrid>
         </div>
         
      </IonContent>
    </IonPage>
  );
}

export default ForgotPassword;
