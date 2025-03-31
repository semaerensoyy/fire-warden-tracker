import React, { useState, useEffect } from "react";
import axios from "axios";

const locationOptions = [
  "Alwyn Hall", "Beech Glade", "Bowers Building", "Burma Road Student Village",
  "Centre for Sport", "Chapel", "The Cottage", "Fred Wheeler Building",
  "Herbert Jarman Building", "Holm Lodge", "Kenneth Kettle Building",
  "King Alfred Centre", "Martial Rose Library", "Masters Lodge",
  "Medecroft", "Medecroft Annexe", "Paul Chamberlain Building",
  "Queen’s Road Student Village", "St Alphege", "St Edburga",
  "St Elizabeth’s Hall", "St Grimbald’s Court", "St James’ Hall",
  "St Swithun’s Lodge", "The Stripe", "Business School",
  "Tom Atkinson Building", "West Downs Centre", "West Downs Student Village",
  "Winton Building", "Students’ Union"
];

const Dashboard = () => {
  const [logs, setLogs] = useState([]);
  const [editingLog, setEditingLog] = useState(null);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const fetchLogs = async () => {
    try {
      const response = await axios.get("https://firewardentracker-apggb8hzfkfsbjf3.uksouth-01.azurewebsites.net/logs");
      setLogs(response.data);
    } catch (err) {
      console.error("Error fetching logs:", err);
      setError("Failed to fetch logs.");
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const deleteLog = async (id) => {
    try {
      await axios.delete("https://firewardentracker-apggb8hzfkfsbjf3.uksouth-01.azurewebsites.net/logs/" + id);
      setLogs(logs.filter((log) => log.id !== id));
      setSuccessMessage("Log deleted successfully!");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error("Error deleting log:", err);
      setError("Failed to delete log.");
    }
  };

  const startEdit = (log) => {
    setEditingLog({ ...log });
  };

  const cancelEdit = () => {
    setEditingLog(null);
  };

  const updateLog = async () => {
    try {
      const { staff_number, first_name, last_name, location } = editingLog;
      const logId = editingLog.id;
      await axios.put("https://firewardentracker-apggb8hzfkfsbjf3.uksouth-01.azurewebsites.net/logs/" + logId, {
        staff_number,
        first_name,
        last_name,
        location,
      });
      setSuccessMessage("Log updated successfully!");
      setTimeout(() => setSuccessMessage(null), 3000);
      setEditingLog(null);
      fetchLogs();
    } catch (err) {
      console.error("Error updating log:", err);
      setError("Failed to update log.");
    }
  };

  return (
    <div className="container mt-4">
      <h2 className="text-center">Dashboard</h2>
      {error && <div className="alert alert-danger">{error}</div>}
      {successMessage && <div className="alert alert-success">{successMessage}</div>}
      {logs.length === 0 ? (
        <p className="text-center">No logs available.</p>
      ) : (
        <table className="table table-striped">
          <thead>
            <tr>
              <th>Staff Number</th>
              <th>First Name</th>
              <th>Last Name</th>
              <th>Location</th>
              <th>Date & Time</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id}>
                <td>{log.staff_number}</td>
                <td>{log.first_name}</td>
                <td>{log.last_name}</td>
                <td>{log.location}</td>
                <td>{new Date(log.timestamp).toLocaleString()}</td>
                <td>
                  <button
                    className="btn btn-sm btn-warning me-2"
                    onClick={() => startEdit(log)}
                  >
                    Edit
                  </button>
                  <button
                    className="btn btn-sm btn-danger"
                    onClick={() => deleteLog(log.id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {editingLog && (
        <div className="card mt-4 p-3">
          <h4>Edit Log</h4>
          <div className="mb-3">
            <label>Staff Number:</label>
            <input type="text" className="form-control" value={editingLog.staff_number} readOnly />
          </div>
          <div className="mb-3">
            <label>First Name:</label>
            <input type="text" className="form-control" value={editingLog.first_name} readOnly />
          </div>
          <div className="mb-3">
            <label>Last Name:</label>
            <input type="text" className="form-control" value={editingLog.last_name} readOnly />
          </div>
          <div className="mb-3">
            <label>Location:</label>
            <select
              className="form-select"
              value={editingLog.location}
              onChange={(e) =>
                setEditingLog({ ...editingLog, location: e.target.value })
              }
            >
              <option value="">-- Select a location --</option>
              {locationOptions.map((loc, idx) => (
                <option key={idx} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </div>
          <button className="btn btn-success btn-short me-2" onClick={updateLog}>
            Update
          </button>
          <button className="btn btn-secondary btn-short" onClick={cancelEdit}>
            Cancel
          </button>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
