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
  IonInput,
  IonItem,
  IonLabel,
  IonSearchbar,
  IonSpinner,
  IonToast,
} from "@ionic/react";

import {
  createBookkeeperViaBackend,
  fetchBookkeepers,
} from "../../services/adminBackendService";
import FooterNav from "../../components/FooterNav";
import "./AdminPages.css";

const initialForm = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  phoneNumber: "",
  department: "",
  position: "",
};

const getName = (user) =>
  [user.firstName, user.lastName].filter(Boolean).join(" ") ||
  user.name ||
  user.email ||
  "Unnamed bookkeeper";

const sortBookkeepers = (users) =>
  [...users].sort((a, b) => {
    const aName = getName(a).toLowerCase();
    const bName = getName(b).toLowerCase();

    if (aName !== bName) return aName.localeCompare(bName);
    return String(a.email || "").localeCompare(String(b.email || ""));
  });

export default function BookkeeperAccountsAdmin() {
  const [bookkeepers, setBookkeepers] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ open: false, message: "" });
  const [backendError, setBackendError] = useState("");

  const loadBookkeepers = async () => {
    setLoading(true);
    try {
      const backendBookkeepers = await fetchBookkeepers();
      setBookkeepers(backendBookkeepers);
      setBackendError("");
    } catch (error) {
      setBackendError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookkeepers();
  }, []);

  const filteredBookkeepers = useMemo(() => {
    const value = search.toLowerCase();
    return sortBookkeepers(bookkeepers).filter((user) =>
      [getName(user), user.email, user.phoneNumber, user.department, user.position]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(value))
    );
  }, [bookkeepers, search]);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleCreate = async (event) => {
    event.preventDefault();

    if (!form.firstName || !form.lastName || !form.email || !form.password) {
      setToast({ open: true, message: "Please fill in the required fields." });
      return;
    }

    setSaving(true);
    try {
      await createBookkeeperViaBackend(form);
      setToast({ open: true, message: "Bookkeeper account created." });
      setForm(initialForm);
      loadBookkeepers();
    } catch (error) {
      const message =
        error.status === 404
          ? "The standalone backend does not include POST /api/users/bookkeepers yet."
          : error.message || "Unable to create bookkeeper account.";
      setToast({
        open: true,
        message,
      });
    } finally {
      setSaving(false);
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
                <h1 className="admin-title">Bookkeeper Accounts</h1>
                <p className="admin-subtitle">
                  Create bookkeeper accounts here. These accounts are reserved for client staff support and are not available through public signup.
                </p>
                {backendError && <p className="admin-warning">{backendError}</p>}
              </IonText>
            </IonCol>
          </IonRow>

          <IonRow className="admin-create-row">
            <IonCol size="12" sizeLg="8">
              <IonCard className="admin-card">
                <IonCardContent>
                  <h2 className="admin-card-title">Create Bookkeeper</h2>
                  <form className="admin-form-grid" onSubmit={handleCreate}>
                    <IonItem>
                      <IonLabel position="stacked">First Name</IonLabel>
                      <IonInput value={form.firstName} onIonInput={(event) => updateField("firstName", event.detail.value || "")} />
                    </IonItem>
                    <IonItem>
                      <IonLabel position="stacked">Last Name</IonLabel>
                      <IonInput value={form.lastName} onIonInput={(event) => updateField("lastName", event.detail.value || "")} />
                    </IonItem>
                    <IonItem>
                      <IonLabel position="stacked">Email</IonLabel>
                      <IonInput type="email" value={form.email} onIonInput={(event) => updateField("email", event.detail.value || "")} />
                    </IonItem>
                    <IonItem>
                      <IonLabel position="stacked">Temporary Password</IonLabel>
                      <IonInput type="password" value={form.password} onIonInput={(event) => updateField("password", event.detail.value || "")} />
                    </IonItem>
                    <IonItem>
                      <IonLabel position="stacked">Phone Number</IonLabel>
                      <IonInput value={form.phoneNumber} onIonInput={(event) => updateField("phoneNumber", event.detail.value || "")} />
                    </IonItem>
                    <IonItem>
                      <IonLabel position="stacked">Department</IonLabel>
                      <IonInput value={form.department} onIonInput={(event) => updateField("department", event.detail.value || "")} />
                    </IonItem>
                    <IonItem>
                      <IonLabel position="stacked">Position</IonLabel>
                      <IonInput value={form.position} onIonInput={(event) => updateField("position", event.detail.value || "")} />
                    </IonItem>
                    <div className="admin-actions">
                      <IonButton className="admin-primary-btn" type="submit" disabled={saving}>
                        {saving ? <IonSpinner name="crescent" /> : "Create Account"}
                      </IonButton>
                    </div>
                  </form>
                </IonCardContent>
              </IonCard>
            </IonCol>
          </IonRow>

          <IonRow>
            <IonCol size="12">
              <div className="admin-account-section">
                <div className="admin-account-section-header">
                  <div>
                    <h2 className="admin-card-title">Existing Bookkeepers</h2>
                    <p className="admin-section-description">
                      Review bookkeeper contact details and account status after creating new staff accounts.
                    </p>
                  </div>
                  <span className="admin-count-badge">{filteredBookkeepers.length} users</span>
                </div>

              <IonSearchbar
                className="admin-search"
                value={search}
                onIonInput={(event) => setSearch(event.detail.value || "")}
                placeholder="Search bookkeepers"
              />

              {loading ? (
                <div className="ion-text-center">
                  <IonSpinner name="crescent" />
                </div>
              ) : (
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Phone</th>
                        <th>Department</th>
                        <th>Position</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredBookkeepers.map((user) => (
                        <tr key={user.id}>
                          <td>{getName(user)}</td>
                          <td>{user.email || "No email"}</td>
                          <td>{user.phoneNumber || "Not set"}</td>
                          <td>{user.department || "Accounting"}</td>
                          <td>{user.position || "Bookkeeper"}</td>
                          <td><span className="admin-status">{user.disabled ? "Disabled" : "Active"}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredBookkeepers.length === 0 && (
                    <div className="admin-empty">No bookkeeper accounts found.</div>
                  )}
                </div>
              )}
              </div>
            </IonCol>
          </IonRow>
        </IonGrid>

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
