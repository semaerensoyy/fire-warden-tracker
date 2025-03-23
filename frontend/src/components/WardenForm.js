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

const WardenForm = () => {
  const [warden, setWarden] = useState({
    staffNumber: "",
    firstName: "",
    lastName: "",
    location: ""
  });
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  useEffect(() => {
    const userString = localStorage.getItem("user");
    if (userString) {
      const userObj = JSON.parse(userString);
      setWarden({
        staffNumber: userObj.staffNumber,
        firstName: userObj.firstName,
        lastName: userObj.lastName,
        location: ""
      });
    }
  }, []);

  const handleChange = (e) => {
    setWarden({ ...warden, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!warden.location) {
      setError("Please select a location.");
      return;
    }
    setError(null);
    try {
      const token = localStorage.getItem("token");
      await axios.post("http://localhost:5001/logs", warden, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuccessMessage("Warden location logged successfully!");
      setWarden({ ...warden, location: "" });
    } catch (err) {
      console.error("Error logging location:", err);
      setError(err.response?.data?.error || "Failed to log location.");
    }
  };

  return (
    <div className="container mt-4">
      <h2 className="text-center">Log Location</h2>
      {error && <div className="alert alert-danger">{error}</div>}
      {successMessage && <div className="alert alert-success">{successMessage}</div>}
      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label>Staff Number:</label>
          <input type="text" name="staffNumber" className="form-control" value={warden.staffNumber} readOnly />
        </div>
        <div className="mb-3">
          <label>First Name:</label>
          <input type="text" name="firstName" className="form-control" value={warden.firstName} readOnly />
        </div>
        <div className="mb-3">
          <label>Last Name:</label>
          <input type="text" name="lastName" className="form-control" value={warden.lastName} readOnly />
        </div>
        <div className="mb-3">
          <label>Location:</label>
          <select name="location" className="form-select" value={warden.location} onChange={handleChange} required>
            <option value="">-- Select a location --</option>
            {locationOptions.map((loc, idx) => (
              <option key={idx} value={loc}>{loc}</option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn btn-primary">Log Location</button>
      </form>
    </div>
  );
};

export default WardenForm;
