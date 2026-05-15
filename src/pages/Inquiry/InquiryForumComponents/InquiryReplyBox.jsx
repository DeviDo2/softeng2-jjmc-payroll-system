import React from "react";
import { IonTextarea, IonButton } from "@ionic/react";

export default function InquiryReplyBox({
  reply,
  setReply,
  activeInquiry,
  role,
  onSend,
}) {
  const handleSend = async () => {
    if (typeof onSend !== "function") return;

    await onSend({
      reply,
      activeInquiry,
      role,
    });

    setReply("");
  };

  return (
    <>
      <IonTextarea
        placeholder="Write a reply..."
        value={reply}
        autoGrow
        onIonChange={(e) => setReply(e.detail.value || "")}
      />

      <IonButton
        className="ion-margin-top"
        onClick={handleSend}
        disabled={!reply?.trim() || !activeInquiry || typeof onSend !== "function"}
      >
        Send Reply
      </IonButton>
    </>
  );
}
