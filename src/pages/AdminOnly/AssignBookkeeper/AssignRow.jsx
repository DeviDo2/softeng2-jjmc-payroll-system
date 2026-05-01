import React, { useState, useEffect } from "react";
import {
  IonButton,
  IonIcon,
  IonModal,
  IonContent,
  IonGrid,
  IonRow,
  IonCol,
  IonSpinner,
} from "@ionic/react";

import { checkmarkOutline } from "ionicons/icons";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../../database-components/firebaseConfig";

import { parseCSV } from "../../BookkeeperOnly/ComputationEngine/csvParser";
import BookkeeperSelectPopover from "./BookkeeperSelectPopover";

export default function AssignRow({ client, bookkeepers, onAssign }) {
  const [showModal, setShowModal] = useState(false);
  const [csvData, setCsvData] = useState(null);
  const [loading, setLoading] = useState(false);

  const [assignedName, setAssignedName] = useState("None");

  const [showPopover, setShowPopover] = useState(false);
  const [popoverEvent, setPopoverEvent] = useState(null);

  // Load assigned bookkeeper name
  useEffect(() => {
    const loadName = async () => {
      if (!client.bookkeeperId) {
        setAssignedName("None");
        return;
      }

      const snap = await getDoc(doc(db, "users", client.bookkeeperId));
      if (snap.exists()) {
        const u = snap.data();
        setAssignedName(`${u.firstName} ${u.lastName}`);
      } else {
        setAssignedName("None");
      }
    };

    loadName();
  }, [client.bookkeeperId]);

  // Load CSV into modal
  const openViewer = async () => {
    setShowModal(true);
    setLoading(true);

    try {
      const snap = await getDoc(doc(db, "clientCompanies", client.id));
      if (snap.exists()) {
        const data = snap.data();

        if (data.parsedCSV) {
          setCsvData(data.parsedCSV);
        } else if (data.csv) {
          const parsed = await parseCSV(
            new Blob([data.csv], { type: "text/csv" })
          );
          setCsvData(parsed);
        }
      }
    } catch (err) {
      console.error("CSV Load Error:", err);
      setCsvData([]);
    }

    setLoading(false);
  };

  const openBkPopover = (e) => {
    e.preventDefault();
    setPopoverEvent({ clientX: e.clientX, clientY: e.clientY });
    setShowPopover(true);
  };

  const handleSelectBk = (bk) => {
    onAssign(client, bk);
    setShowPopover(false);
  };

  const rowHeight = 45; // px
const buffer = 5;

const virtualRef = React.useRef(null);
const [visibleRows, setVisibleRows] = useState([]);

useEffect(() => {
  if (!csvData?.length) return;
  updateVisibleRows(); // initial render
}, [csvData]);

const handleVirtualScroll = () => updateVisibleRows();

const updateVisibleRows = () => {
  const container = virtualRef.current;
  if (!container) return;

  const scrollTop = container.scrollTop;
  const viewportHeight = container.clientHeight;

  const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - buffer);
  const endIndex = Math.min(
    csvData.length,
    Math.ceil((scrollTop + viewportHeight) / rowHeight) + buffer
  );

  const rows = [];
  for (let i = startIndex; i < endIndex; i++) {
    rows.push({
      index: i,
      row: csvData[i],
    });
  }

  setVisibleRows(rows);
};


  return (
    <>
      <tr>
        <td>{client.name}</td>

        <td>
          <IonButton size="small" onClick={openViewer}>
            View CSV
          </IonButton>
        </td>

        <td>{assignedName}</td>

        <td>{client.status || "Unknown"}</td>

        <td>
          <IonButton size="small" color="success" onClick={openBkPopover}>
            <IonIcon icon={checkmarkOutline} />
          </IonButton>
        </td>
      </tr>

      {/* CSV Modal */}
      <IonModal isOpen={showModal} onDidDismiss={() => setShowModal(false)}>
        <IonContent>
          <h2>{client.name} — Staff CSV</h2>

          {loading ? (
            <div className="csv-loading">
              <IonSpinner />
              <p>Loading CSV…</p>
            </div>
          ) : !csvData?.length ? (
            <p>No CSV found.</p>
          ) : (
            <div className="csv-virtual-wrapper">
              {/* Horizontal scroll area */}
              <div className="csv-horizontal-scroll">

                {/* Sticky Header */}
                <div className="csv-header-row">
                  {Object.keys(csvData[0]).map((h) => (
                    <div className="csv-header-cell" key={h}>{h}</div>
                  ))}
                </div>

                {/* Virtualized Body */}
                <div
                  className="csv-virtual-body"
                  ref={virtualRef}
                  onScroll={handleVirtualScroll}
                >
                  <div
                    style={{ height: csvData.length * rowHeight, position: "relative" }}
                  >
                    {visibleRows.map(({ index, row }) => (
                      <div
                        key={index}
                        className={`csv-row ${index % 2 === 0 ? "even" : "odd"}`}
                        style={{
                          position: "absolute",
                          top: index * rowHeight,
                          height: rowHeight,
                        }}
                      >
                        {Object.values(row).map((v, i) => (
                          <div className="csv-cell" key={i}>
                            {v}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          )}

          <div style={{ marginTop: 20 }}>
            <IonButton onClick={() => setShowModal(false)}>Close</IonButton>
          </div>
        </IonContent>
      </IonModal>


      <BookkeeperSelectPopover
        isOpen={showPopover}
        event={popoverEvent}
        onDismiss={() => setShowPopover(false)}
        onSelect={handleSelectBk}
      />
    </>
  );
}
