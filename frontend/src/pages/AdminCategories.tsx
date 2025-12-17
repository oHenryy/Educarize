import { useEffect, useState, type FormEvent } from "react";
import { api } from "../api/client";
import type { CourseCategory } from "../types";

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<CourseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [categoryName, setCategoryName] = useState("");
  const [categoryDescription, setCategoryDescription] = useState("");

  useEffect(() => {
    async function fetchCategories() {
      try {
        const res = await api.get<CourseCategory[]>("/categories");
        setCategories(res.data);
      } catch (err: any) {
        if (err.response?.status === 403) {
          setError("Você não tem permissão para acessar esta página");
        } else if (err.response?.status === 401) {
          setError("Sua sessão expirou. Por favor, faça login novamente.");
        } else {
          setError(err.response?.data?.error || "Erro ao carregar categorias");
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
      alert("O nome da categoria é obrigatório");
      return;
    }

    try {
      await api.post("/categories", {
        name: categoryName.trim(),
        description: categoryDescription.trim() || undefined,
      });
      alert("Categoria criada com sucesso!");
      setCategoryName("");
      setCategoryDescription("");
      setShowForm(false);
      const res = await api.get<CourseCategory[]>("/categories");
      setCategories(res.data);
    } catch (err: any) {
      alert(err.response?.data?.error || "Erro ao criar categoria");
    }
  };

  if (loading) return <div className="loading">Carregando categorias...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="admin-page">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h1>Gestão de Categorias</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn-primary"
        >
          {showForm ? "Cancelar" : "+ Nova Categoria"}
        </button>
      </div>

      {showForm && (
        <div className="form-card" style={{ marginBottom: "30px" }}>
          <h3>Criar Nova Categoria</h3>
          <form onSubmit={handleCreateCategory} className="form">
            <label>
              Nome da Categoria *
              <input
                type="text"
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                required
                placeholder="Ex: Programação, Design, Marketing..."
              />
            </label>
            <label>
              Descrição (opcional)
              <textarea
                value={categoryDescription}
                onChange={(e) => setCategoryDescription(e.target.value)}
                placeholder="Descrição da categoria..."
                rows={3}
              />
            </label>
            <div style={{ display: "flex", gap: "10px" }}>
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
                    {new Date(category.createdAt).toLocaleDateString("pt-BR")}
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

