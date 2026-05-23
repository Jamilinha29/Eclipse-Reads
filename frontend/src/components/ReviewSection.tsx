import { api } from "@/lib/api";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toastNeedLogin } from "@/lib/loginToast";
import { useState, useEffect, useCallback } from "react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  author_name: string;
}

export const ReviewSection = ({ bookId }: { bookId: string }) => {
  const navigate = useNavigate();
  const { userId, token } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [userRating, setUserRating] = useState(0);
  const [userComment, setUserComment] = useState("");

  const loadReviews = useCallback(async () => {
    try {
      const result = await api.getBookReviews(bookId);
      if (result?.reviews) setReviews(result.reviews);
    } catch {
      /* lista vazia em falha */
    }
  }, [bookId]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  const handleSubmit = async () => {
    if (!userId || !token) {
      toastNeedLogin("Faça login para avaliar", navigate);
      return;
    }

    if (userRating === 0) {
      toast.error("Selecione uma nota");
      return;
    }

    try {
      await api.upsertBookReview(
        bookId,
        { rating: userRating, comment: userComment || null },
        token
      );
      toast.success("Avaliação salva!");
      setUserRating(0);
      setUserComment("");
      loadReviews();
    } catch {
      toast.error("Erro ao salvar avaliação");
    }
  };

  return (
    <div className="space-y-6">
      <div className="border rounded-lg p-4">
        <h3 className="font-semibold mb-3">Deixe sua avaliação</h3>
        <div className="flex gap-2 mb-3">
          {[1, 2, 3, 4, 5].map((star) => (
            <button key={star} type="button" onClick={() => setUserRating(star)}>
              <Star
                className={`h-6 w-6 ${star <= userRating ? "fill-accent text-accent" : "text-muted-foreground"}`}
              />
            </button>
          ))}
        </div>
        <Textarea
          placeholder="Comentário (opcional)"
          value={userComment}
          onChange={(e) => setUserComment(e.target.value)}
          className="mb-3"
        />
        <Button onClick={handleSubmit}>Enviar avaliação</Button>
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold">Avaliações ({reviews.length})</h3>
        {reviews.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma avaliação ainda.</p>
        ) : (
          reviews.map((review) => (
            <div key={review.id} className="border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`h-4 w-4 ${star <= review.rating ? "fill-accent text-accent" : "text-muted-foreground"}`}
                    />
                  ))}
                </div>
                <span className="text-sm text-muted-foreground">{review.author_name}</span>
              </div>
              {review.comment && <p className="text-sm">{review.comment}</p>}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
