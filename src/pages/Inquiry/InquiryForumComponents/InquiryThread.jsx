import React from "react";
import {
  IonCard,
  IonCardContent,
  IonText,
  IonButton,
  IonBadge,
} from "@ionic/react";

export default function InquiryThread({
  inquiry,
  messages,
  role,
  formatTS,
  onBack,
  onSendReply,
  triggerNotification,
  userId,
}) {
  const canReply = role === "bookkeeper" || role === "admin";

  return (
    <IonCard className="forum-card">
      <IonCardContent>
        {/* ======================= HEADER ======================= */}
        <div className="inquiry-details-header">
          <IonText>
            <h2>{inquiry.title}</h2>
          </IonText>

          <p>
            <strong>Asked by:</strong> {inquiry.authorFirstName}{" "}
            {inquiry.authorLastName}
          </p>

          <p>
            <strong>Created:</strong> {formatTS(inquiry.createdAt)}
          </p>

          <p>
            <strong>Status:</strong>{" "}
            <IonBadge
              color={
                inquiry.status === "answered"
                  ? "success"
                  : inquiry.status === "pending-admin"
                  ? "warning"
                  : inquiry.status === "rejected"
                  ? "danger"
                  : "medium"
              }
            >
              {inquiry.status}
            </IonBadge>
          </p>

          <IonText>
            <h3 className="ion-margin-top">Message</h3>
          </IonText>
          <p className="inquiry-body">{inquiry.body}</p>

          <hr className="ion-margin-vertical" />
        </div>

        {/* ======================= THREAD MESSAGES ======================= */}
        <div className="thread-messages">
          {messages.map((msg) => {
            const isAnswer = msg.messageType === "answer";
            const isPending = isAnswer && !msg.approved;

            /**
             * MESSAGE VISIBILITY RULES
             * -------------------------
             * ADMIN → sees everything
             * BOOKKEEPER → sees everything
             * CLIENT-STAFF → sees:
             *     - their own messages
             *     - approved answers
             *     - NEVER sees pending answers
             */
            let isVisible = false;

            if (role === "admin" || role === "bookkeeper") {
              isVisible = true;
            } else if (role === "client-staff") {
              isVisible =
                msg.createdBy === userId || // their own message
                msg.approved === true;
                // admin-approved messages
            }

            if (!isVisible) return null;

            return (
              <div
                key={msg.id}
                className={`message-bubble ${
                  isAnswer ? "answer-bubble" : "question-bubble"
                }`}
              >
                <strong>{msg.authorSnapshot?.displayName}</strong>
                <p>{msg.body}</p>
                <small>{formatTS(msg.createdAt)}</small>

                {/* Pending badge (admin/bookkeeper only) */}
                {isPending && (role === "admin" || role === "bookkeeper") && (
                  <IonBadge color="warning" className="pending-label">
                    Pending Approval
                  </IonBadge>
                )}

                {/* ADMIN APPROVE / REJECT */}
                {role === "admin" && isAnswer && isPending && (
                  <div className="action-buttons">
                    <IonButton
                      size="small"
                      onClick={() => triggerNotification("approve", msg.id)}
                    >
                      Approve
                    </IonButton>

                    <IonButton
                      size="small"
                      color="danger"
                      onClick={() => triggerNotification("reject", msg.id)}
                    >
                      Reject
                    </IonButton>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ======================= FOOTER ======================= */}
        {canReply && (
          <IonButton expand="block" onClick={onSendReply}>
            Reply
          </IonButton>
        )}

        <IonButton style={{ height:"0px"}} fill="clear" onClick={onBack}>
          Back
        </IonButton>
      </IonCardContent>
    </IonCard>
  );
}
