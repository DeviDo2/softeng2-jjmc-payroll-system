import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonGrid,
  IonModal,
  IonRow,
  IonCol,
  IonTitle,
  IonToolbar,
  IonCardContent,
  IonText,
} from "@ionic/react";
import { checkmarkOutline, closeOutline } from "ionicons/icons";
import "./DraftModal.css";

const money = (value) => `₱${(Number(value) || 0).toFixed(2)}`;

export default function DraftModal({ draft, onClose, onApprove, onRevise }) {
  if (!draft) return null;
  const rows = Array.isArray(draft.data) ? draft.data : [];
  const status = draft.status || "pending_approval";

  return (
    <IonModal
      className="draft-preview-modal"
      isOpen={Boolean(draft)}
      onDidDismiss={onClose}
    >
      <IonHeader className="draft-preview-header">
        <IonToolbar className="draft-preview-toolbar">
          <IonButtons slot="start">
            <IonButton fill="clear" onClick={onClose}>
              <IonIcon icon={closeOutline} />
            </IonButton>
          </IonButtons>
          <IonTitle>
            {draft.clientName} - Draft Preview
          </IonTitle>
          <IonButtons slot="end" className="draft-preview-toolbar-actions">
            <IonButton
              className="draft-action-btn draft-action-btn--approve"
              color="success"
              fill="solid"
              onClick={() => onApprove(draft.id)}
            >
              <IonIcon icon={checkmarkOutline} slot="start" />
              Approve
            </IonButton>
            <IonButton
              className="draft-action-btn draft-action-btn--revise"
              color="danger"
              fill="solid"
              onClick={() => onRevise(draft.id)}
            >
              <IonIcon icon={closeOutline} slot="start" />
              Request Revision
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="draft-preview-content">
        <div className="draft-preview-shell">
          <IonGrid className="draft-preview-grid">
            <IonRow>
              <IonCol>
                <div className="draft-preview-summary-card">
                  <IonCol>
                      <IonText>
                          <div className="draft-preview-summary-title">
                            <h3>Computation Draft Summary</h3>
                          </div>
                      </IonText>
                  </IonCol>
                  <IonCardContent>
                    <IonCol>
                      <IonRow size="12" sizeMd="6" className="draft-preview-summary-row">
                        <IonText>
                            <IonCol className="ion-col-padding">
                            <IonRow size="12" sizeMd="6">
                              <p><strong>Client:</strong> {draft.clientName}</p>
                            </IonRow>
                            <IonRow size="12" sizeMd="6">
                              <p><strong>Bookkeeper:</strong> {draft.bookkeeperName}</p>
                            </IonRow>
                            <IonRow size="12" sizeMd="6">
                              <p><strong>Payroll Period:</strong> {draft.payrollPeriod}</p>
                            </IonRow>
                            <IonRow size="12" sizeMd="6">
                              <p><strong>Total Employees:</strong> {rows.length}</p>
                            </IonRow>
                            </IonCol>
                        </IonText>
                      </IonRow>
                    </IonCol>
                    </IonCardContent>
                </div>
              </IonCol>
            </IonRow>

            <IonRow>
              <IonCol>
                <div className="draft-preview-table-shell">
                  <table className="draft-preview-table">
                    <thead>
                      <tr>
                        <th>Employee Code</th>
                        <th>Name</th>
                        <th>Rate/hr</th>
                        <th>Hours</th>
                        <th>Gross Pay</th>
                        <th>SSS</th>
                        <th>PHIC</th>
                        <th>HDMF</th>
                        <th>BIR</th>
                        <th>Net Pay</th>
                      </tr>
                    </thead>

                    <tbody>
                      {rows.length === 0 ? (
                        <tr>
                          <td colSpan="10" className="draft-preview-empty-row">
                            No payroll rows found for this draft.
                          </td>
                        </tr>
                      ) : rows.map((row, i) => (
                        <tr key={i}>
                          <td>{row.employeeCode}</td>
                          <td>{row.name}</td>
                          <td>{money(row.ratePerHour)}</td>
                          <td>{row.hoursWorked}</td>
                          <td className="draft-preview-cell-strong">{money(row.grossPay || row.grossMonthly)}</td>
                          <td className="draft-preview-cell-negative">{money(row.sss)}</td>
                          <td className="draft-preview-cell-negative">{money(row.phic || row.philHealth)}</td>
                          <td className="draft-preview-cell-negative">{money(row.hdmf || row.pagIbig)}</td>
                          <td className="draft-preview-cell-negative">{money(row.bir || row.tax)}</td>
                          <td className="draft-preview-cell-positive draft-preview-cell-strong">{money(row.netPay)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </IonCol>
            </IonRow>
          </IonGrid>
        </div>
      </IonContent>
    </IonModal>
  );
}
