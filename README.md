# Essential System

Sistema de perfumes com cadastro, fotos, estoque e vendas. Cada venda registra se foi **física** ou **online**.

## Stack

- React + Vite + Tailwind CSS
- Node.js + Express
- Prisma (SQLite no desenvolvimento; PostgreSQL do Supabase em produção)
- Supabase Storage (bucket público `produtos-fotos`)

## 1. Variáveis de ambiente

Na raiz do projeto, copie `.env.example` para `.env`:

```
DATABASE_URL="file:./dev.db"
SUPABASE_URL="https://[PROJECT_REF].supabase.co"
SUPABASE_SERVICE_ROLE_KEY="[service_role]"
PORT=3001
PUBLIC_API_URL="http://localhost:3001"
CLIENT_ORIGIN="http://localhost:5173"
```

No frontend, `frontend/.env`:

```
VITE_API_URL=http://localhost:3001
```

Use a **service_role** só no backend. Nunca coloque essa chave no React.

## 2. Bucket no Supabase

1. Abra **Storage** no painel do Supabase.
2. Crie o bucket `produtos-fotos`.
3. Marque o bucket como **public**.
4. Se o upload falhar por RLS, rode no SQL Editor:

```sql
insert into storage.buckets (id, name, public)
values ('produtos-fotos', 'produtos-fotos', true)
on conflict (id) do update set public = true;

create policy "Leitura pública das fotos"
on storage.objects for select
using (bucket_id = 'produtos-fotos');

create policy "Backend envia fotos"
on storage.objects for insert
with check (bucket_id = 'produtos-fotos');

create policy "Backend remove fotos"
on storage.objects for delete
using (bucket_id = 'produtos-fotos');
```

Com `SUPABASE_SERVICE_ROLE_KEY` o backend ignora RLS, mas a leitura pública continua necessária para o PDV exibir as imagens.

Se o Storage ainda não estiver configurado, o backend grava as fotos em `backend/uploads` e serve em `/uploads`. O PDV funciona igual; troque para o bucket quando as chaves do Supabase estiverem no `.env`.

## 3. Banco e seed

```bash
npm install
npx prisma migrate deploy
npx prisma generate
npm run db:seed
```

A migration `20260825180000_init` já inclui o campo opcional `Produto.fotoUrl`.

## 4. Subir o sistema

```bash
npm run dev
```

- Interface: http://localhost:5173
- API: http://localhost:3001

## Fluxo das fotos

- O formulário mostra preview (drag-and-drop ou clique) antes de salvar.
- Aceita JPG, PNG e WEBP até 2 MB.
- No save, o Express (`multer`) envia o arquivo ao bucket, gera nome único (`timestamp-uuid`) e grava a URL pública em `fotoUrl`.
- Atualizar com nova foto ou remover a atual apaga o arquivo antigo no Storage.
- Excluir um produto sem histórico de venda também remove a foto. Produto com venda é só desativado.

## Telas

- `/` — registrar venda (escolhe se foi **física** ou **online** no checkout).
- `/estoque` — tabela com avatar da foto ao lado do nome.
- `/produtos/novo` e `/produtos/:id` — cadastro/edição com upload.
- `/caixa` — abertura, sangria, suprimento e fechamento.
- `/historico` — vendas, reimpressão e cancelamento (devolve estoque).
- `/relatorios` — mais vendidos do mês.

A licença fica na tabela `Licenca` (vencimento + 5 dias de tolerância). Depois disso as vendas são bloqueadas e o PIX de mensalidade aparece no topo.
