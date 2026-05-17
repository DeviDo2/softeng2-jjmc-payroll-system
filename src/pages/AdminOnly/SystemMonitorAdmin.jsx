import React, { useEffect, useMemo, useState } from "react";
import {
  IonPage,
  IonContent,
  IonGrid,
  IonRow,
  IonCol,
  IonImg,
  IonText,
  IonCard,
  IonCardContent,
  IonSpinner,
} from "@ionic/react";

import { fetchAdminBackendSnapshot } from "../../services/adminBackendService";
import FooterNav from "../../components/FooterNav";
import "./AdminPages.css";

const monitors = [
  { key: "users", label: "Total Accounts" },
  { key: "clientStaff", label: "Client Staff" },
  { key: "bookkeepers", label: "Bookkeepers" },
  { key: "clients", label: "Client Companies" },
  { key: "inquiries", label: "Inquiries" },
  { key: "drafts", label: "Payroll Drafts" },
  { key: "pendingDrafts", label: "Pending Approvals" },
  { key: "tutorials", label: "Tutorials" },
];

const initialData = {
  users: [],
  clients: [],
  inquiries: [],
  drafts: [],
  tutorials: [],
};

const getDraftStatus = (draft) =>
  String(draft.status || "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ");

const payrollActivityConfig = [
  {
    key: "pending",
    label: "Pending",
    matches: ["pending", "submitted", "for approval", "pending approval"],
  },
  {
    key: "rejected",
    label: "Rejected",
    matches: ["rejected", "revision", "needs revision", "for revision"],
  },
  {
    key: "approved",
    label: "Approved",
    matches: ["approved"],
  },
  {
    key: "sent",
    label: "Sent",
    matches: ["sent", "sent to client", "submitted to client"],
  },
];

const payrollActivityStyles = {
  pending: "#e3b04b",
  rejected: "#b94a48",
  approved: "#2f855a",
  sent: "#0a3f59",
  other: "#7bb9c8",
};

const getPayrollActivityKey = (draft) => {
  const status = getDraftStatus(draft);

  if (["sent", "sent to client", "submitted to client"].some((match) => status.includes(match))) {
    return "sent";
  }

  if (["rejected", "revision", "needs revision", "for revision"].some((match) => status.includes(match))) {
    return "rejected";
  }

  if (status.includes("approved")) {
    return "approved";
  }

  if (["pending", "submitted", "for approval", "pending approval"].some((match) => status.includes(match))) {
    return "pending";
  }

  return "other";
};

const polarToCartesian = (centerX, centerY, radius, angleInDegrees) => {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180;

  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
};

const createDonutArcPath = (startAngle, endAngle) => {
  const center = 110;
  const outerRadius = 84;
  const innerRadius = 56;
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  const outerStart = polarToCartesian(center, center, outerRadius, endAngle);
  const outerEnd = polarToCartesian(center, center, outerRadius, startAngle);
  const innerStart = polarToCartesian(center, center, innerRadius, startAngle);
  const innerEnd = polarToCartesian(center, center, innerRadius, endAngle);

  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 0 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerStart.x} ${innerStart.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 1 ${innerEnd.x} ${innerEnd.y}`,
    "Z",
  ].join(" ");
};

const getDraftDisplayName = (draft) =>
  draft.name ||
  draft.draftName ||
  draft.fileName ||
  draft.filename ||
  draft.clientName ||
  draft.company ||
  "Unnamed draft";

const getDraftFileType = (draft) => {
  const explicitType = draft.fileType || draft.type || draft.mimeType;
  const fileName = draft.fileName || draft.filename || "";
  const extension = fileName.includes(".") ? fileName.split(".").pop() : "";

  if (explicitType) return String(explicitType).replace("text/", "").toUpperCase();
  if (extension) return extension.toUpperCase();
  if (draft.csv || draft.parsedCSV || draft.csvData) return "CSV";
  return "DRAFT";
};

export default function SystemMonitorAdmin() {
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(true);
  const [backendError, setBackendError] = useState("");

  useEffect(() => {
    let active = true;

    const loadMonitor = async () => {
      setLoading(true);
      try {
        const snapshot = await fetchAdminBackendSnapshot();
        if (!active) return;
        setData({
          users: snapshot.users,
          clients: snapshot.clients,
          inquiries: snapshot.inquiries,
          drafts: snapshot.drafts,
          tutorials: snapshot.tutorials,
        });
        setBackendError(
          snapshot.errors.length > 0
            ? `Could not load: ${snapshot.errors.map((error) => error.section).join(", ")}.`
            : ""
        );
      } catch (error) {
        if (active) setBackendError(error.message);
      } finally {
        if (active) setLoading(false);
      }
    };

    loadMonitor();

    return () => {
      active = false;
    };
  }, []);

  const stats = useMemo(() => {
    const users = data.users;
    const drafts = data.drafts;

    return {
      users: users.length,
      clientStaff: users.filter((user) => user.role === "client-staff").length,
      bookkeepers: users.filter((user) => user.role === "bookkeeper").length,
      clients: data.clients.length,
      inquiries: data.inquiries.length,
      drafts: drafts.length,
      pendingDrafts: drafts.filter((draft) =>
        ["pending", "submitted", "for approval"].includes(String(draft.status || "").toLowerCase())
      ).length,
      tutorials: data.tutorials.length,
    };
  }, [data]);

  const payrollActivity = useMemo(() => {
    const counts = data.drafts.reduce(
      (currentCounts, draft) => ({
        ...currentCounts,
        [getPayrollActivityKey(draft)]: currentCounts[getPayrollActivityKey(draft)] + 1,
      }),
      {
        pending: 0,
        rejected: 0,
        approved: 0,
        sent: 0,
        other: 0,
      }
    );

    const baseItems = payrollActivityConfig.map((item) => ({
      ...item,
      count: counts[item.key],
    }));

    const items =
      counts.other > 0
        ? [
            ...baseItems,
            {
              key: "other",
              label: "Other",
              count: counts.other,
            },
          ]
        : baseItems;

    const total = items.reduce((sum, item) => sum + item.count, 0);
    let currentAngle = 0;
    const segments = items.map((item) => {
      const angle = total > 0 ? (item.count / total) * 360 : 0;
      const startAngle = currentAngle;
      const endAngle = currentAngle + angle;
      currentAngle = endAngle;

      const segment = {
        ...item,
        color: payrollActivityStyles[item.key],
        percent: total > 0 ? Math.round((item.count / total) * 100) : 0,
        path:
          item.count > 0 && angle >= 359.99
            ? createDonutArcPath(0, 359.99)
            : item.count > 0
              ? createDonutArcPath(startAngle, endAngle)
              : "",
      };
      return segment;
    });

    return {
      items: segments,
      total,
    };
  }, [data.drafts]);

  const lastUpdated = new Date().toLocaleString();
  const draftCheckerGroups = useMemo(
    () =>
      payrollActivity.items.map((item) => ({
        ...item,
        drafts: data.drafts
          .filter((draft) => getPayrollActivityKey(draft) === item.key)
          .map((draft) => ({
            id: draft.id || `${getDraftDisplayName(draft)}-${getDraftStatus(draft)}`,
            name: getDraftDisplayName(draft),
            fileType: getDraftFileType(draft),
          })),
      })),
    [data.drafts, payrollActivity.items]
  );

  return (
    <IonPage id="main-content">
      <IonContent fullscreen className="admin-content">
        <IonImg src="/Gradient-Ellipses.png" className="admin-bg" />

        <IonGrid className="admin-shell">
          <IonRow>
            <IonCol>
              <IonText>
                <h1 className="admin-title">System Monitor</h1>
                <p className="admin-subtitle">
                  Live overview of account, client, inquiry, tutorial, and payroll activity.
                </p>
                {backendError && <p className="admin-warning">{backendError}</p>}
              </IonText>
            </IonCol>
          </IonRow>

          {loading && (
            <IonRow>
              <IonCol className="ion-text-center">
                <IonSpinner name="crescent" />
              </IonCol>
            </IonRow>
          )}

          <IonRow>
            {monitors.map((item) => (
              <IonCol key={item.key} size="12" sizeMd="6" sizeLg="3">
                <IonCard className="admin-card">
                  <IonCardContent>
                    <p className="admin-stat">{stats[item.key]}</p>
                    <p className="admin-card-text">{item.label}</p>
                  </IonCardContent>
                </IonCard>
              </IonCol>
            ))}
          </IonRow>

          <IonRow>
            <IonCol size="12" sizeLg="6">
              <IonCard className="admin-card">
                <IonCardContent>
                  <h2 className="admin-card-title">Account Split</h2>
                  <p className="admin-card-text">
                    Client staff and bookkeeper accounts are tracked separately so bookkeeper access stays reserved for admin-created staff accounts.
                  </p>
                </IonCardContent>
              </IonCard>
            </IonCol>
            <IonCol size="12" sizeLg="6">
              <IonCard className="admin-card">
                <IonCardContent>
                  <h2 className="admin-card-title">Last Refreshed</h2>
                  <p className="admin-card-text">{lastUpdated}</p>
                </IonCardContent>
              </IonCard>
            </IonCol>
          </IonRow>

          <IonRow>
            <IonCol size="12">
              <IonCard className="admin-card">
                <IonCardContent>
                  <div className="admin-chart-header">
                    <div>
                      <h2 className="admin-card-title">Payroll Activity</h2>
                      <p className="admin-section-description">
                        Draft counts by current payroll workflow status.
                      </p>
                    </div>
                    <span className="admin-count-badge">{stats.drafts} drafts</span>
                  </div>

                  <div className="admin-payroll-donut-chart">
                    <div className="admin-donut-wrap">
                      <svg
                        className="admin-donut-svg"
                        viewBox="0 0 220 220"
                        role="img"
                        aria-label="Payroll draft activity donut chart"
                      >
                        <circle className="admin-donut-track" cx="110" cy="110" r="84" />
                        {payrollActivity.items.map((item) => (
                          <path
                            key={item.key}
                            className={`admin-donut-segment admin-donut-${item.key}`}
                            d={item.path}
                            style={{ fill: item.color }}
                          />
                        ))}
                      </svg>
                      <div className="admin-donut-center">
                        <strong>{payrollActivity.total}</strong>
                        <span>drafts</span>
                      </div>
                    </div>

                    <div className="admin-payroll-activity-details">
                      <div className="admin-donut-legend">
                        {payrollActivity.items.map((item) => (
                          <div className="admin-donut-legend-item" key={item.key}>
                            <span className={`admin-donut-dot admin-donut-dot-${item.key}`} />
                            <div>
                              <strong>{item.label}</strong>
                              <p>{item.count} drafts - {item.percent}%</p>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="admin-draft-checker">
                        <h3>Draft Checker</h3>
                        {draftCheckerGroups.map((group) => (
                          <div className="admin-draft-checker-group" key={group.key}>
                            <div className="admin-draft-checker-heading">
                              <span className={`admin-donut-dot admin-donut-dot-${group.key}`} />
                              <strong>{group.label}</strong>
                            </div>
                            {group.drafts.length > 0 ? (
                              <div className="admin-draft-checker-list">
                                {group.drafts.map((draft) => (
                                  <div className="admin-draft-checker-item" key={draft.id}>
                                    <span>{draft.name}</span>
                                    <strong>{draft.fileType}</strong>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="admin-draft-checker-empty">No drafts</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <p className="admin-chart-timestamp">Updated {lastUpdated}</p>
                </IonCardContent>
              </IonCard>
            </IonCol>
          </IonRow>
        </IonGrid>
      </IonContent>

      <FooterNav />
    </IonPage>
  );
}
