import { useState, useEffect, useCallback } from "react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toastNeedLogin } from "@/lib/loginToast";
import { BOOKS_API_BASE_URL as booksApiBase } from "@/lib/apiBases";
// (não usamos o api.ts aqui porque ele ainda não expõe reviews)

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  user_id: string;
}

export const ReviewSection = ({ bookId }: { bookId: string }) => {
  const navigate = useNavigate();
  const { userId, token } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [userRating, setUserRating] = useState(0);
  const [userComment, setUserComment] = useState("");

  const loadReviews = useCallback(async () => {
    const response = await fetch(`${booksApiBase}/books/${bookId}/reviews`);
    const result = await response.json();
    if (result?.reviews) setReviews(result.reviews);
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
      const response = await fetch(`${booksApiBase}/books/${bookId}/reviews`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ rating: userRating, comment: userComment || null }),
      });
      if (!response.ok) throw new Error("Erro ao salvar avaliação");
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
            <button key={star} onClick={() => setUserRating(star)}>
              <Star
                className={`h-6 w-6 ${star <= userRating ? "fill-accent text-accent" : "text-muted-foreground"}`}
              />
            </button>
          ))}
        </div>
        <Textarea
          placeholder="Escreva um comentário (opcional)"
          value={userComment}
          onChange={(e) => setUserComment(e.target.value)}
          className="mb-3"
        />
        <Button onClick={handleSubmit}>Enviar Avaliação</Button>
      </div>

      <div className="space-y-4">
        {reviews.map((review) => (
          <div key={review.id} className="border rounded-lg p-4">
            <div className="flex gap-1 mb-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`h-4 w-4 ${star <= review.rating ? "fill-accent text-accent" : "text-muted-foreground"}`}
                />
              ))}
            </div>
            {review.comment && <p className="text-sm">{review.comment}</p>}
          </div>
        ))}
      </div>
    </div>
  );
};
