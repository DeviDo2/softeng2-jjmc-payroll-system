import React, { useEffect, useMemo, useState } from "react";
import {
  IonPage,
  IonContent,
  IonImg,
  IonGrid,
  IonRow,
  IonCol,
  IonText,
  IonCard,
  IonCardContent,
  IonButton,
  IonBadge,
  IonSpinner,
} from "@ionic/react";
import { useHistory } from "react-router-dom";
import { collection, getDocs, query, where } from "firebase/firestore";

import { db } from "../../database-components/firebaseConfig";
import useAuthRole from "../../hooks/useAuthRole";
import Sidebar from "../../components/Sidebar";
import FooterNav from "../../components/FooterNav";
import "./HomeBookkeeper.css";

const getDateValue = (value) => {
  const dateValue = value?.toDate?.() || (value ? new Date(value) : null);

  if (!(dateValue instanceof Date) || Number.isNaN(dateValue.getTime())) {
    return null;
  }

  return dateValue;
};

const getLatestActivityTime = (draft) => {
  const candidateDates = [
    getDateValue(draft?.lastSentAt),
    getDateValue(draft?.updatedAt),
    getDateValue(draft?.createdAt),
  ].filter(Boolean);

  return candidateDates.length > 0
    ? Math.max(...candidateDates.map((date) => date.getTime()))
    : 0;
};

const formatDate = (value) => {
  const dateValue = getDateValue(value);
  if (!dateValue) return "Unknown";

  return dateValue.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const getStatusBadgeProps = (status) => {
  switch ((status || "").toLowerCase()) {
    case "approved":
      return { color: "success", text: "APPROVED" };
    case "pending_approval":
      return { color: "warning", text: "PENDING" };
    case "disputed":
      return { color: "tertiary", text: "DISPUTED" };
    case "revised":
    case "needs_revision":
      return { color: "danger", text: "NEEDS REVISION" };
    case "sent_to_client":
      return { color: "primary", text: "SENT" };
    default:
      return { color: "medium", text: (status || "draft").replace(/_/g, " ").toUpperCase() };
  }
};

export default function HomeBookkeeper() {
  const { loading, user } = useAuthRole();
  const history = useHistory();
  const [clients, setClients] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) return;

    const loadDashboard = async () => {
      setIsLoading(true);
      try {
        const [clientSnapshot, draftSnapshot] = await Promise.all([
          getDocs(query(collection(db, "clientCompanies"), where("bookkeeperId", "==", user.uid))),
          getDocs(query(collection(db, "clientPayrollDrafts"), where("bookkeeperId", "==", user.uid))),
        ]);

        setClients(clientSnapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })));
        setDrafts(draftSnapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })));
      } catch (error) {
        console.error("Failed to load bookkeeper dashboard:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboard();
  }, [user?.uid]);

  const summary = useMemo(() => {
    const approved = drafts.filter((draft) => draft.status === "approved").length;
    const pending = drafts.filter((draft) => draft.status === "pending_approval").length;
    const disputed = drafts.filter((draft) => draft.status === "disputed").length;
    const needsRevision = drafts.filter((draft) =>
      draft.status === "revised" || draft.status === "needs_revision"
    ).length;

    return [
      { label: "All Drafts", value: drafts.length },
      { label: "Approved", value: approved },
      { label: "Pending", value: pending },
      { label: "Disputed", value: disputed },
      { label: "Needs Revision", value: needsRevision },
    ];
  }, [drafts]);

  const latestDraft = useMemo(() => {
    return [...drafts].sort((left, right) => getLatestActivityTime(right) - getLatestActivityTime(left))[0] || null;
  }, [drafts]);

  const previewClients = useMemo(() => {
    return [...clients]
      .sort((left, right) => String(left.name || left.companyName || "").localeCompare(String(right.name || right.companyName || "")))
      .slice(0, 4)
      .map((client) => ({
        id: client.id,
        name: client.name || client.companyName || "Unnamed Client",
        employeeCount: Array.isArray(client.parsedCSV) ? client.parsedCSV.length : 0,
      }));
  }, [clients]);

  const displayName = user?.firstName || "Bookkeeper";

  if (loading || isLoading) {
    return (
      <>
        <Sidebar />
        <IonPage id="main-content">
          <IonContent fullscreen className="bookkeeper-home-content">
            <div className="bookkeeper-home-loading">
              <IonSpinner name="crescent" />
              <p>Loading dashboard...</p>
            </div>
          </IonContent>
          <FooterNav />
        </IonPage>
      </>
    );
  }

  return (
    <>
      <Sidebar />
      <IonPage id="main-content">
        <IonContent fullscreen className="bookkeeper-home-content">
          <IonImg src="/Gradient-Ellipses.png" alt="BG" className="ellipse-bg" />

          <div className="bookkeeper-home-panel">
            <IonGrid>
              <IonRow>
                <IonCol>
                  <IonText>
                    <h1 className="bookkeeper-home-title">Welcome back, {displayName}</h1>
                    <p className="bookkeeper-home-subtitle">
                      Keep track of your payroll workload, latest computations, and assigned clients.
                    </p>
                  </IonText>
                </IonCol>
              </IonRow>

              <IonRow className="bookkeeper-home-summary-row">
                {summary.map((item) => (
                  <IonCol key={item.label} size="6" sizeMd="4" sizeLg="3">
                    <div className="bookkeeper-home-summary-card">
                      <span className="bookkeeper-home-summary-label">{item.label}</span>
                      <strong>{item.value}</strong>
                    </div>
                  </IonCol>
                ))}
              </IonRow>

              <IonRow>
                <IonCol size="12" sizeLg="6">
                  <IonCard className="bookkeeper-home-card">
                    <IonCardContent>
                      <IonText>
                        <h2 className="bookkeeper-home-section-title">Last Computation Done</h2>
                      </IonText>

                      {latestDraft ? (
                        <div className="bookkeeper-home-latest-card">
                          <div className="bookkeeper-home-latest-topline">
                            <div>
                              <h3>{latestDraft.clientName || "Unknown Client"}</h3>
                              <p>{latestDraft.payrollPeriod || "Payroll period not provided"}</p>
                            </div>
                            <IonBadge color={getStatusBadgeProps(latestDraft.status).color}>
                              {getStatusBadgeProps(latestDraft.status).text}
                            </IonBadge>
                          </div>
                          <p className="bookkeeper-home-latest-meta">
                            Latest activity: {formatDate(latestDraft.lastSentAt || latestDraft.updatedAt || latestDraft.createdAt)}
                          </p>
                          <IonButton fill="outline" onClick={() => history.push("/bookkeeper-computation-history")}>
                            Open Computation History
                          </IonButton>
                        </div>
                      ) : (
                        <p className="bookkeeper-home-empty-text">No computations yet. Start from your client list to create the first payroll draft.</p>
                      )}
                    </IonCardContent>
                  </IonCard>
                </IonCol>

                <IonCol size="12" sizeLg="6">
                  <IonCard className="bookkeeper-home-card">
                    <IonCardContent>
                      <div className="bookkeeper-home-client-header">
                        <IonText>
                          <h2 className="bookkeeper-home-section-title">Client List Preview</h2>
                        </IonText>
                        <IonButton fill="clear" onClick={() => history.push("/bookkeeper-client-list-base")}>
                          View All
                        </IonButton>
                      </div>

                      {previewClients.length === 0 ? (
                        <p className="bookkeeper-home-empty-text">No client companies assigned yet.</p>
                      ) : (
                        <div className="bookkeeper-home-client-preview">
                          {previewClients.map((client) => (
                            <button
                              key={client.id}
                              type="button"
                              className="bookkeeper-home-client-item"
                              onClick={() => history.push("/bookkeeper-client-list-base")}
                            >
                              <span className="bookkeeper-home-client-name">{client.name}</span>
                              <span className="bookkeeper-home-client-count">{client.employeeCount} employees</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </IonCardContent>
                  </IonCard>
                </IonCol>
              </IonRow>
            </IonGrid>
          </div>
        </IonContent>
        <FooterNav />
      </IonPage>
    </>
  );
}
