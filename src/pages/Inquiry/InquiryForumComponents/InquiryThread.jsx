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
  currentUserId,
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

          <hr className="ion-margin-vertical" />
        </div>

        {/* ======================= THREAD MESSAGES ======================= */}
        <div className="thread-messages">
          {!messages || messages.length === 0 ? (
            <p style={{ textAlign: "center", color: "#999", padding: "1rem" }}>
              No messages yet.
            </p>
          ) : (
            messages.map((msg) => {
              const isAnswer = msg.messageType === "answer";
              const isRejected = msg.rejected === true;
              const isPending = isAnswer && !msg.approved && !isRejected;

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
                  (msg.createdBy === userId || // their own message
                  msg.approved === true) && // admin-approved messages
                  msg.rejected !== true; // never show rejected messages to client
              }

              if (!isVisible) return null;

              return (
                <div
                  key={msg.id}
                  className={`message-bubble ${
                    isAnswer ? "answer-bubble" : "question-bubble"
                  } ${
                    role === "bookkeeper" &&
                    msg.createdBy === currentUserId &&
                    isPending
                      ? "own-pending-reply"
                      : ""
                  }`}
                >
                  <strong>{msg.authorSnapshot?.displayName}</strong>
                  <p>{msg.body}</p>
                  <small>{formatTS(msg.createdAt)}</small>

                  {/* Rejected badge (shows to bookkeeper/admin and marks resolved) */}
                  {isRejected && (role === "admin" || role === "bookkeeper") && (
                    <IonBadge color="danger" className="rejected-label">
                      Rejected
                    </IonBadge>
                  )}

                  {/* Pending badge (admin/bookkeeper only) */}
                  {isPending && (role === "admin" || role === "bookkeeper") && (
                    <IonBadge color="warning" className="pending-label">
                      {role === "bookkeeper" && msg.createdBy === currentUserId
                        ? "Your reply - Pending Approval"
                        : "Pending Approval"}
                    </IonBadge>
                  )}

                  {/* Show rejection reason if present (bookkeeper/client admin can see) */}
                  {isRejected && msg.rejectionReason && (
                    <p style={{ color: "#a00", marginTop: 8, fontSize: 13 }}>
                      <strong>Reason:</strong> {msg.rejectionReason}
                    </p>
                  )}

                  {/* ADMIN APPROVE / REJECT: only available for pending answers */}
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
            })
          )}
        </div>

        {/* ======================= FOOTER ======================= */}
        {canReply && typeof onSendReply === "function" && (
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
