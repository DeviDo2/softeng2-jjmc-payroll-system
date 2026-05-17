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
  IonButtons,
  IonHeader,
  IonInput,
  IonItem,
  IonLabel,
  IonModal,
  IonSearchbar,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonTitle,
  IonToast,
  IonToolbar,
} from "@ionic/react";

import {
  fetchUsers,
  removeUserAccount,
  updateUserAccount,
} from "../../services/adminBackendService";
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

const isAdminAccount = (user) => user?.role === "admin";

const getCompanyName = (user) =>
  user.company ||
  user.companyName ||
  user.assignedCompany ||
  user.clientCompany ||
  "JJMC";

const getStatusValue = (user) => (user.disabled ? "disabled" : "active");

const sortAccounts = (accounts) =>
  [...accounts].sort((a, b) => {
    const aName = getName(a).toLowerCase();
    const bName = getName(b).toLowerCase();

    if (aName !== bName) return aName.localeCompare(bName);
    return String(a.email || "").localeCompare(String(b.email || ""));
  });

const AccountTable = ({ role, users, showCount = true, onEdit, onRemove }) => {
  const roleDetails = getRoleDetails(role);
  const companyColumn = role === "bookkeeper" ? "Assigned Company" : "Company";

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
              <th>User ID</th>
              <th>{companyColumn}</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={getUserId(user)}>
                <td>{getName(user)}</td>
                <td>{user.email || "No email"}</td>
                <td className="admin-id-cell">{getUserId(user)}</td>
                <td>{getCompanyName(user)}</td>
                <td>
                  <div className="admin-status-actions">
                    <span className="admin-status">{user.disabled ? "Disabled" : "Active"}</span>
                    {!isAdminAccount(user) && (
                      <>
                        <IonButton size="small" fill="outline" className="admin-table-action" onClick={() => onEdit(user)}>
                          Edit
                        </IonButton>
                        <IonButton
                          size="small"
                          color="danger"
                          fill="outline"
                          className="admin-table-action"
                          onClick={() => onRemove(user)}
                        >
                          Remove
                        </IonButton>
                      </>
                    )}
                  </div>
                </td>
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
  const [savingAccount, setSavingAccount] = useState(false);
  const [backendError, setBackendError] = useState("");
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    company: "",
    department: "",
    position: "",
    status: "active",
    password: "",
  });
  const [toast, setToast] = useState({ open: false, message: "" });

  const loadUsers = async () => {
    setLoading(true);
    try {
      const backendUsers = await fetchUsers();
      setUsers(backendUsers);
      setBackendError("");
    } catch (error) {
      setBackendError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;

    const loadActiveUsers = async () => {
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

    loadActiveUsers();

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

  const admins = filtered.filter((user) => user.role === "admin");
  const bookkeepers = filtered.filter((user) => user.role === "bookkeeper");
  const clientStaff = filtered.filter((user) => user.role === "client-staff");
  const openEditModal = (user) => {
    setEditingUser(user);
    setEditForm({
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      email: user.email || "",
      phoneNumber: user.phoneNumber || "",
      company: getCompanyName(user),
      department: user.department || "",
      position: user.position || "",
      status: getStatusValue(user),
      password: "",
    });
  };

  const updateEditField = (field, value) => {
    setEditForm((current) => ({ ...current, [field]: value }));
  };

  const handleSaveAccount = async () => {
    if (!editingUser) return;

    setSavingAccount(true);
    try {
      const editingAdmin = isAdminAccount(editingUser);
      const updates = {
        ...editForm,
        disabled: editingAdmin ? editingUser.disabled === true : editForm.status === "disabled",
      };

      delete updates.status;

      if (editingAdmin) {
        delete updates.email;
        delete updates.password;
        delete updates.disabled;
      } else if (!updates.password) {
        delete updates.password;
      }

      await updateUserAccount(getUserId(editingUser), updates);
      setToast({ open: true, message: "Account updated." });
      setEditingUser(null);
      loadUsers();
    } catch (error) {
      setToast({ open: true, message: error.message || "Unable to update account." });
    } finally {
      setSavingAccount(false);
    }
  };

  const handleRemoveAccount = async (user) => {
    if (isAdminAccount(user)) {
      setToast({ open: true, message: "Admin accounts cannot be removed here." });
      return;
    }

    const name = getName(user);
    if (!window.confirm(`Remove ${name}? This will permanently delete the account.`)) return;

    try {
      await removeUserAccount(getUserId(user));
      setToast({ open: true, message: "Account removed." });
      loadUsers();
    } catch (error) {
      setToast({ open: true, message: error.message || "Unable to remove account." });
    }
  };

  return (
    <IonPage id="main-content">
      <IonContent fullscreen className="admin-content">
        <IonImg src="/assets/Gradient-Ellipses.png" className="admin-bg" />

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
            <IonCol size="12" sizeMd="4">
              <IonCard className="admin-card">
                <IonCardContent>
                  <p className="admin-stat">{clientStaff.length}</p>
                  <p className="admin-card-text">Client staff accounts</p>
                </IonCardContent>
              </IonCard>
            </IonCol>
            <IonCol size="12" sizeMd="4">
              <IonCard className="admin-card">
                <IonCardContent>
                  <p className="admin-stat">{bookkeepers.length}</p>
                  <p className="admin-card-text">Bookkeeper accounts</p>
                </IonCardContent>
              </IonCard>
            </IonCol>
            <IonCol size="12" sizeMd="4">
              <IonCard className="admin-card">
                <IonCardContent>
                  <p className="admin-stat">{admins.length}</p>
                  <p className="admin-card-text">Admin accounts</p>
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
                  <AccountTable
                    role="client-staff"
                    users={clientStaff}
                    onEdit={openEditModal}
                    onRemove={handleRemoveAccount}
                  />
                </IonCol>
              </IonRow>
              <IonRow>
                <IonCol>
                  <AccountTable
                    role="bookkeeper"
                    users={bookkeepers}
                    onEdit={openEditModal}
                    onRemove={handleRemoveAccount}
                  />
                </IonCol>
              </IonRow>
              <IonRow>
                <IonCol>
                  <AccountTable
                    role="admin"
                    users={admins}
                    onEdit={openEditModal}
                    onRemove={handleRemoveAccount}
                  />
                </IonCol>
              </IonRow>
            </>
          )}
        </IonGrid>

        <IonModal isOpen={Boolean(editingUser)} onDidDismiss={() => setEditingUser(null)}>
          <IonHeader>
            <IonToolbar>
              <IonTitle>Edit Account</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => setEditingUser(null)}>Close</IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent className="admin-modal-content">
            <div className="admin-modal-form">
              {isAdminAccount(editingUser) && (
                <p className="admin-warning">
                  Admin credentials, status, and deletion are protected from this page.
                </p>
              )}
              <IonItem>
                <IonLabel position="stacked">First Name</IonLabel>
                <IonInput value={editForm.firstName} onIonInput={(event) => updateEditField("firstName", event.detail.value || "")} />
              </IonItem>
              <IonItem>
                <IonLabel position="stacked">Last Name</IonLabel>
                <IonInput value={editForm.lastName} onIonInput={(event) => updateEditField("lastName", event.detail.value || "")} />
              </IonItem>
              <IonItem>
                <IonLabel position="stacked">Email</IonLabel>
                <IonInput
                  type="email"
                  value={editForm.email}
                  disabled={isAdminAccount(editingUser)}
                  onIonInput={(event) => updateEditField("email", event.detail.value || "")}
                />
              </IonItem>
              <IonItem>
                <IonLabel position="stacked">Phone Number</IonLabel>
                <IonInput value={editForm.phoneNumber} onIonInput={(event) => updateEditField("phoneNumber", event.detail.value || "")} />
              </IonItem>
              <IonItem>
                <IonLabel position="stacked">Company</IonLabel>
                <IonInput value={editForm.company} onIonInput={(event) => updateEditField("company", event.detail.value || "")} />
              </IonItem>
              <IonItem>
                <IonLabel position="stacked">Department</IonLabel>
                <IonInput value={editForm.department} onIonInput={(event) => updateEditField("department", event.detail.value || "")} />
              </IonItem>
              <IonItem>
                <IonLabel position="stacked">Position</IonLabel>
                <IonInput value={editForm.position} onIonInput={(event) => updateEditField("position", event.detail.value || "")} />
              </IonItem>
              <IonItem>
                <IonLabel position="stacked">Status</IonLabel>
                <IonSelect
                  value={editForm.status}
                  disabled={isAdminAccount(editingUser)}
                  onIonChange={(event) => updateEditField("status", event.detail.value)}
                >
                  <IonSelectOption value="active">Active</IonSelectOption>
                  <IonSelectOption value="disabled">Disabled</IonSelectOption>
                </IonSelect>
              </IonItem>
              <IonItem>
                <IonLabel position="stacked">New Password</IonLabel>
                <IonInput
                  type="password"
                  value={editForm.password}
                  placeholder="Leave blank to keep current password"
                  disabled={isAdminAccount(editingUser)}
                  onIonInput={(event) => updateEditField("password", event.detail.value || "")}
                />
              </IonItem>
              <div className="admin-actions">
                <IonButton className="admin-primary-btn" onClick={handleSaveAccount} disabled={savingAccount}>
                  {savingAccount ? <IonSpinner name="crescent" /> : "Save Changes"}
                </IonButton>
              </div>
            </div>
          </IonContent>
        </IonModal>

        <IonToast
          isOpen={toast.open}
          message={toast.message}
          duration={2500}
          onDidDismiss={() => setToast({ open: false, message: "" })}
        />
      </IonContent>

      <FooterNav />
    </IonPage>
  );
}
