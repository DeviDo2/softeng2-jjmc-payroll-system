import { useEffect, useState } from "react";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../../../database-components/firebaseConfig"; // adjust path to your firebase config
import { format } from "date-fns";

import "./ComputationPage.css";

const ComputationHistory = ({ user }) => {
  const [history, setHistory] = useState([]);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "clientPayrollDrafts"),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setHistory(data);
    });

    return () => unsub();
  }, [user]);

  return (
    <div className="w-full flex flex-col gap-4 p-6">
      <h1 className="text-2xl font-bold">Computation History</h1>

      {/* History Table */}
      <div className="overflow-x-auto border rounded-lg">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-100 text-gray-600 font-semibold">
            <tr>
              <th className="p-3">Client</th>
              <th className="p-3">Status</th>
              <th className="p-3">Uploaded</th>
              <th className="p-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {history.length === 0 ? (
              <tr>
                <td colSpan="4" className="text-center p-6 text-gray-400">
                  No computation history found.
                </td>
              </tr>
            ) : (
              history.map((item) => (
                <tr key={item.id} className="border-b">
                  <td className="p-3">{item.clientId}</td>

                  <td className="p-3">
                    <span
                      className={`px-2 py-1 rounded text-xs font-bold ${
                        item.status === "APPROVED"
                          ? "bg-green-100 text-green-600"
                          : item.status === "REJECTED"
                          ? "bg-red-100 text-red-600"
                          : item.status === "REVISED"
                          ? "bg-yellow-100 text-yellow-600"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {item.status}
                    </span>
                  </td>

                  <td className="p-3">
                    {item.createdAt
                      ? format(item.createdAt.toDate(), "PPpp")
                      : "—"}
                  </td>

                  <td className="p-3">
                    <button
                      onClick={() => setSelected(item)}
                      className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal for Viewing Details */}
      {selected && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl p-6 rounded shadow-lg relative">
            <button
              onClick={() => setSelected(null)}
              className="absolute top-2 right-2 text-gray-500 hover:text-black"
            >
              ✕
            </button>

            <h2 className="text-xl font-bold mb-4">
              Computation Details — {selected.clientId}
            </h2>

            <pre className="bg-gray-100 p-4 rounded max-h-96 overflow-auto text-xs">
              {JSON.stringify(selected.data, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

export default ComputationHistory;
