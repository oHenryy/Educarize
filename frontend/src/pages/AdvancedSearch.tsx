import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { api, getErrorMessage } from "../api/client";
import { useAuth } from "../context/useAuth";
import type { CourseCategory, QueryParams, SearchCourse, SearchSuggestions, Tag } from "../types";
import StarRating from "../components/StarRating";

export default function AdvancedSearchPage() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<SearchCourse[]>([]);
  const [categories, setCategories] = useState<CourseCategory[]>([]);
  const [popularTags, setPopularTags] = useState<Tag[]>([]);
  const [suggestions, setSuggestions] = useState<SearchSuggestions>({ courses: [], tags: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [filters, setFilters] = useState({
    query: "",
    categoryId: "",
    difficulty: "",
    status: "PUBLISHED",
    tags: [] as string[],
    minRating: "",
    instructorId: "",
  });

  useEffect(() => {
    fetchCategories();
    fetchPopularTags();
  }, []);

  const fetchSuggestions = useCallback(async () => {
    try {
      const res = await api.get("/search/suggestions", { params: { query: filters.query } });
      setSuggestions(res.data);
    } catch (err) {
      console.error("Erro ao buscar sugestões:", err);
    }
  }, [filters.query]);

  useEffect(() => {
    if (filters.query.length >= 2) {
      fetchSuggestions();
    } else {
      setSuggestions({ courses: [], tags: [] });
    }
  }, [filters.query, fetchSuggestions]);

  const fetchCategories = async () => {
    try {
      const res = await api.get<CourseCategory[]>("/categories");
      setCategories(res.data);
    } catch (err) {
      console.error("Erro ao carregar categorias:", err);
    }
  };

  const fetchPopularTags = async () => {
    try {
      const res = await api.get<Tag[]>("/search/tags/popular?limit=20");
      setPopularTags(res.data);
    } catch (err) {
      console.error("Erro ao carregar tags populares:", err);
    }
  };

  const handleSearch = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);
      const params: QueryParams = {
        page,
        limit: 20,
      };

      if (filters.query) params.query = filters.query;
      if (filters.categoryId) params.categoryId = filters.categoryId;
      if (filters.difficulty) params.difficulty = filters.difficulty;
      if (filters.status) params.status = filters.status;
      if (filters.tags.length > 0) params.tags = filters.tags;
      if (filters.minRating) params.minRating = filters.minRating;
      if (filters.instructorId) params.instructorId = filters.instructorId;

      const res = await api.get<{ courses: SearchCourse[]; pagination?: { totalPages: number } }>("/search/advanced", { params });
      setCourses(res.data.courses || []);
      setTotalPages(res.data.pagination?.totalPages || 1);
    } catch (err) {
      setError(getErrorMessage(err, "Erro ao realizar busca"));
    } finally {
      setLoading(false);
    }
  };

  const handleTagToggle = (tagName: string) => {
    setFilters((prev) => ({
      ...prev,
      tags: prev.tags.includes(tagName)
        ? prev.tags.filter((t) => t !== tagName)
        : [...prev.tags, tagName],
    }));
  };

  const clearFilters = () => {
    setFilters({
      query: "",
      categoryId: "",
      difficulty: "",
      status: "PUBLISHED",
      tags: [],
      minRating: "",
      instructorId: "",
    });
    setCourses([]);
    setPage(1);
  };

  return (
    <div className="advanced-search-page">
      <h1>Busca Avançada</h1>

      <form onSubmit={handleSearch} className="search-form">
        <div className="search-main">
          <input
            type="text"
            placeholder="Buscar cursos, aulas, conteúdo..."
            value={filters.query}
            onChange={(e) => setFilters({ ...filters, query: e.target.value })}
            className="search-input-large"
          />
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "Buscando..." : "Buscar"}
          </button>
        </div>

        {suggestions.courses.length > 0 || suggestions.tags.length > 0 ? (
          <div className="search-suggestions">
            {suggestions.courses.length > 0 && (
              <div className="suggestions-section">
                <strong>Cursos:</strong>
                {suggestions.courses.map((course) => (
                  <button
                    key={course.id}
                    type="button"
                    className="suggestion-item"
                    onClick={() => {
                      setFilters({ ...filters, query: course.title });
                      setSuggestions({ courses: [], tags: [] });
                    }}
                  >
                    {course.title}
                  </button>
                ))}
              </div>
            )}
            {suggestions.tags.length > 0 && (
              <div className="suggestions-section">
                <strong>Tags:</strong>
                {suggestions.tags.map((tag) => (
                  <button
                    key={tag.id}
                    type="button"
                    className="suggestion-item"
                    onClick={() => {
                      handleTagToggle(tag.name);
                      setSuggestions({ courses: [], tags: [] });
                    }}
                  >
                    #{tag.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : null}

        <div className="search-filters">
          <div className="filter-group">
            <label>Categoria</label>
            <select
              value={filters.categoryId}
              onChange={(e) => setFilters({ ...filters, categoryId: e.target.value })}
            >
              <option value="">Todas as categorias</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Dificuldade</label>
            <select
              value={filters.difficulty}
              onChange={(e) => setFilters({ ...filters, difficulty: e.target.value })}
            >
              <option value="">Todas</option>
              <option value="BEGINNER">Iniciante</option>
              <option value="INTERMEDIATE">Intermediário</option>
              <option value="ADVANCED">Avançado</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Avaliação Mínima</label>
            <select
              value={filters.minRating}
              onChange={(e) => setFilters({ ...filters, minRating: e.target.value })}
            >
              <option value="">Qualquer</option>
              <option value="4">4+ estrelas</option>
              <option value="3">3+ estrelas</option>
              <option value="2">2+ estrelas</option>
              <option value="1">1+ estrelas</option>
            </select>
          </div>

          {user?.role === "ADMIN" && (
            <div className="filter-group">
              <label>Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              >
                <option value="PUBLISHED">Publicado</option>
                <option value="DRAFT">Rascunho</option>
                <option value="ARCHIVED">Arquivado</option>
                <option value="SUSPENDED">Suspenso</option>
              </select>
            </div>
          )}

          <button type="button" onClick={clearFilters} className="btn-secondary">
            Limpar Filtros
          </button>
        </div>

        {popularTags.length > 0 && (
          <div className="tags-filter">
            <label>Tags Populares</label>
            <div className="tags-list-filter">
              {popularTags.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  className={`tag-filter-btn ${filters.tags.includes(tag.name) ? "active" : ""}`}
                  onClick={() => handleTagToggle(tag.name)}
                >
                  {tag.name} {tag._count?.courses ? `(${tag._count.courses})` : ""}
                </button>
              ))}
            </div>
            {filters.tags.length > 0 && (
              <div className="selected-tags">
                <strong>Tags selecionadas:</strong>
                {filters.tags.map((tag) => (
                  <span key={tag} className="selected-tag">
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleTagToggle(tag)}
                      className="tag-remove-btn"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </form>

      {error && <div className="error">{error}</div>}

      {courses.length > 0 && (
        <>
          <div className="search-results-header">
            <h2>Resultados da Busca ({courses.length})</h2>
          </div>

          <div className="course-grid">
            {courses.map((course) => (
              <div key={course.id} className="course-card">
                <Link to={`/course/${course.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                  {course.coverImageUrl ? (
                    <img src={course.coverImageUrl} alt={course.title} />
                  ) : (
                    <div className="placeholder-img">Sem capa</div>
                  )}
                  <div className="course-body">
                    <h3>{course.title}</h3>
                    <p className="muted">{course.description}</p>
                    <div className="course-meta">
                      <span>{course.difficulty ?? "BEGINNER"}</span>
                      <span>{course.durationHours ?? 0}h</span>
                      {course.category && <span>{course.category.name}</span>}
                    </div>
                    {course.averageRating > 0 && (
                      <div className="course-rating">
                        <StarRating rating={course.averageRating} readonly size="small" />
                        <span className="rating-text-small">
                          {course.averageRating.toFixed(1)} ({course.totalReviews} {course.totalReviews === 1 ? "avaliação" : "avaliações"})
                        </span>
                      </div>
                    )}
                    <small className="muted">
                      Instrutor: {course.instructor?.name ?? "N/D"}
                    </small>
                    {course.tags && course.tags.length > 0 && (
                      <div className="course-tags-preview">
                        {course.tags.slice(0, 3).map((ct) => (
                          <span key={ct.id} className="tag-badge-small">
                            {ct.tag.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </Link>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <button
                disabled={page === 1}
                onClick={() => {
                  setPage(page - 1);
                  handleSearch();
                }}
                className="btn-secondary"
              >
                Anterior
              </button>
              <span>Página {page} de {totalPages}</span>
              <button
                disabled={page === totalPages}
                onClick={() => {
                  setPage(page + 1);
                  handleSearch();
                }}
                className="btn-secondary"
              >
                Próxima
              </button>
            </div>
          )}
        </>
      )}

      {courses.length === 0 && !loading && filters.query && (
        <div className="empty-state">
          <p>Nenhum curso encontrado com os filtros selecionados.</p>
        </div>
      )}
    </div>
  );
}

