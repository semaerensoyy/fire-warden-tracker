import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const Register = () => {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    password: ""
  });
  const [generatedValues, setGeneratedValues] = useState({
    staffNumber: "",
    username: ""
  });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleGenerateStaffNumber = async () => {
    if (!formData.firstName || !formData.lastName) {
      setError("Please enter first and last name first.");
      return;
    }
    setError(null);   
    setLoading(true);
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/generate-staff-number`);
      const staffNumber = response.data.staffNumber;
      setGeneratedValues({
        staffNumber,
        username: `${formData.lastName}_${formData.firstName.charAt(0)}_${staffNumber}`
      });
    } catch (err) {
      console.error("Error generating staff number:", err);
      setError("Failed to generate staff number.");
    }
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!generatedValues.staffNumber) {
      setError("Please generate a staff number first.");
      return;
    }
    setError(null);
    try {
      const registrationData = {
        ...formData,
        staffNumber: generatedValues.staffNumber,
        username: generatedValues.username
      };
      await axios.post(`${process.env.REACT_APP_API_URL}/register`, registrationData);
      alert("Registration successful!");
      navigate("/login");
    } catch (err) {
      console.error("Registration error:", err);
      setError(err.response?.data?.error || "Registration failed.");
    }
  };

  return (
    <div className="container mt-4">
      <h2 className="text-center">Register</h2>
      {error && <div className="alert alert-danger">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label>First Name:</label>
          <input type="text" name="firstName" className="form-control" value={formData.firstName} onChange={handleChange} required />
        </div>
        <div className="mb-3">
          <label>Last Name:</label>
          <input type="text" name="lastName" className="form-control" value={formData.lastName} onChange={handleChange} required />
        </div>
        <div className="mb-3">
          <label>Password:</label>
          <input type="password" name="password" className="form-control" value={formData.password} onChange={handleChange} required />
        </div>
        <div className="mb-3 d-flex align-items-center">
          <button type="button" className="btn btn-secondary me-2" onClick={handleGenerateStaffNumber} disabled={loading}>
            {loading ? "Generating..." : "Generate Staff Number"}
          </button>
          <input type="text" className="form-control me-2" placeholder="Staff Number" value={generatedValues.staffNumber} readOnly />
          <input type="text" className="form-control" placeholder="Username" value={generatedValues.username} readOnly />
        </div>
        <button type="submit" className="btn btn-primary">Register</button>
      </form>
    </div>
  );
};

export default Register;
