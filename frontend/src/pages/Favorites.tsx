import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, getErrorMessage } from "../api/client";
import type { Favorite } from "../types";
import { PageHeader } from "../components/PageHeader";
import { EmptyState } from "../components/EmptyState";
import { useToast } from "../context/useToast";

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    fetchFavorites();
  }, []);

  const fetchFavorites = async () => {
    try {
      setLoading(true);
      const res = await api.get<Favorite[]>("/favorites");
      setFavorites(res.data);
    } catch (err) {
      setError(getErrorMessage(err, "Erro ao carregar favoritos"));
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFavorite = async (courseId: string) => {
    if (!confirm("Deseja remover este curso dos favoritos?")) {
      return;
    }

    try {
      await api.delete(`/favorites/${courseId}`);
      setFavorites(favorites.filter((f) => f.courseId !== courseId));
    } catch (err) {
      showToast(getErrorMessage(err, "Erro ao remover favorito"), "error");
    }
  };

  if (loading) return <div className="loading">Carregando favoritos...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="favorites-page">
      <PageHeader
        title="Meus Favoritos"
        subtitle="Cursos que você salvou para assistir mais tarde."
      />

      {favorites.length === 0 ? (
        <EmptyState title="Você ainda não tem cursos favoritados.">
          <Link to="/catalog" className="btn-primary">
            Explorar Cursos
          </Link>
        </EmptyState>
      ) : (
        <div className="courses-grid">
          {favorites.map((favorite) => (
            <div key={favorite.id} className="course-card">
              {favorite.course.coverImageUrl && (
                <img
                  src={favorite.course.coverImageUrl}
                  alt={favorite.course.title}
                  className="course-cover"
                />
              )}
              <div className="course-content">
                <h3>{favorite.course.title}</h3>
                {favorite.course.description && (
                  <p className="course-description">{favorite.course.description}</p>
                )}
                <div className="course-meta">
                  {favorite.course.instructor && (
                    <span>Por {favorite.course.instructor.name}</span>
                  )}
                  {favorite.course.durationHours && (
                    <span>{favorite.course.durationHours}h</span>
                  )}
                </div>
                <div className="course-actions">
                  <Link to={`/course/${favorite.courseId}`} className="btn-primary">
                    Ver Curso
                  </Link>
                  <button
                    onClick={() => handleRemoveFavorite(favorite.courseId)}
                    className="btn-secondary"
                  >
                    Remover
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

