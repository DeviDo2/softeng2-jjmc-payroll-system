import React, { useState } from "react";
import { IonTextarea, IonButton, IonText } from "@ionic/react";

export default function InquiryReplyBox({
  reply,
  setReply,
  activeInquiry,
  role,
  onSend,
}) {
  const [error, setError] = useState("");

  const handleSend = async () => {
    if (typeof onSend !== "function") return;

    const didSend = await onSend({
      reply,
      activeInquiry,
      role,
    });

    if (didSend) {
      setError("");
      setReply("");
    } else {
      setError("Reply failed to send. Please try again.");
    }
  };

  return (
    <>
      <IonTextarea
        placeholder="Write a reply..."
        value={reply}
        autoGrow
        onIonChange={(e) => {
          setReply(e.detail.value || "");
          if (error) setError("");
        }}
      />

      <IonButton
        className="ion-margin-top"
        onClick={handleSend}
        disabled={!reply?.trim() || !activeInquiry || typeof onSend !== "function"}
      >
        Send Reply
      </IonButton>

      {error && (
        <IonText color="danger">
          <p style={{ marginTop: 8 }}>{error}</p>
        </IonText>
      )}
    </>
  );
}
