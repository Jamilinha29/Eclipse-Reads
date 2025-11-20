import { useState, useEffect } from "react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  user_id: string;
}

export const ReviewSection = ({ bookId }: { bookId: string }) => {
  const { userId } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [userRating, setUserRating] = useState(0);
  const [userComment, setUserComment] = useState("");

  useEffect(() => {
    loadReviews();
  }, [bookId]);

  const loadReviews = async () => {
    const { data } = await supabase
      .from("reviews")
      .select("*")
      .eq("book_id", bookId)
      .order("created_at", { ascending: false });
    
    if (data) setReviews(data);
  };

  const handleSubmit = async () => {
    if (!userId) {
      toast.error("Faça login para avaliar");
      return;
    }

    if (userRating === 0) {
      toast.error("Selecione uma nota");
      return;
    }

    const { error } = await supabase
      .from("reviews")
      .upsert({
        user_id: userId,
        book_id: bookId,
        rating: userRating,
        comment: userComment || null,
      });

    if (error) {
      toast.error("Erro ao salvar avaliação");
    } else {
      toast.success("Avaliação salva!");
      setUserRating(0);
      setUserComment("");
      loadReviews();
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
