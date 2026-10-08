import { useEffect, useState, type FormEvent } from "react";
import { api, getErrorMessage, getErrorStatus } from "../api/client";
import type { CourseCategory } from "../types";
import { useToast } from "../context/useToast";

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<CourseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [categoryName, setCategoryName] = useState("");
  const [categoryDescription, setCategoryDescription] = useState("");
  const { showToast } = useToast();

  useEffect(() => {
    async function fetchCategories() {
      try {
        const res = await api.get<CourseCategory[]>("/categories");
        setCategories(res.data);
      } catch (err) {
        if (getErrorStatus(err) === 403) {
          setError("Você não tem permissão para acessar esta página");
        } else if (getErrorStatus(err) === 401) {
          setError("Sua sessão expirou. Por favor, faça login novamente.");
        } else {
          setError(getErrorMessage(err, "Erro ao carregar categorias"));
        }
      } finally {
        setLoading(false);
      }
    }

    fetchCategories();
  }, []);

  const handleCreateCategory = async (e: FormEvent) => {
    e.preventDefault();
    if (!categoryName.trim()) {
      showToast("O nome da categoria é obrigatório", "error");
      return;
    }

    try {
      await api.post("/categories", {
        name: categoryName.trim(),
        description: categoryDescription.trim() || undefined,
      });
      showToast("Categoria criada com sucesso!", "success");
      setCategoryName("");
      setCategoryDescription("");
      setShowForm(false);
      const res = await api.get<CourseCategory[]>("/categories");
      setCategories(res.data);
    } catch (err) {
      showToast(getErrorMessage(err, "Erro ao criar categoria"), "error");
    }
  };

  if (loading) return <div className="loading">Carregando categorias...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="admin-page">
      <header className="page-header">
        <div>
          <h1>Gestão de Categorias</h1>
          <p className="muted">
            Organize os cursos em categorias para facilitar a navegação e a busca dos alunos.
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn-primary"
        >
          {showForm ? "Cancelar" : "+ Nova Categoria"}
        </button>
      </header>

      {showForm && (
        <div className="form-card" style={{ marginBottom: "30px" }}>
          <h3>Criar Nova Categoria</h3>
          <form onSubmit={handleCreateCategory} className="form">
            <div className="form-group">
              <label htmlFor="categoryName">Nome da Categoria *</label>
              <input
                id="categoryName"
                type="text"
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                required
                placeholder="Ex: Programação, Design, Marketing..."
              />
            </div>
            <div className="form-group">
              <label htmlFor="categoryDescription">Descrição (opcional)</label>
              <textarea
                id="categoryDescription"
                value={categoryDescription}
                onChange={(e) => setCategoryDescription(e.target.value)}
                placeholder="Descrição da categoria..."
                rows={3}
              />
            </div>
            <div className="form-actions">
              <button type="submit" className="btn-primary">
                Criar Categoria
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setCategoryName("");
                  setCategoryDescription("");
                }}
                className="btn-secondary"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Descrição</th>
              <th>Data de Criação</th>
            </tr>
          </thead>
          <tbody>
            {categories.length === 0 ? (
              <tr>
                <td colSpan={3} style={{ textAlign: "center" }}>
                  Nenhuma categoria cadastrada
                </td>
              </tr>
            ) : (
              categories.map((category) => (
                <tr key={category.id}>
                  <td>
                    <strong>{category.name}</strong>
                  </td>
                  <td>{category.description || "-"}</td>
                  <td>
                    {category.createdAt ? new Date(category.createdAt).toLocaleDateString("pt-BR") : "-"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

