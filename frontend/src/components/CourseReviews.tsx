import { useEffect, useState, type FormEvent } from "react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import type { CourseReview } from "../types";
import StarRating from "./StarRating";
import { useToast } from "../context/ToastContext";

interface CourseReviewsProps {
  courseId: string;
}

export default function CourseReviews({ courseId }: CourseReviewsProps) {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<CourseReview[]>([]);
  const [averageRating, setAverageRating] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [myReview, setMyReview] = useState<CourseReview | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    fetchReviews();
  }, [courseId]);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/reviews/course/${courseId}`);
      setReviews(res.data.reviews || []);
      setAverageRating(res.data.averageRating || 0);
      
      if (user) {
        const myReviewsRes = await api.get("/reviews/my").catch(() => ({ data: [] }));
        const review = myReviewsRes.data.find((r: CourseReview) => r.courseId === courseId);
        setMyReview(review || null);
      }
    } catch (err: any) {
      console.error("Erro ao carregar avaliações:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReview = async (e: FormEvent) => {
    e.preventDefault();
    if (!rating) {
      showToast("Por favor, selecione uma avaliação", "error");
      return;
    }

    try {
      if (myReview) {
        await api.put(`/reviews/${myReview.id}`, { rating, comment });
      } else {
        await api.post("/reviews", { courseId, rating, comment });
      }
      setShowForm(false);
      setRating(0);
      setComment("");
      fetchReviews();
    } catch (err: any) {
      showToast(err.response?.data?.error || "Erro ao salvar avaliação", "error");
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!confirm("Deseja deletar sua avaliação?")) return;

    try {
      await api.delete(`/reviews/${reviewId}`);
      setMyReview(null);
      fetchReviews();
    } catch (err: any) {
      showToast(err.response?.data?.error || "Erro ao deletar avaliação", "error");
    }
  };

  if (loading) return <div className="loading">Carregando avaliações...</div>;

  return (
    <div className="course-reviews">
      <div className="reviews-header">
        <div>
          <h3>Avaliações</h3>
          {averageRating > 0 && (
            <div className="average-rating">
              <StarRating rating={averageRating} readonly size="large" />
              <span className="rating-text">{averageRating.toFixed(1)} ({reviews.length} {reviews.length === 1 ? "avaliação" : "avaliações"})</span>
            </div>
          )}
        </div>
        {user && !myReview && (
          <button onClick={() => setShowForm(!showForm)} className="btn-primary">
            {showForm ? "Cancelar" : "Avaliar Curso"}
          </button>
        )}
      </div>

      {showForm && !myReview && (
        <form onSubmit={handleSubmitReview} className="review-form">
          <div className="form-group">
            <label>Avaliação</label>
            <StarRating rating={rating} onRatingChange={setRating} />
          </div>
          <div className="form-group">
            <label>Comentário (opcional)</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              placeholder="Compartilhe sua experiência com este curso..."
            />
          </div>
          <button type="submit" className="btn-primary" disabled={!rating}>
            Enviar Avaliação
          </button>
        </form>
      )}

      {myReview && !showForm && (
        <div className="my-review">
          <div className="review-header">
            <div>
              <strong>Sua Avaliação</strong>
              <StarRating rating={myReview.rating} readonly />
            </div>
            <div>
              <button onClick={() => setShowForm(true)} className="btn-secondary-small">
                Editar
              </button>
              <button onClick={() => handleDeleteReview(myReview.id)} className="btn-danger-small">
                Deletar
              </button>
            </div>
          </div>
          {myReview.comment && <p>{myReview.comment}</p>}
        </div>
      )}

      {showForm && myReview && (
        <form onSubmit={handleSubmitReview} className="review-form">
          <div className="form-group">
            <label>Avaliação</label>
            <StarRating rating={rating || myReview.rating} onRatingChange={setRating} />
          </div>
          <div className="form-group">
            <label>Comentário (opcional)</label>
            <textarea
              value={comment || myReview.comment || ""}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              placeholder="Compartilhe sua experiência com este curso..."
            />
          </div>
          <div className="form-actions">
            <button type="submit" className="btn-primary" disabled={!rating}>
              Atualizar Avaliação
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">
              Cancelar
            </button>
          </div>
        </form>
      )}

      <div className="reviews-list">
        {reviews.length === 0 ? (
          <p className="muted">Nenhuma avaliação ainda. Seja o primeiro a avaliar!</p>
        ) : (
          reviews.map((review) => (
            <div key={review.id} className="review-item">
              <div className="review-user">
                {review.user.avatarUrl ? (
                  <img src={review.user.avatarUrl} alt={review.user.name} className="avatar-small" />
                ) : (
                  <div className="avatar-small">{review.user.name.substring(0, 1).toUpperCase()}</div>
                )}
                <div>
                  <strong>{review.user.name}</strong>
                  <small>{new Date(review.createdAt).toLocaleDateString("pt-BR")}</small>
                </div>
              </div>
              <StarRating rating={review.rating} readonly />
              {review.comment && <p className="review-comment">{review.comment}</p>}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

