## Educarize LMS

Plataforma LMS modular com foco em simplicidade para alunos, instrutores e administradores.

### Arquitetura Geral

- **Backend (`backend/`)**: API REST em Node.js (Express) com TypeScript, JWT para autenticação, Socket.io para mensagens em tempo real e controle de acesso por papéis (Admin, Instrutor, Aluno).
- **Frontend (`frontend/`)**: SPA em React/TypeScript consumindo a API, com rotas separadas para área do aluno, instrutor e administrador.
- **Banco de Dados**: PostgreSQL com Prisma ORM (Redis opcional para escalar em várias instâncias), contendo modelos para usuários, cursos, matrículas, aulas, quizzes, certificados, favoritos, notas, avaliações, notificações, tags, trilhas de aprendizado, mensagens e registros de atividades.

### Tecnologias Utilizadas

**Backend:**
- Node.js + Express + TypeScript
- Prisma ORM + PostgreSQL
- Redis (opcional: rate limit e Socket.io compartilhados entre instâncias)
- JWT (autenticação)
- Socket.io (mensagens em tempo real)
- PDFKit (geração de certificados)
- Swagger (documentação da API)

**Frontend:**
- React + TypeScript + Vite
- React Router DOM
- Axios (requisições HTTP)
- Socket.io-client (mensagens em tempo real)
- Chart.js (dashboards)

**OBS.:** Ele não está estéticamente perfeito, pois foi feito apenas com o objetivo de testar as funcionalidades.

### Módulos Principais

1. **Identidade e Acesso**
   - Cadastro/login com email e senha
   - Perfis de usuário (foto, nome, senha)
   - ACL com papéis: Admin, Instrutor e Aluno
   - Alteração de senha pelo próprio usuário
   - Reset de senha por administrador
   - Listagem de usuários para mensagens

2. **Gestão de Cursos (Back-office do Instrutor)**
   - Estrutura hierárquica: Curso → Módulo → Aula
   - Gestão completa de cursos (CRUD)
   - Configurações de curso (capa, descrição, carga horária, categoria, dificuldade, status)
   - Gestão de módulos e aulas
   - Material de apoio expandido (anexos categorizados: PDF, ZIP, Vídeo, Link, Documento, Imagem)
   - Sistema de anexos com descrição, categoria, ordem, miniatura e contador de downloads
   - Lista de alunos matriculados por curso
   - Dashboard do instrutor com estatísticas e métricas

3. **Experiência de Aprendizagem (Aluno)**
   - Catálogo de cursos com busca avançada e filtros
   - Player de vídeo integrado (YouTube/Vimeo)
   - Navegação lateral de aulas
   - Marcador de progresso por aula e por curso
   - Sistema de favoritos/wishlist
   - Sistema de notas e anotações por aula com busca
   - Visualização e download de material de apoio

4. **Avaliação e Engajamento**
   - Quizzes de múltipla escolha ao final de módulos
   - Múltiplas tentativas de quiz
   - Histórico de tentativas
   - Certificado em PDF ao atingir 100% de progresso
   - Sistema de comentários/dúvidas por aula (estilo fórum com respostas)
   - Sistema de avaliações e reviews com estrelas (1-5) e comentários
   - Exibição de média de avaliações nos cursos

5. **Módulo Administrativo**
   - Dashboard completo com métricas gerais
   - Gestão de usuários (listar, editar papel, resetar senha, deletar)
   - Transferência de cursos e trilhas entre instrutores (necessária antes de excluir ou rebaixar um autor)
   - Gestão de categorias de cursos
   - Log de atividades (auditoria completa de ações no sistema)
   - Visualização de estatísticas detalhadas

6. **Sistema de Notificações**
   - Notificações automáticas de eventos importantes
   - Notificações de matrícula, conclusão de aula, certificado gerado
   - Notificações de resultados de quiz
   - Notificações de novas avaliações e comentários
   - Notificações de novas mensagens
   - Contador de notificações não lidas
   - Marcar como lida / marcar todas como lidas

7. **Sistema de Tags**
   - Tags para categorização de cursos
   - Tags populares
   - Filtro de cursos por tags
   - Gestão de tags (criar, adicionar/remover de cursos)

8. **Busca Avançada**
   - Busca de cursos com múltiplos filtros (categoria, dificuldade, nota mínima, tags, status, instrutor)
   - Busca de aulas
   - Busca de notas pessoais
   - Sugestões de busca
   - Tags populares para busca

9. **Trilhas de Aprendizado**
   - Criação de trilhas temáticas
   - Agrupamento de cursos relacionados
   - Ordem sugerida de cursos
   - Progresso da trilha
   - Inscrição em trilhas
   - Gestão completa de trilhas (criar, editar, deletar, adicionar/remover cursos)

10. **Mensagens Diretas**
    - Sistema de mensagens privadas entre usuários
    - Comunicação em tempo real via WebSocket (Socket.io)
    - Lista de conversas
    - Indicador de mensagens não lidas
    - Indicador de digitação
    - Marcar mensagens/conversas como lidas
    - Histórico completo de mensagens

11. **Material de Apoio Expandido**
    - Anexos categorizados (Exercício, Referência, Template, Slides, Código, Outro)
    - Descrição e miniatura para anexos
    - Ordem de exibição configurável
    - Contador de downloads
    - Gestão completa de anexos (criar, editar, deletar)

### Estrutura do Projeto

```
Educarize/
├── backend/
│   ├── src/
│   │   ├── config/          # Configurações (banco, env)
│   │   ├── controllers/      # Controladores HTTP
│   │   ├── services/        # Lógica de negócio
│   │   ├── routes/          # Definição de rotas
│   │   ├── middleware/      # Middlewares (autenticação, CSRF, rate limit)
│   │   ├── validation/      # Schemas zod e middleware de validação
│   │   ├── utils/           # Utilitários (erros HTTP, e-mail, cookies, acesso a cursos)
│   │   ├── socket/          # Handlers do Socket.io
│   │   ├── docs/            # Documentação Swagger
│   │   └── scripts/         # Scripts utilitários
│   ├── prisma/
│   │   ├── schema.prisma    # Schema do banco de dados
│   │   └── migrations/      # Migrações do banco
│   ├── tests/               # Testes de API (Vitest + Supertest)
│   └── certificates/        # Certificados PDF gerados
├── frontend/
│   ├── src/
│   │   ├── api/             # Cliente HTTP (Axios)
│   │   ├── components/      # Componentes React reutilizáveis
│   │   ├── pages/           # Páginas da aplicação
│   │   ├── context/         # Context API (Auth, Toast)
│   │   ├── utils/           # Utilitários
│   │   └── types.ts         # Definições TypeScript
│   └── public/              # Arquivos estáticos
├── e2e/                     # Testes de ponta a ponta (Playwright)
├── .github/workflows/       # CI (GitHub Actions)
└── README.md
```

### Como Rodar

#### Pré-requisitos
- Node.js (v20 ou superior)
- npm
- Docker (para subir PostgreSQL e Redis) — ou um PostgreSQL 14+ e, opcionalmente, um Redis próprios

#### Banco de dados e Redis

Na raiz do projeto:
```bash
docker compose up -d
```
Isso sobe o PostgreSQL em `localhost:5432` (usuário, senha e banco `educarize`) e o Redis em `localhost:6379`,
com os dados persistidos em volumes do Docker.

#### Backend

1. Entre no diretório do backend:
   ```bash
   cd backend
   ```

2. Instale as dependências:
   ```bash
   npm install
   ```

3. Configure as variáveis de ambiente:
   - Copie `.env.example` para `.env`
   - Edite o arquivo `.env` e configure:
     ```
     DATABASE_URL=postgresql://educarize:educarize@localhost:5432/educarize
     JWT_SECRET=uma-chave-bem-segura
     PORT=4000
     FRONTEND_URL=http://localhost:5173
     # Opcional: compartilha rate limit e Socket.io entre várias instâncias do backend
     REDIS_URL=redis://localhost:6379
     ```
   - `JWT_SECRET` é **obrigatório** com `NODE_ENV=production`; em desenvolvimento, se ausente, é usada uma chave
     de teste e um aviso é exibido no console.

4. Execute as migrações do banco de dados:
   ```bash
   npx prisma migrate deploy
   ```
   (Durante o desenvolvimento do schema, use `npx prisma migrate dev` para criar novas migrações.)

5. (Opcional) Migrando de uma instalação anterior com SQLite? Copie os dados para o PostgreSQL:
   ```bash
   npm run migrate:sqlite -- caminho/para/dev.db
   ```
   O SQLite precisa estar na última versão do schema SQLite (commit `3f75413`) e o PostgreSQL de destino, com as
   migrações aplicadas e vazio. O script copia todas as tabelas convertendo datas, booleanos e JSON; as senhas
   continuam valendo.

6. (Opcional) Crie um usuário administrador:
   ```bash
   npm run create-admin
   ```
   Ou com parâmetros customizados:
   ```bash
   npm run create-admin "Nome Admin" "admin@email.com" "senha123"
   ```

7. Inicie o servidor:
   ```bash
   npm run dev
   ```

   O backend estará rodando em `http://localhost:4000`

#### Frontend

1. Entre no diretório do frontend:
   ```bash
   cd frontend
   ```

2. Instale as dependências:
   ```bash
   npm install
   ```

3. Configure as variáveis de ambiente:
   - Copie `.env.example` para `.env` na raiz do diretório `frontend`
   - Configure a URL da API:
     ```
     VITE_API_URL=http://localhost:4000
     ```

4. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```

   O frontend estará rodando em `http://localhost:5173`

### Scripts Disponíveis

#### Backend
- `npm run dev` - Inicia o servidor em modo desenvolvimento
- `npm run build` - Compila o TypeScript para JavaScript
- `npm run start` - Inicia o servidor em modo produção
- `npm run prisma:generate` - Gera o cliente Prisma
- `npm run prisma:migrate` - Executa migrações do banco
- `npm run create-admin` - Cria um usuário administrador
- `npm run typecheck` - Verifica os tipos do código e dos testes
- `npm test` - Roda os testes de API (Vitest + Supertest) em um schema PostgreSQL temporário, criado e removido
  a cada execução (requer o PostgreSQL do `docker compose`; os testes de Redis são pulados se ele não estiver no ar)

#### Frontend
- `npm run dev` - Inicia o servidor de desenvolvimento
- `npm run build` - Compila para produção
- `npm run preview` - Preview da build de produção
- `npm run lint` - Executa o linter

#### Testes de ponta a ponta (`e2e/`)
- `npm install` e, na primeira vez, `npx playwright install chromium`
- `npm test` - Sobe backend (schema `e2e` no PostgreSQL, com Redis) e frontend automaticamente e roda os cenários
  no Chromium
- `npm run test:edge` - Mesmo teste usando o Microsoft Edge instalado (sem baixar navegador)

### Integração Contínua

O workflow `.github/workflows/ci.yml` roda a cada push na `main` e em pull requests:
1. **Backend**: checagem de tipos e testes de API
2. **Frontend**: lint e build de produção
3. **Ponta a ponta**: fluxos completos no navegador (após os dois anteriores passarem); em caso de falha, o
   relatório do Playwright fica disponível como artefato

### Documentação da API

Acesse `http://localhost:4000/docs` para ver a documentação Swagger completa da API com:
- Todas as rotas disponíveis
- Modelos de dados (schemas)
- Exemplos de requisições e respostas
- Autenticação e autorização
- Códigos de status HTTP

### Recursos Adicionais

- **WebSocket**: Mensagens diretas e notificações chegam em tempo real via Socket.io (uma conexão por usuário
  logado, autenticada pelo cookie da sessão; o frontend não consulta o servidor periodicamente)
- **Listagens paginadas**: `GET /courses` devolve `{ courses, pagination }` (`page`, `limit` até 100); a busca de
  usuários (`GET /auth/users?search=&roles=&limit=`) e a lista de conversas são calculadas no banco
- **Certificados**: Gerados automaticamente em PDF quando o aluno completa 100% do curso
- **Notificações**: Sistema automático de notificações para eventos importantes
- **Busca**: Busca avançada com múltiplos filtros e sugestões
- **Trilhas**: Organize cursos em sequências de aprendizado estruturadas

### Sessão e Segurança

- **Sessão em cookies httpOnly**: o login define `access_token` (15 min) e `refresh_token` (7 dias, enviado
  apenas para `/auth`). O token nunca fica acessível ao JavaScript da página, o que protege contra roubo por XSS.
- **Renovação automática**: quando o access token expira, o frontend chama `POST /auth/refresh` e repete a
  requisição. O refresh token é trocado a cada uso; se um token já usado for reapresentado (indício de roubo),
  todas as sessões do usuário são encerradas.
- **Logout e troca de senha**: o logout revoga a sessão no servidor; trocar ou redefinir a senha encerra as
  demais sessões.
- **CSRF**: requisições que alteram dados exigem o cabeçalho `X-Requested-With: XMLHttpRequest` (o cliente da
  aplicação já envia), e o CORS só aceita a origem configurada em `FRONTEND_URL`.
- **Recuperação de senha**: link de uso único, válido por 1 hora, enviado por e-mail.
- **Verificação de e-mail**: enviada no cadastro; com `REQUIRE_EMAIL_VERIFICATION=true` o login passa a exigi-la.
  Sem `SMTP_HOST` configurado, os e-mails são exibidos no console do backend.
- **Validação**: todas as entradas são validadas com `zod` (tipos, formatos e limites de tamanho); campos não
  declarados são descartados. Erros inesperados retornam uma mensagem genérica, sem detalhes internos.
- **Certificados**: guardam uma cópia dos dados do curso e continuam válidos mesmo que o curso seja excluído.
- Cabeçalhos de segurança com `helmet`.

As variáveis de ambiente opcionais (sessão, SMTP etc.) estão documentadas em `backend/.env.example`.

### Regras de Acesso

- **Cadastro**: o próprio usuário pode se registrar como `STUDENT` ou `INSTRUCTOR`. O papel `ADMIN` só é
  concedido por outro administrador (ou pelo script `npm run create-admin`).
- **Papel sempre atualizado**: o papel é lido do banco a cada requisição; alterações feitas por um admin (ou a
  exclusão do usuário) valem imediatamente, sem esperar o token expirar.
- **Conteúdo do curso** (vídeos, anexos, quizzes, comentários, anotações, progresso): disponível para o
  instrutor dono do curso, administradores e usuários matriculados. Quem não está matriculado vê apenas a ementa.
  Instrutores e administradores também podem se matricular em cursos de outros instrutores.
- **Rascunhos**: cursos e trilhas não publicados só aparecem para o autor e para administradores.
- **Quizzes**: o gabarito é enviado apenas ao dono do curso e a administradores.
- **Certificados**: exigem matrícula e 100% das aulas concluídas; o download (`GET /certificates/:id/download`)
  exige autenticação e só é permitido ao dono do certificado.
- **Avaliações**: apenas alunos matriculados podem avaliar um curso (o instrutor não avalia o próprio curso).
- **Trilhas**: podem combinar cursos publicados de qualquer instrutor. Ao se matricular em uma trilha, o aluno é
  matriculado automaticamente nos cursos obrigatórios publicados; o progresso considera os cursos obrigatórios.
- **Exclusão de usuários**: autores de cursos ou trilhas precisam ter o conteúdo transferido
  (`POST /admin/users/:id/transfer-content`) antes de serem excluídos ou rebaixados para `STUDENT`.
- **Comentários**: excluir um comentário remove também as respostas dele.
- **Links**: URLs de vídeo e de anexos precisam ser `http://` ou `https://`.
- **Login/cadastro**: limitados a 20 tentativas a cada 15 minutos por IP.

### Status dos Cursos

- **DRAFT**: Rascunho (não visível para alunos)
- **PUBLISHED**: Publicado (disponível para matrícula)
- **ARCHIVED**: Arquivado (não aceita novas matrículas)
- **SUSPENDED**: Suspenso (temporariamente indisponível; apenas administradores suspendem ou reativam)

### Níveis de Dificuldade

- **BEGINNER**: Iniciante
- **INTERMEDIATE**: Intermediário
- **ADVANCED**: Avançado