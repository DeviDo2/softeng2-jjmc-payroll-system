import { IonButton } from "@ionic/react";

export default function DraftTable({ drafts, loading, onSelect }) {
  return (
    <div className="table-scroll-container">
      <table className="results-data-table">
        <thead>
          <tr>
            <th>Bookkeeper Name</th>
            <th>Client Name</th>
            <th>Payroll Period</th>
            <th>Computation</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {loading ? (
            <tr><td colSpan="5">Loading drafts...</td></tr>
          ) : drafts.length === 0 ? (
            <tr><td colSpan="5">No pending drafts</td></tr>
          ) : (
            drafts.map(draft => (
              <tr key={draft.id}>
                <td>{draft.bookkeeperName || "Unknown"}</td>
                <td>{draft.clientName || "Unknown"}</td>
                <td>{draft.payrollPeriod || "Unknown"}</td>
                <td>{draft.data ? "Draft" : "Empty"}</td>
                <td>
                  <IonButton
                    color="primary"
                    size="small"
                    onClick={() => onSelect(draft)}
                  >
                    View
                  </IonButton>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
