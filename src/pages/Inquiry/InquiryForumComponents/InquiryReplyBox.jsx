// InquiryReplyBox.jsx
import React from "react";
import { IonTextarea, IonButton } from "@ionic/react";
import { useInquiryActions } from "../actions.js/useInquiryActions";
import { auth } from "../../../database-components/firebaseConfig";

export default function InquiryReplyBox({
  reply,
  setReply,
  activeInquiry,
  role,
  onSuccess, // optional callback after send
}) {
  const { sendReplyToFirebase, loading } = useInquiryActions();

  const handleSend = async () => {
  await sendReplyToFirebase(
    { reply, activeInquiry, role },
    {
      setShowSuccess: onSuccess, // <–– this triggers modal
    },
    () => {
      setReply("");
    }
  );
};

  console.log("Sending reply:", { 
    reply, 
    inquiryID: activeInquiry?.id, 
    role 
  });

  return (
    <>
      <IonTextarea
        placeholder="Write a reply..."
        value={reply}
        autoGrow
        onIonChange={(e) => setReply(e.detail.value)}
      />

      <IonButton
        className="ion-margin-top"
        onClick={handleSend}
        disabled={loading || !reply?.trim()}
      >
        {loading ? "Sending..." : "Send Reply"}
      </IonButton>
    </>
  );
}
