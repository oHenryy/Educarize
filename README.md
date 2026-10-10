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
   - Gestão de módulos e aulas, com reordenação por arrastar e soltar (mouse, toque ou teclado)
   - Material de apoio expandido (anexos categorizados: PDF, ZIP, Vídeo, Link, Documento, Imagem)
   - Sistema de anexos com descrição, categoria, ordem, miniatura e contador de downloads
   - Upload de capas e materiais (ou links externos), guardados em disco ou em storage compatível com S3
     (Silo no ambiente local, AWS S3, Cloudflare R2...); os certificados em PDF usam o mesmo storage
   - Lista de alunos matriculados por curso
   - Dashboard do instrutor com estatísticas e métricas

3. **Experiência de Aprendizagem (Aluno)**
   - Catálogo de cursos com busca avançada e filtros
   - Busca textual do PostgreSQL (português): ignora acentos e maiúsculas, aceita prefixos e palavras
     flexionadas e ordena por relevância (título pesa mais que a descrição); vale para cursos, aulas e anotações
   - Player de vídeo integrado (YouTube/Vimeo) que registra o tempo realmente assistido, retoma de onde o
     aluno parou e conclui a aula automaticamente ao assistir 90% do vídeo
   - Navegação lateral de aulas
   - Marcador de progresso por aula e por curso
   - Sistema de favoritos/wishlist
   - Sistema de notas e anotações por aula com busca
   - Visualização e download de material de apoio

4. **Avaliação e Engajamento**
   - Quizzes de múltipla escolha ao final de módulos
   - Múltiplas tentativas de quiz, com limite opcional por quiz
   - Questões e alternativas embaralhadas (opcional) e explicação por questão
   - Feedback por questão; a resposta correta só aparece após aprovação ou ao esgotar as tentativas
   - Histórico de tentativas
   - Certificado em PDF ao atingir 100% de progresso (o curso pode exigir também a aprovação nos quizzes)
   - Verificação pública de certificados por código ou QR code (`/certificates/verify/:code`)
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
   - Notificações por e-mail, com preferência por assunto no perfil (mensagens, comentários, certificados,
     avaliações, quizzes, matrículas e progresso). Só para e-mails confirmados; mensagens diretas só geram
     e-mail quando o destinatário não está com o Educarize aberto

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
   - Ordem sugerida de cursos, reordenável por arrastar e soltar
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
- Docker (para subir PostgreSQL, Redis e Silo) — ou um PostgreSQL 14+ e, opcionalmente, Redis e storage S3 próprios

#### Banco de dados, Redis e storage S3

Na raiz do projeto:
```bash
docker compose up -d
```
Isso sobe, com os dados persistidos em volumes do Docker:
- PostgreSQL em `localhost:5432` (usuário, senha e banco `educarize`);
- Redis em `localhost:6379`;
- [Silo](https://silo.pigsty.io/docs/) — fork comunitário do MinIO, compatível com S3 — com a API em `localhost:9000` e o
  console web em http://localhost:9001 (usuário `educarize`, senha `educarize-silo`). Guarda capas, materiais e
  certificados; o bucket `educarize` é criado pelo backend na primeira execução.

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
     # Arquivos no Silo do docker compose (sem S3_BUCKET, ficam em disco na pasta uploads/)
     S3_BUCKET=educarize
     S3_ENDPOINT=http://localhost:9000
     S3_ACCESS_KEY_ID=educarize
     S3_SECRET_ACCESS_KEY=educarize-silo
     S3_FORCE_PATH_STYLE=true
     S3_CREATE_BUCKET=true
     ```
   - Ao subir, o backend informa onde guarda os arquivos (ou avisa se o storage estiver inacessível).
   - Em produção, aponte `S3_*` para o seu storage (AWS S3, Silo/MinIO, R2...), crie o bucket antes e deixe
     `S3_CREATE_BUCKET` desligado. Com várias instâncias do backend, use S3 (o disco local não é compartilhado).
     Atrás de proxy/HTTPS, defina `PUBLIC_API_URL` para que os links dos arquivos usem o endereço público da API.
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
  a cada execução (requer o PostgreSQL do `docker compose`; os testes de Redis e do storage S3/Silo são pulados se
  eles não estiverem no ar — no CI são obrigatórios)

#### Frontend
- `npm run dev` - Inicia o servidor de desenvolvimento
- `npm run build` - Compila para produção
- `npm run preview` - Preview da build de produção
- `npm run lint` - Executa o linter

#### Testes de ponta a ponta (`e2e/`)
- `npm install` e, na primeira vez, `npx playwright install chromium`
- `npm test` - Sobe backend (schema `e2e` no PostgreSQL, com Redis e o bucket `educarize-e2e` no Silo, esvaziado a
  cada execução) e frontend automaticamente e roda os cenários no Chromium (requer `docker compose up -d`)
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
- **Quizzes**: o gabarito e as explicações são enviados apenas ao dono do curso e a administradores; o aluno os
  vê no resultado da tentativa depois de ser aprovado ou de esgotar as tentativas.
- **Certificados**: exigem matrícula e 100% das aulas concluídas (e aprovação nos quizzes, se o curso exigir); o
  download (`GET /certificates/:id/download`) exige autenticação e só é permitido ao dono do certificado. A
  verificação pelo código (`GET /certificates/verify/:code`) é pública e mostra apenas os dados impressos.
- **Vídeos**: o progresso só conta tempo de reprodução (pular trechos não conta) e é limitado à duração do vídeo.
- **Avaliações**: apenas alunos matriculados podem avaliar um curso (o instrutor não avalia o próprio curso).
- **Trilhas**: podem combinar cursos publicados de qualquer instrutor. Ao se matricular em uma trilha, o aluno é
  matriculado automaticamente nos cursos obrigatórios publicados; o progresso considera os cursos obrigatórios.
- **Exclusão de usuários**: autores de cursos ou trilhas precisam ter o conteúdo transferido
  (`POST /admin/users/:id/transfer-content`) antes de serem excluídos ou rebaixados para `STUDENT`.
- **Comentários**: excluir um comentário remove também as respostas dele.
- **Links**: URLs de vídeo e de anexos precisam ser `http://` ou `https://`.
- **Arquivos enviados**: só instrutores e administradores enviam. O tipo é validado pela extensão e pela
  assinatura do arquivo (HTML, SVG e scripts são recusados); capas até 5 MB e materiais até 50 MB. Capas são
  públicas; materiais só podem ser baixados por quem tem acesso ao curso. Arquivos sem uso (material excluído,
  capa trocada, curso removido) são apagados do storage.
- **Limpeza de arquivos**: o servidor remove periodicamente (padrão: a cada 6 h) os arquivos enviados há mais de
  24 h que não estão em nenhum material nem capa de curso ou trilha, como envios de formulários abandonados.
  Ajuste com `FILE_CLEANUP_INTERVAL_HOURS` (0 desativa) e `FILE_CLEANUP_GRACE_HOURS`; para rodar manualmente:
  `npm run cleanup-files -- [horas de carência]`.
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