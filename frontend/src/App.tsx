import { useMemo, type ReactElement, type ReactNode } from "react";
import { Link, NavLink, Navigate, Route, Routes, useLocation } from "react-router-dom";
import "./App.css";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import LoginPage from "./pages/Login";
import RegisterPage from "./pages/Register";
import CatalogPage from "./pages/Catalog";
import CoursePage from "./pages/Course";
import InstructorCoursesPage from "./pages/InstructorCourses";
import InstructorDashboardPage from "./pages/InstructorDashboard";
import CourseStudentsPage from "./pages/CourseStudents";
import CourseFormPage from "./pages/CourseForm";
import CourseContentPage from "./pages/CourseContent";
import AdminDashboardPage from "./pages/AdminDashboard";
import AdminUsersPage from "./pages/AdminUsers";
import AdminActivityLogsPage from "./pages/AdminActivityLogs";
import AdminCategoriesPage from "./pages/AdminCategories";
import ProfilePage from "./pages/Profile";
import FavoritesPage from "./pages/Favorites";
import NotificationsPage from "./pages/Notifications";
import AdvancedSearchPage from "./pages/AdvancedSearch";
import LearningPathsPage from "./pages/LearningPaths";
import LearningPathDetailPage from "./pages/LearningPathDetail";
import InstructorLearningPathsPage from "./pages/InstructorLearningPaths";
import LearningPathFormPage from "./pages/LearningPathForm";
import LearningPathCoursesPage from "./pages/LearningPathCourses";
import MessagesPage from "./pages/Messages";
import Notifications from "./components/Notifications";

function ProtectedRoute({ children }: { children: ReactElement }) {
  const { token, loading } = useAuth();
  const location = useLocation();
  
  if (loading) {
    return <div className="loading">Carregando...</div>;
  }
  
  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return children;
}

function AdminRoute({ children }: { children: ReactElement }) {
  const { token, user, loading } = useAuth();
  const location = useLocation();
  
  if (loading) {
    return <div className="loading">Carregando...</div>;
  }
  
  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  if (!user) {
    return <div className="loading">Carregando usuário...</div>;
  }
  
  if (user.role !== "ADMIN") {
    return <Navigate to="/catalog" replace />;
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

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `nav-link${isActive ? " nav-link-active" : ""}`;

  return (
    <div className="layout">
      <header className="navbar">
        <div className="brand">
          <Link to="/catalog">Educarize</Link>
        </div>
        <nav className="nav-links">
          {isLogged && (
            <>
              <NavLink to="/catalog" className={navLinkClass}>
                Catálogo
              </NavLink>
              <NavLink to="/learning-paths" className={navLinkClass}>
                Trilhas
              </NavLink>
              <NavLink to="/search" className={navLinkClass}>
                Busca
              </NavLink>
              <NavLink to="/favorites" className={navLinkClass}>
                Favoritos
              </NavLink>
              <NavLink to="/messages" className={navLinkClass}>
                Mensagens
              </NavLink>
            </>
          )}
          {isLogged && (user?.role === "INSTRUCTOR" || user?.role === "ADMIN") && (
            <>
              <NavLink to="/instructor/dashboard" className={navLinkClass}>
                Dashboard Instrutor
              </NavLink>
              <NavLink to="/instructor/courses" className={navLinkClass}>
                Meus Cursos
              </NavLink>
              <NavLink to="/instructor/learning-paths" className={navLinkClass}>
                Minhas Trilhas
              </NavLink>
            </>
          )}
          {isLogged && user?.role === "ADMIN" && (
            <>
              <NavLink to="/admin/dashboard" className={navLinkClass}>
                Admin
              </NavLink>
              <NavLink to="/admin/users" className={navLinkClass}>
                Usuários
              </NavLink>
              <NavLink to="/admin/categories" className={navLinkClass}>
                Categorias
              </NavLink>
              <NavLink to="/admin/activity-logs" className={navLinkClass}>
                Logs
              </NavLink>
            </>
          )}
          {isLogged && (
            <NavLink to="/profile" className={navLinkClass}>
              Perfil
            </NavLink>
          )}
        </nav>
        <div className="user-area">
          {isLogged ? (
            <div className="user-box">
              <Notifications />
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
      <ToastProvider>
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
            path="/instructor/dashboard"
            element={
              <ProtectedRoute>
                <InstructorDashboardPage />
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
          <Route
            path="/admin/dashboard"
            element={
              <AdminRoute>
                <AdminDashboardPage />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <AdminRoute>
                <AdminUsersPage />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/activity-logs"
            element={
              <AdminRoute>
                <AdminActivityLogsPage />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/categories"
            element={
              <AdminRoute>
                <AdminCategoriesPage />
              </AdminRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/favorites"
            element={
              <ProtectedRoute>
                <FavoritesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/notifications"
            element={
              <ProtectedRoute>
                <NotificationsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/search"
            element={
              <ProtectedRoute>
                <AdvancedSearchPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/learning-paths"
            element={
              <ProtectedRoute>
                <LearningPathsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/learning-paths/:id"
            element={
              <ProtectedRoute>
                <LearningPathDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/instructor/learning-paths"
            element={
              <ProtectedRoute>
                <InstructorLearningPathsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/instructor/learning-paths/new"
            element={
              <ProtectedRoute>
                <LearningPathFormPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/instructor/learning-paths/:id/edit"
            element={
              <ProtectedRoute>
                <LearningPathFormPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/instructor/learning-paths/:id/courses"
            element={
              <ProtectedRoute>
                <LearningPathCoursesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/messages"
            element={
              <ProtectedRoute>
                <MessagesPage />
              </ProtectedRoute>
            }
          />
            <Route path="*" element={<Navigate to="/catalog" replace />} />
          </Routes>
        </Layout>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
