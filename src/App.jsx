import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ResumeProvider } from './context/ResumeContext'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Editor from './pages/Editor'
import NotFound from './pages/NotFound'
import './index.css'

function App() {
  return (
    <ResumeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/editor/:id" element={<Editor />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </ResumeProvider>
  )
}

export default App
