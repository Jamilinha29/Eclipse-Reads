import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, FileText, Clock, CheckCircle, XCircle, Trash2, Eye } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface BookSubmission {
  id: string;
  title: string;
  author: string;
  description: string;
  category: string;
  file_path: string;
  file_type: string;
  status: string;
  rejection_reason: string | null;
  created_at: string;
  reviewed_at: string | null;
}

const MySubmissions = () => {
  const [submissions, setSubmissions] = useState<BookSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { userId } = useAuth();

  useEffect(() => {
    loadSubmissions();
  }, [userId]);

  const loadSubmissions = async () => {
    if (!userId) return;

    setLoading(true);
    const { data, error } = await supabase
      .from('book_submissions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error("Erro ao carregar submissões");
      console.error(error);
    } else {
      setSubmissions(data || []);
    }
    setLoading(false);
  };

  const handleDelete = async (id: string, filePath: string) => {
    try {
      // Exclui arquivo do storage
      const { error: storageError } = await supabase.storage
        .from('books')
        .remove([filePath]);

      if (storageError) {
        console.error("Erro ao deletar arquivo:", storageError);
      }

      // Exclui registro de submissão
      const { error: dbError } = await supabase
        .from('book_submissions')
        .delete()
        .eq('id', id);

      if (dbError) {
        throw dbError;
      }

      toast.success("Submissão deletada com sucesso");
      setSubmissions(submissions.filter(s => s.id !== id));
    } catch (error: any) {
      toast.error("Erro ao deletar submissão: " + error.message);
    } finally {
      setDeleteId(null);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'approved':
        return <CheckCircle className="h-4 w-4" />;
      case 'rejected':
        return <XCircle className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pendente';
      case 'approved':
        return 'Aprovado';
      case 'rejected':
        return 'Rejeitado';
      default:
        return status;
    }
  };

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'pending':
        return 'secondary';
      case 'approved':
        return 'default';
      case 'rejected':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando submissões...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-8">
      <section className="container mx-auto px-4 pt-8">
        <Button
          variant="ghost"
          size="sm"
          className="mb-4"
          onClick={() => navigate("/profile")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar para perfil
        </Button>

        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold">Minhas Submissões</h1>
              <p className="text-muted-foreground">
                Acompanhe o status dos seus livros enviados
              </p>
            </div>
            <Button onClick={() => navigate("/submit-book")}>
              Enviar Novo Livro
            </Button>
          </div>

          {submissions.length === 0 ? (
            <Card className="p-12 text-center border-dashed">
              <div className="flex flex-col items-center gap-4 max-w-md mx-auto">
                <div className="rounded-full bg-secondary p-6">
                  <FileText className="h-12 w-12 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-bold">Nenhuma submissão ainda</h3>
                <p className="text-muted-foreground">
                  Você ainda não enviou nenhum livro para avaliação
                </p>
                <Button onClick={() => navigate("/submit-book")}>
                  Enviar Primeiro Livro
                </Button>
              </div>
            </Card>
          ) : (
            <div className="space-y-4">
              {submissions.map((submission) => (
                <Card key={submission.id} className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold">{submission.title}</h3>
                        <Badge variant={getStatusVariant(submission.status)} className="gap-1">
                          {getStatusIcon(submission.status)}
                          {getStatusLabel(submission.status)}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground mb-1">
                        <strong>Autor:</strong> {submission.author}
                      </p>
                      <p className="text-muted-foreground mb-2">
                        <strong>Categoria:</strong> {submission.category}
                      </p>
                      <p className="text-sm text-muted-foreground mb-3">
                        {submission.description}
                      </p>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>
                          Enviado em: {new Date(submission.created_at).toLocaleDateString('pt-BR')}
                        </span>
                        <span>Formato: {submission.file_type.toUpperCase()}</span>
                      </div>
                      {submission.status === 'rejected' && submission.rejection_reason && (
                        <div className="mt-3 p-3 bg-destructive/10 rounded-lg">
                          <p className="text-sm text-destructive">
                            <strong>Motivo da rejeição:</strong> {submission.rejection_reason}
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {submission.status === 'pending' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteId(submission.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir esta submissão? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  const submission = submissions.find(s => s.id === deleteId);
                  if (submission) {
                    handleDelete(submission.id, submission.file_path);
                  }
                }}
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </section>
    </div>
  );
};

export default MySubmissions;
