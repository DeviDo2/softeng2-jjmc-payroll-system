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
  IonButton,
  IonSearchbar,
  IonSpinner,
} from "@ionic/react";

import { fetchUsers } from "../../services/adminBackendService";
import FooterNav from "../../components/FooterNav";
import "./AdminPages.css";

const getName = (user) =>
  [user.firstName, user.lastName].filter(Boolean).join(" ") ||
  user.name ||
  user.email ||
  "Unnamed account";

const ROLE_DETAILS = {
  "client-staff": {
    title: "Client Staff Accounts",
    label: "Client Staff",
    description: "Company users who view payroll records and send inquiries.",
  },
  bookkeeper: {
    title: "Bookkeeper Accounts",
    label: "Bookkeeper",
    description: "Accounting users assigned to clients and payroll work.",
  },
  admin: {
    title: "Admin Accounts",
    label: "Admin",
    description: "System administrators who can manage users and approvals.",
  },
};

const getRoleDetails = (role) =>
  ROLE_DETAILS[role] || {
    title: "Other Accounts",
    label: "Other",
    description: "Accounts that need role review.",
  };

const getUserId = (user) => user.id || user.uid || "No ID";

const sortAccounts = (accounts) =>
  [...accounts].sort((a, b) => {
    const aName = getName(a).toLowerCase();
    const bName = getName(b).toLowerCase();

    if (aName !== bName) return aName.localeCompare(bName);
    return String(a.email || "").localeCompare(String(b.email || ""));
  });

const AccountTable = ({ role, users, showCount = true }) => {
  const roleDetails = getRoleDetails(role);

  return (
    <div className="admin-account-section">
      <div className="admin-account-section-header">
        <div>
          <h2 className="admin-card-title">{roleDetails.title}</h2>
          <p className="admin-section-description">{roleDetails.description}</p>
        </div>
        {showCount && <span className="admin-count-badge">{users.length} users</span>}
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>User ID</th>
              <th>Company</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={getUserId(user)}>
                <td>{getName(user)}</td>
                <td>{user.email || "No email"}</td>
                <td><span className="admin-role-badge">{roleDetails.label}</span></td>
                <td className="admin-id-cell">{getUserId(user)}</td>
                <td>{user.company || user.companyName || "JJMC"}</td>
                <td><span className="admin-status">{user.disabled ? "Disabled" : "Active"}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && <div className="admin-empty">No accounts found.</div>}
      </div>
    </div>
  );
};

export default function ManageAccountsAdmin() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [backendError, setBackendError] = useState("");

  useEffect(() => {
    let active = true;

    const loadUsers = async () => {
      setLoading(true);
      try {
        const backendUsers = await fetchUsers();
        if (!active) return;
        setUsers(backendUsers);
        setBackendError("");
      } catch (error) {
        if (active) setBackendError(error.message);
      } finally {
        if (active) setLoading(false);
      }
    };

    loadUsers();

    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const value = search.toLowerCase();
    return sortAccounts(users).filter((user) =>
      [getName(user), user.email, user.role, user.company]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(value))
    );
  }, [search, users]);

  const bookkeepers = filtered.filter((user) => user.role === "bookkeeper");
  const clientStaff = filtered.filter((user) => user.role === "client-staff");
  const admins = filtered.filter((user) => user.role === "admin");

  return (
    <IonPage id="main-content">
      <IonContent fullscreen className="admin-content">
        <IonImg src="/Gradient-Ellipses.png" className="admin-bg" />

        <IonGrid className="admin-shell">
          <IonRow>
            <IonCol>
              <IonText>
                <h1 className="admin-title">Manage Accounts</h1>
                <p className="admin-subtitle">
                  Review all system accounts grouped by role. Bookkeepers are managed on their own admin page.
                </p>
                {backendError && <p className="admin-warning">{backendError}</p>}
              </IonText>
            </IonCol>
          </IonRow>

          <IonRow>
            <IonCol size="12" sizeMd="6">
              <IonCard className="admin-card">
                <IonCardContent>
                  <p className="admin-stat">{clientStaff.length}</p>
                  <p className="admin-card-text">Client staff accounts</p>
                </IonCardContent>
              </IonCard>
            </IonCol>
            <IonCol size="12" sizeMd="6">
              <IonCard className="admin-card">
                <IonCardContent>
                  <p className="admin-stat">{bookkeepers.length}</p>
                  <p className="admin-card-text">Bookkeeper accounts</p>
                </IonCardContent>
              </IonCard>
            </IonCol>
          </IonRow>

          <IonRow>
            <IonCol size="12">
              <div className="admin-actions">
                <IonButton className="admin-primary-btn" routerLink="/admin-bookkeeper-accounts">
                  Bookkeeper Accounts
                </IonButton>
                <IonButton className="admin-secondary-btn" fill="outline" routerLink="/admin-system-monitor">
                  System Monitor
                </IonButton>
              </div>
            </IonCol>
          </IonRow>

          <IonRow>
            <IonCol size="12">
              <IonSearchbar
                className="admin-search"
                value={search}
                onIonInput={(event) => setSearch(event.detail.value || "")}
                placeholder="Search accounts"
              />
            </IonCol>
          </IonRow>

          {loading ? (
            <IonRow>
              <IonCol className="ion-text-center">
                <IonSpinner name="crescent" />
              </IonCol>
            </IonRow>
          ) : (
            <>
              <IonRow>
                <IonCol>
                  <AccountTable role="client-staff" users={clientStaff} />
                </IonCol>
              </IonRow>
              <IonRow>
                <IonCol>
                  <AccountTable role="bookkeeper" users={bookkeepers} />
                </IonCol>
              </IonRow>
              <IonRow>
                <IonCol>
                  <AccountTable role="admin" users={admins} showCount={false} />
                </IonCol>
              </IonRow>
            </>
          )}
        </IonGrid>
      </IonContent>

      <FooterNav />
    </IonPage>
  );
}
