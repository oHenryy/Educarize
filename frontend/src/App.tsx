import { useMemo, type ReactElement, type ReactNode } from "react";
import { Link, Navigate, Route, Routes, useLocation } from "react-router-dom";
import "./App.css";
import { AuthProvider, useAuth } from "./context/AuthContext";
import LoginPage from "./pages/Login";
import RegisterPage from "./pages/Register";
import CatalogPage from "./pages/Catalog";
import CoursePage from "./pages/Course";
import InstructorCoursesPage from "./pages/InstructorCourses";
import CourseStudentsPage from "./pages/CourseStudents";
import CourseFormPage from "./pages/CourseForm";
import CourseContentPage from "./pages/CourseContent";

function ProtectedRoute({ children }: { children: ReactElement }) {
  const { token, loading } = useAuth();
  const location = useLocation();
  
  // Aguardar o carregamento inicial antes de verificar autenticação
  if (loading) {
    return <div className="loading">Carregando...</div>;
  }
  
  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return children;
}

function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const isLogged = !!user;
  const initials = useMemo(
    () => (user?.name ? user.name.substring(0, 1).toUpperCase() : ""),
    [user]
  );

  return (
    <div className="layout">
      <header className="navbar">
        <div className="brand">
          <Link to="/catalog">Educarize</Link>
        </div>
        <nav className="nav-links">
          {isLogged && <Link to="/catalog">Catálogo</Link>}
          {isLogged && (user?.role === "INSTRUCTOR" || user?.role === "ADMIN") && (
            <Link to="/instructor/courses">Meus Cursos</Link>
          )}
        </nav>
        <div className="user-area">
          {isLogged ? (
            <div className="user-box">
              <span className="avatar">{initials}</span>
              <div className="user-info">
                <strong>{user?.name}</strong>
                <small>{user?.role}</small>
      </div>
              <button className="ghost" onClick={logout}>
                Sair
        </button>
            </div>
          ) : (
            <div className="auth-links">
              <Link to="/login">Entrar</Link>
              <Link to="/register" className="primary">
                Criar conta
              </Link>
            </div>
          )}
        </div>
      </header>
      <main className="main">{children}</main>
      </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Layout>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/catalog"
            element={
              <ProtectedRoute>
                <CatalogPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/course/:id"
            element={
              <ProtectedRoute>
                <CoursePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/instructor/courses"
            element={
              <ProtectedRoute>
                <InstructorCoursesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/instructor/courses/new"
            element={
              <ProtectedRoute>
                <CourseFormPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/instructor/courses/:id/edit"
            element={
              <ProtectedRoute>
                <CourseFormPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/instructor/courses/:id/content"
            element={
              <ProtectedRoute>
                <CourseContentPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/instructor/courses/:id/students"
            element={
              <ProtectedRoute>
                <CourseStudentsPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/catalog" replace />} />
        </Routes>
      </Layout>
    </AuthProvider>
  );
}

export default App;
