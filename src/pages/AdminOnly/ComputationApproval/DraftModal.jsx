import { IonButton, IonIcon, IonGrid, IonRow, IonCol } from "@ionic/react";
import { checkmarkOutline, closeOutline } from "ionicons/icons";

export default function DraftModal({ draft, onClose, onApprove, onRevise }) {
  if (!draft) return null;

  return (
    <div className="modal-overlay">
      <IonGrid className="modal-card">

        <IonRow>
          <IonCol className="ion-text-center">
            <h2>Draft: {draft.clientName}</h2>
            <p>Bookkeeper: {draft.bookkeeperName}</p>
            <p>Payroll Period: {draft.payrollPeriod}</p>
          </IonCol>
        </IonRow>

        <IonRow>
          <IonCol>
            <div className="table-scroll-container">
              <table className="results-data-table">
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
                  {draft.data.map((row, i) => (
                    <tr key={i}>
                      <td>{row.employeeCode}</td>
                      <td>{row.name}</td>
                      <td>₱{row.ratePerHour.toFixed(2)}</td>
                      <td>{row.hoursWorked}</td>
                      <td>₱{row.grossPay.toFixed(2)}</td>
                      <td>₱{row.sss.toFixed(2)}</td>
                      <td>₱{row.phic.toFixed(2)}</td>
                      <td>₱{row.hdmf.toFixed(2)}</td>
                      <td>₱{row.bir.toFixed(2)}</td>
                      <td style={{ fontWeight: "bold" }}>₱{row.netPay.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </IonCol>
        </IonRow>

        <IonRow className="ion-text-center ion-padding-top">
          <IonCol>
            <IonButton color="success" onClick={() => onApprove(draft.id)}>
              <IonIcon icon={checkmarkOutline} /> Approve
            </IonButton>

            <IonButton color="danger" onClick={() => onRevise(draft.id)} className="ion-margin-start">
              <IonIcon icon={closeOutline} /> Request Revision
            </IonButton>

            <IonButton color="medium" className="ion-margin-start" onClick={onClose}>
              Close
            </IonButton>
          </IonCol>
        </IonRow>

      </IonGrid>
    </div>
  );
}
