import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import "../Styles/Styles6.css";
import { Link } from "react-router-dom";

const Solutions = () => {
  const { topicName } = useParams();
  const [solutions, setSolutions] = useState([]);
  const [pdfFile, setPdfFile] = useState(null);
  const [message, setMessage] = useState("");
  const [username, setUsername] = useState("");

  useEffect(() => {
    fetch(`http://localhost:5000/topics/${topicName}/solutions`)
      .then((response) => response.json())
      .then((data) => setSolutions(data))
      .catch((error) => console.error("Error fetching solutions:", error));

    fetch("http://localhost:5000/auth/username", {
      method: "GET",
      credentials: "include",
    })
      .then((response) => response.json())
      .then((data) => setUsername(data.username))
      .catch((error) => console.error("Error fetching username:", error));
  }, [topicName]);

  const handleFileChange = (event) => {
    setPdfFile(event.target.files[0]);
  };

  const handleUpload = (event) => {
    event.preventDefault();

    if (!pdfFile) {
      setMessage("Please select a PDF file.");
      return;
    }

    const formData = new FormData();
    formData.append("pdf", pdfFile);
    formData.append("username", username);

    fetch(`http://localhost:5000/topics/${topicName}/solutions`, {
      method: "POST",
      body: formData,
      credentials: "include",
    })
      .then((response) => response.text())
      .then((data) => {
        setMessage(data);
        setPdfFile(null);

        fetch(`http://localhost:5000/topics/${topicName}/solutions`)
          .then((response) => response.json())
          .then((updatedData) => setSolutions(updatedData))
          .catch((error) => console.error("Error fetching updated solutions:", error));
      })
      .catch((error) => {
        console.error("Error uploading solution:", error);
        setMessage("Error uploading solution. Please try again.");
      });
  };

  const handleDelete = (solutionId) => {
    fetch(`http://localhost:5000/topics/${topicName}/solutions/${solutionId}`, {
      method: "DELETE",
      credentials: "include",
    })
      .then((response) => {
        if (response.ok) {
          setMessage("Solution deleted successfully.");
          setSolutions((prevSolutions) =>
            prevSolutions.filter((solution) => solution.id !== solutionId)
          );
        } else {
          return response.text().then((text) => Promise.reject(text));
        }
      })
      .catch((error) => {
        console.error("Error deleting solution:", error);
        setMessage(`Error deleting solution: ${error}`);
      });
  };

  return (
    <div>
      <div className="navbar">
        <div className="navbar-brand">SolutionsHub</div>
        <div className="navbar-options">
          <Link to="/Subjects">Subjects</Link>
          <Link to="/Login">Log out</Link>
        </div>
      </div>

      <div className="topic-heading">Solutions for {topicName}</div>
      <div className="answers-container">
        {solutions.map((solution) => (
          <div key={solution.id} className="solution-card">
            <p>By: {solution.username}</p>
            <a
              href={`http://localhost:5000/uploads/${solution.pdf_path}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              📄 View PDF
            </a>
            <button
              onClick={() => handleDelete(solution.id)}
              className="delete-button"
            >
              Delete
            </button>
          </div>
        ))}
      </div>

      <div className="question-form">
        <div className="question-card">
          <h2>Upload a PDF solution</h2>
          <form onSubmit={handleUpload}>
            <input type="file" accept="application/pdf" onChange={handleFileChange} required />
            <input type="submit" value="Upload" />
          </form>
          {message && <p>{message}</p>}
        </div>
      </div>
    </div>
  );
};

export default Solutions;
