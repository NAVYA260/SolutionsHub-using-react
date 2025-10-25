import React from 'react';
import '../Styles/Styles1.css';
import { Link } from 'react-router-dom';
function App() {
  return (
    <div className="container">
      <div className="row">
        <div className="col-md-12">
          <h1>Solutions Hub.</h1>
          <p>This is a place where you can ask questions, find answers, and learn from a community of students.</p>
          <div className="create-account">
            <Link to="Register" className="btn-continue">Continue</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
