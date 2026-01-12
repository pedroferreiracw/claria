import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, Users } from 'lucide-react';
import { useClosers, useAddCloser, useUpdateCloser, useDeleteCloser } from '@/hooks/useClosers';
import { useUserRole } from '@/hooks/useUserRole';
import { SDR, Squad } from '@/types';
import { toast } from 'sonner';

export default function Closers() {
  const { data: closers = [], isLoading } = useClosers();
  const addCloser = useAddCloser();
  const updateCloser = useUpdateCloser();
  const deleteCloser = useDeleteCloser();
  const { isAdmin } = useUserRole();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCloser, setEditingCloser] = useState<SDR | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    squad: 'Águia' as Squad,
    role: '',
  });

  const handleSubmit = () => {
    if (!formData.name || !formData.role) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    if (editingCloser) {
      updateCloser.mutate({ id: editingCloser.id, data: formData });
    } else {
      addCloser.mutate(formData);
    }

    setIsDialogOpen(false);
    resetForm();
  };

  const handleEdit = (closer: SDR) => {
    setEditingCloser(closer);
    setFormData({
      name: closer.name,
      squad: closer.squad,
      role: closer.role,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja remover este closer?')) {
      deleteCloser.mutate(id);
    }
  };

  const resetForm = () => {
    setEditingCloser(null);
    setFormData({ name: '', squad: 'Águia', role: '' });
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Closers</h1>
            <p className="text-muted-foreground">Gerencie a equipe de closers</p>
          </div>

          {isAdmin && (
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar Closer
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingCloser ? 'Editar Closer' : 'Novo Closer'}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Nome completo"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="squad">Squad *</Label>
                    <Select
                      value={formData.squad}
                      onValueChange={(value: Squad) => setFormData({ ...formData, squad: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Águia">Águia</SelectItem>
                        <SelectItem value="Lobo">Lobo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="role">Cargo *</Label>
                    <Input
                      id="role"
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      placeholder="Ex: Closer Sênior"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleSubmit}>
                      {editingCloser ? 'Salvar' : 'Adicionar'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Equipe de Closers ({closers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : closers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum closer cadastrado ainda.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Closer</TableHead>
                    <TableHead>Squad</TableHead>
                    <TableHead>Cargo</TableHead>
                    {isAdmin && <TableHead className="text-right">Ações</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {closers.map((closer) => (
                    <TableRow key={closer.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={closer.avatarUrl} />
                            <AvatarFallback>{getInitials(closer.name)}</AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{closer.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={closer.squad === 'Águia' ? 'default' : 'secondary'}>
                          {closer.squad}
                        </Badge>
                      </TableCell>
                      <TableCell>{closer.role}</TableCell>
                      {isAdmin && (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(closer)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(closer.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
