import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle, XCircle, Shield, Eye, Upload, FileText } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  user_id: string;
}

interface StorageFile {
  name: string;
  id: string;
  updated_at?: string;
  created_at?: string;
  last_accessed_at?: string;
  metadata: Record<string, any>;
}

interface BookForm {
  title: string;
  author: string;
  description: string;
  category: string;
  cover_image: string;
  age_rating: string;
  release_year: string;
}

const AdminPanel = () => {
  const [submissions, setSubmissions] = useState<BookSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState<BookSubmission | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [storageFiles, setStorageFiles] = useState<StorageFile[]>([]);
  const [storageLoading, setStorageLoading] = useState(false);
  const [bookForms, setBookForms] = useState<Record<string, BookForm>>({});
  const [existingBooks, setExistingBooks] = useState<Set<string>>(new Set());
  const [existingBooksData, setExistingBooksData] = useState<Map<string, any>>(new Map());
  const [activeTab, setActiveTab] = useState("submissions");
  const navigate = useNavigate();
  const { userId } = useAuth();

  // Verifica parâmetros da URL para a aba inicial
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab === 'import') {
      setActiveTab('import');
      loadStorageFiles();
    }
  }, []);

  useEffect(() => {
    loadSubmissions();
    loadExistingBooks();
  }, []);

  const loadExistingBooks = async () => {
    const { data } = await supabase
      .from('books')
      .select('*');
    
    if (data) {
      setExistingBooks(new Set(data.map(b => b.file_path)));
      const booksMap = new Map(data.map(b => [b.file_path, b]));
      setExistingBooksData(booksMap);
      
      // Preenche formulários para livros existentes
      const forms: Record<string, BookForm> = {};
      data.forEach(book => {
        forms[book.file_path] = {
          title: book.title,
          author: book.author,
          description: book.description || '',
          category: book.category,
          cover_image: book.cover_image || '',
          age_rating: book.age_rating || 'Livre',
          release_year: book.created_at ? new Date(book.created_at).getFullYear().toString() : '',
        };
      });
      setBookForms(forms);
    }
  };

  const loadStorageFiles = async () => {
    setStorageLoading(true);
    const { data, error } = await supabase.storage
      .from('books')
      .list();

    if (error) {
      toast.error("Erro ao carregar arquivos do storage");
      console.error(error);
    } else {
      const validFiles = (data || []).filter(file => 
        file.name.endsWith('.pdf') || 
        file.name.endsWith('.epub') || 
        file.name.endsWith('.mobi')
      );
      setStorageFiles(validFiles);
    }
    setStorageLoading(false);
  };

  const loadSubmissions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('book_submissions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error("Erro ao carregar submissões");
      console.error(error);
    } else {
      setSubmissions(data || []);
    }
    setLoading(false);
  };

  const handleApprove = async (submission: BookSubmission) => {
    setActionLoading(true);
    
    // Primeiro, atualiza o status da submissão
    const { error: submissionError } = await supabase
      .from('book_submissions')
      .update({
        status: 'approved',
        reviewed_at: new Date().toISOString(),
        reviewed_by: userId,
      })
      .eq('id', submission.id);

    if (submissionError) {
      toast.error("Erro ao aprovar submissão");
      console.error(submissionError);
      setActionLoading(false);
      return;
    }

    // Em seguida, adiciona o livro na tabela de livros
    const { error: bookError } = await supabase
      .from('books')
      .insert({
        title: submission.title,
        author: submission.author,
        description: submission.description,
        category: submission.category,
        file_path: submission.file_path,
        file_type: submission.file_type,
        submission_id: submission.id,
      });

    if (bookError) {
      toast.error("Erro ao adicionar livro à biblioteca");
      console.error(bookError);
    } else {
      toast.success(`Livro "${submission.title}" aprovado e adicionado à biblioteca!`);
      loadSubmissions();
    }
    
    setActionLoading(false);
  };

  const handleRejectClick = (submission: BookSubmission) => {
    setSelectedSubmission(submission);
    setRejectionReason("");
    setShowRejectDialog(true);
  };

  const handleRejectConfirm = async () => {
    if (!selectedSubmission || !rejectionReason.trim()) {
      toast.error("Por favor, forneça um motivo para a rejeição");
      return;
    }

    setActionLoading(true);
    const { error } = await supabase
      .from('book_submissions')
      .update({
        status: 'rejected',
        rejection_reason: rejectionReason,
        reviewed_at: new Date().toISOString(),
        reviewed_by: userId,
      })
      .eq('id', selectedSubmission.id);

    if (error) {
      toast.error("Erro ao rejeitar submissão");
      console.error(error);
    } else {
      toast.success(`Livro "${selectedSubmission.title}" rejeitado`);
      loadSubmissions();
      setShowRejectDialog(false);
      setSelectedSubmission(null);
    }
    setActionLoading(false);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      pending: "secondary",
      approved: "default",
      rejected: "destructive",
    };
    const labels: Record<string, string> = {
      pending: "Pendente",
      approved: "Aprovado",
      rejected: "Rejeitado",
    };
    return (
      <Badge variant={variants[status] || "outline"}>
        {labels[status] || status}
      </Badge>
    );
  };

  const downloadFile = async (filePath: string, fileName: string) => {
    const { data, error } = await supabase.storage
      .from('books')
      .download(filePath);

    if (error) {
      toast.error("Erro ao baixar arquivo");
      return;
    }

    const url = URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleFormChange = (fileName: string, field: keyof BookForm, value: string) => {
    setBookForms(prev => ({
      ...prev,
      [fileName]: {
        ...(prev[fileName] || { title: '', author: '', description: '', category: '', cover_image: '', age_rating: 'Livre', release_year: '' }),
        [field]: value
      }
    }));
  };

  const handleCoverImageUpload = async (fileName: string, file: File) => {
    const fileExt = file.name.split('.').pop();
    const filePath = `covers/${fileName.replace(/\.[^/.]+$/, '')}-${Date.now()}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from('books')
      .upload(filePath, file);

    if (uploadError) {
      toast.error("Erro ao fazer upload da capa");
      console.error(uploadError);
      return null;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('books')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const handleImportBook = async (file: StorageFile) => {
    const form = bookForms[file.name];
    const existingBook = existingBooksData.get(file.name);
    
    if (!form || !form.title || !form.author || !form.category) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    setActionLoading(true);
    
    const fileType = file.name.split('.').pop()?.toLowerCase() || 'pdf';
    
    if (existingBook) {
      // Atualiza livro existente
      const { error } = await supabase
        .from('books')
        .update({
          title: form.title,
          author: form.author,
          description: form.description,
          category: form.category,
          cover_image: form.cover_image || null,
          age_rating: form.age_rating || 'Livre',
        })
        .eq('id', existingBook.id);

      if (error) {
        toast.error("Erro ao atualizar livro");
        console.error(error);
      } else {
        toast.success(`Livro "${form.title}" atualizado com sucesso!`);
        loadExistingBooks();
      }
    } else {
      // Insere novo livro
      const releaseYear = form.release_year ? parseInt(form.release_year) : new Date().getFullYear();
      const { error } = await supabase
        .from('books')
        .insert({
          title: form.title,
          author: form.author,
          description: form.description,
          category: form.category,
          cover_image: form.cover_image || null,
          file_path: file.name,
          file_type: fileType,
          age_rating: form.age_rating || 'Livre',
          created_at: new Date(releaseYear, 0, 1).toISOString(),
        });

      if (error) {
        toast.error("Erro ao adicionar livro");
        console.error(error);
      } else {
        toast.success(`Livro "${form.title}" adicionado com sucesso!`);
        loadExistingBooks();
      }
    }
    
    setActionLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando painel...</p>
        </div>
      </div>
    );
  }

  const pendingCount = submissions.filter(s => s.status === 'pending').length;
  const approvedCount = submissions.filter(s => s.status === 'approved').length;
  const rejectedCount = submissions.filter(s => s.status === 'rejected').length;

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

        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <div className="rounded-full bg-primary/10 p-3">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Painel Administrativo</h1>
              <p className="text-muted-foreground">
                Gerencie as submissões de livros
              </p>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
              <TabsTrigger value="submissions">Submissões</TabsTrigger>
              <TabsTrigger value="import" onClick={loadStorageFiles}>Importar do Storage</TabsTrigger>
            </TabsList>

            <TabsContent value="submissions">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card className="p-4 bg-secondary border-0">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-amber-500">{pendingCount}</div>
                    <div className="text-sm text-muted-foreground">Pendentes</div>
                  </div>
                </Card>
                <Card className="p-4 bg-secondary border-0">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-500">{approvedCount}</div>
                    <div className="text-sm text-muted-foreground">Aprovados</div>
                  </div>
                </Card>
                <Card className="p-4 bg-secondary border-0">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-red-500">{rejectedCount}</div>
                    <div className="text-sm text-muted-foreground">Rejeitados</div>
                  </div>
                </Card>
              </div>

              {submissions.length === 0 ? (
                <Card className="p-12 text-center border-dashed">
                  <div className="flex flex-col items-center gap-4 max-w-md mx-auto">
                    <div className="rounded-full bg-secondary p-6">
                      <Shield className="h-12 w-12 text-muted-foreground" />
                    </div>
                    <h3 className="text-xl font-bold">Nenhuma submissão</h3>
                    <p className="text-muted-foreground">
                      Ainda não há submissões de livros para revisar
                    </p>
                  </div>
                </Card>
              ) : (
                <div className="space-y-4">
                  {submissions.map((submission) => (
                    <Card key={submission.id} className="p-6">
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-xl font-bold">{submission.title}</h3>
                            {getStatusBadge(submission.status)}
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
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => downloadFile(submission.file_path, `${submission.title}.${submission.file_type}`)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Baixar Arquivo
                        </Button>
                        {submission.status === 'pending' && (
                          <>
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handleApprove(submission)}
                              disabled={actionLoading}
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Aprovar
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleRejectClick(submission)}
                              disabled={actionLoading}
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Rejeitar
                            </Button>
                          </>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="import">
              {storageLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Carregando arquivos...</p>
                </div>
              ) : storageFiles.length === 0 ? (
                <Card className="p-12 text-center border-dashed">
                  <div className="flex flex-col items-center gap-4 max-w-md mx-auto">
                    <div className="rounded-full bg-secondary p-6">
                      <FileText className="h-12 w-12 text-muted-foreground" />
                    </div>
                    <h3 className="text-xl font-bold">Nenhum arquivo encontrado</h3>
                    <p className="text-muted-foreground">
                      Não há arquivos PDF, EPUB ou MOBI no bucket de storage
                    </p>
                  </div>
                </Card>
              ) : (
                <div className="space-y-6">
                  {storageFiles.map((file) => {
                    const isAlreadyImported = existingBooks.has(file.name);
                    const form = bookForms[file.name] || { title: '', author: '', description: '', category: '', cover_image: '', age_rating: 'Livre', release_year: '' };
                    
                    return (
                      <Card key={file.id} className="p-6">
                        <div className="flex items-start gap-4 mb-4">
                          <div className="rounded-full bg-primary/10 p-3">
                            <FileText className="h-6 w-6 text-primary" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-lg font-bold">{file.name}</h3>
                              {isAlreadyImported && (
                                <Badge variant="default">Importado</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mb-4">
                              Tamanho: {file.metadata?.size ? (file.metadata.size / 1024 / 1024).toFixed(2) + ' MB' : 'Desconhecido'}
                            </p>

                            <div className="space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <Label htmlFor={`title-${file.id}`}>Título *</Label>
                                  <Input
                                    id={`title-${file.id}`}
                                    value={form.title}
                                    onChange={(e) => handleFormChange(file.name, 'title', e.target.value)}
                                    placeholder="Digite o título do livro"
                                  />
                                </div>
                                <div>
                                  <Label htmlFor={`author-${file.id}`}>Autor *</Label>
                                  <Input
                                    id={`author-${file.id}`}
                                    value={form.author}
                                    onChange={(e) => handleFormChange(file.name, 'author', e.target.value)}
                                    placeholder="Digite o nome do autor"
                                  />
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <Label htmlFor={`category-${file.id}`}>Categoria *</Label>
                                  <Input
                                    id={`category-${file.id}`}
                                    value={form.category}
                                    onChange={(e) => handleFormChange(file.name, 'category', e.target.value)}
                                    placeholder="Ex: Ficção, Romance, etc."
                                  />
                                </div>
                                <div>
                                  <Label htmlFor={`cover-${file.id}`}>Imagem da Capa</Label>
                                  <div className="flex gap-2">
                                    <Input
                                      type="file"
                                      accept="image/*"
                                      id={`cover-file-${file.id}`}
                                      onChange={async (e) => {
                                        const imageFile = e.target.files?.[0];
                                        if (imageFile) {
                                          const url = await handleCoverImageUpload(file.name, imageFile);
                                          if (url) {
                                            handleFormChange(file.name, 'cover_image', url);
                                          }
                                        }
                                      }}
                                      className="flex-1"
                                    />
                                  </div>
                                  {form.cover_image && (
                                    <div className="mt-2">
                                      <img src={form.cover_image} alt="Capa" className="h-24 w-16 object-cover rounded" />
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <Label htmlFor={`age-rating-${file.id}`}>Faixa Etária</Label>
                                  <Input
                                    id={`age-rating-${file.id}`}
                                    value={form.age_rating}
                                    onChange={(e) => handleFormChange(file.name, 'age_rating', e.target.value)}
                                    placeholder="Ex: Livre, 10+, 12+, 14+, 16+, 18+"
                                  />
                                </div>
                                <div>
                                  <Label htmlFor={`release-year-${file.id}`}>Ano de Lançamento</Label>
                                  <Input
                                    id={`release-year-${file.id}`}
                                    type="number"
                                    value={form.release_year}
                                    onChange={(e) => handleFormChange(file.name, 'release_year', e.target.value)}
                                    placeholder="Ex: 2024"
                                    min="1800"
                                    max={new Date().getFullYear()}
                                  />
                                </div>
                              </div>

                              <div>
                                <Label htmlFor={`description-${file.id}`}>Descrição</Label>
                                <Textarea
                                  id={`description-${file.id}`}
                                  value={form.description}
                                  onChange={(e) => handleFormChange(file.name, 'description', e.target.value)}
                                  placeholder="Descrição do livro"
                                  rows={3}
                                />
                              </div>

                              <Button
                                onClick={() => handleImportBook(file)}
                                disabled={actionLoading || !form.title || !form.author || !form.category}
                              >
                                <Upload className="h-4 w-4 mr-2" />
                                {isAlreadyImported ? 'Salvar Alterações' : 'Adicionar à Biblioteca'}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Rejeitar Submissão</DialogTitle>
              <DialogDescription>
                Forneça um motivo para a rejeição de "{selectedSubmission?.title}"
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <Textarea
                placeholder="Explique o motivo da rejeição..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
              />
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowRejectDialog(false)}
                disabled={actionLoading}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={handleRejectConfirm}
                disabled={actionLoading || !rejectionReason.trim()}
              >
                {actionLoading ? "Rejeitando..." : "Confirmar Rejeição"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </section>
    </div>
  );
};

export default AdminPanel;
