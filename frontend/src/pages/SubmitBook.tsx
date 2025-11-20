import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, ArrowLeft, FileText } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const SubmitBook = () => {
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { userId } = useAuth();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const validTypes = ['application/pdf', 'application/epub+zip', 'application/x-mobipocket-ebook'];
      const validExtensions = ['.pdf', '.epub', '.mobi'];
      
      const fileExtension = selectedFile.name.toLowerCase().slice(selectedFile.name.lastIndexOf('.'));
      
      if (!validExtensions.includes(fileExtension)) {
        toast.error("Apenas arquivos PDF, EPUB ou MOBI são permitidos");
        return;
      }

      if (selectedFile.size > 52428800) { // 50MB (limite)
        toast.error("O arquivo deve ter no máximo 50MB");
        return;
      }

      setFile(selectedFile);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title || !author || !description || !category || !file || !userId) {
      toast.error("Preencha todos os campos e selecione um arquivo");
      return;
    }

    setLoading(true);

    try {
      // Envia arquivo para o storage
      const fileExtension = file.name.slice(file.name.lastIndexOf('.'));
      const fileName = `${userId}/${Date.now()}_${file.name}`;
      
      const { error: uploadError } = await supabase.storage
        .from('books')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw uploadError;
      }

      // Cria registro de submissão
      const { error: submissionError } = await supabase
        .from('book_submissions')
        .insert({
          user_id: userId,
          title,
          author,
          description,
          category,
          file_path: fileName,
          file_type: fileExtension.replace('.', ''),
          status: 'pending'
        });

      if (submissionError) {
        // Se a submissão falhar, exclui o arquivo enviado
        await supabase.storage.from('books').remove([fileName]);
        throw submissionError;
      }

      toast.success("Livro enviado com sucesso! Aguarde a aprovação.");
      navigate("/profile");
    } catch (error: any) {
      console.error("Erro ao enviar livro:", error);
      toast.error("Erro ao enviar livro: " + error.message);
    } finally {
      setLoading(false);
    }
  };

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

        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <div className="rounded-full bg-primary/10 p-3">
              <Upload className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Enviar Livro</h1>
              <p className="text-muted-foreground">
                Compartilhe seus livros para avaliação e aprovação
              </p>
            </div>
          </div>

          <Card className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">Título do Livro *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: O Senhor dos Anéis"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="author">Autor *</Label>
                <Input
                  id="author"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="Ex: J.R.R. Tolkien"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Categoria *</Label>
                <Select value={category} onValueChange={setCategory} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ficcao">Ficção</SelectItem>
                    <SelectItem value="nao-ficcao">Não-Ficção</SelectItem>
                    <SelectItem value="romance">Romance</SelectItem>
                    <SelectItem value="fantasia">Fantasia</SelectItem>
                    <SelectItem value="misterio">Mistério</SelectItem>
                    <SelectItem value="biografia">Biografia</SelectItem>
                    <SelectItem value="autoajuda">Autoajuda</SelectItem>
                    <SelectItem value="tecnico">Técnico</SelectItem>
                    <SelectItem value="outros">Outros</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição *</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descreva brevemente o conteúdo do livro..."
                  rows={4}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="file">Arquivo do Livro *</Label>
                <div className="flex items-center gap-4">
                  <Input
                    id="file"
                    type="file"
                    accept=".pdf,.epub,.mobi"
                    onChange={handleFileChange}
                    className="cursor-pointer"
                    required
                  />
                  {file && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <FileText className="h-4 w-4" />
                      <span>{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                    </div>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  Formatos aceitos: PDF, EPUB, MOBI (máx. 50MB)
                </p>
              </div>

              <div className="bg-secondary/50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  Informações Importantes
                </h3>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Seu livro será avaliado pela equipe antes de ser publicado</li>
                  <li>Você receberá uma notificação sobre o status da análise</li>
                  <li>Certifique-se de que possui os direitos do conteúdo</li>
                  <li>Arquivos com conteúdo impróprio serão rejeitados</li>
                </ul>
              </div>

              <div className="flex gap-3">
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={loading}
                >
                  {loading ? "Enviando..." : "Enviar para Avaliação"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/profile")}
                  disabled={loading}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </section>
    </div>
  );
};

export default SubmitBook;
