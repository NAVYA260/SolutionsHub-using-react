import React from "react";
import Index from './Pages/Index';
import Register from './Pages/Register';
import Login from './Pages/Login';
import Subjects from './Pages/Subjects';
import Topics from './Pages/Topics';
import Solutions from './Pages/Solutions';
import ForgotPassword from './Pages/ForgotPassword';
import ResetPassword from './Pages/ResetPassword';

import { RouterProvider, createBrowserRouter } from "react-router-dom";

const router = createBrowserRouter([
    { path: '/', element: <Index /> },
    { path: '/Register', element: <Register /> },
    { path: '/Login', element: <Login /> },
    { path: '/Subjects', element: <Subjects /> },
    { path: '/Subjects/:subjectName/Topics', element: <Topics /> },
    { path: '/Topics/:topicName/Solutions', element: <Solutions /> },
    { path: '/ForgotPassword', element: <ForgotPassword /> },
    { path: '/reset-password/:token', element: <ResetPassword /> }
]);

function App() {
    return <RouterProvider router={router} />;
}

export default App;
