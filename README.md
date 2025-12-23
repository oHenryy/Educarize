## Educarize LMS

Plataforma LMS modular com foco em simplicidade para alunos, instrutores e administradores.

### Arquitetura Geral

- **Backend (`backend/`)**: API REST em Node.js (Express) com TypeScript, JWT para autenticação, Socket.io para mensagens em tempo real e controle de acesso por papéis (Admin, Instrutor, Aluno).
- **Frontend (`frontend/`)**: SPA em React/TypeScript consumindo a API, com rotas separadas para área do aluno, instrutor e administrador.
- **Banco de Dados**: SQLite com Prisma ORM, contendo modelos para usuários, cursos, matrículas, aulas, quizzes, certificados, favoritos, notas, avaliações, notificações, tags, trilhas de aprendizado, mensagens e registros de atividades.

### Tecnologias Utilizadas

**Backend:**
- Node.js + Express + TypeScript
- Prisma ORM + SQLite
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
│   │   ├── middleware/      # Middlewares (auth, validação)
│   │   ├── utils/           # Utilitários
│   │   ├── socket/          # Handlers do Socket.io
│   │   ├── docs/            # Documentação Swagger
│   │   └── scripts/         # Scripts utilitários
│   ├── prisma/
│   │   ├── schema.prisma    # Schema do banco de dados
│   │   └── migrations/      # Migrações do banco
│   └── certificates/        # Certificados PDF gerados
├── frontend/
│   ├── src/
│   │   ├── api/             # Cliente HTTP (Axios)
│   │   ├── components/      # Componentes React reutilizáveis
│   │   ├── pages/           # Páginas da aplicação
│   │   ├── context/         # Context API (Auth)
│   │   ├── hooks/           # Custom hooks
│   │   └── types.ts         # Definições TypeScript
│   └── public/              # Arquivos estáticos
└── README.md
```

### Como Rodar

#### Pré-requisitos
- Node.js (v18 ou superior)
- npm ou yarn

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
     DATABASE_URL=file:./prisma/dev.db
     JWT_SECRET=uma-chave-bem-segura
     PORT=4000
     FRONTEND_URL=http://localhost:5173
     ```

4. Execute as migrações do banco de dados:
   ```bash
   npx prisma migrate dev
   ```

5. (Opcional) Crie um usuário administrador:
   ```bash
   npm run create-admin
   ```
   Ou com parâmetros customizados:
   ```bash
   npm run create-admin "Nome Admin" "admin@email.com" "senha123"
   ```

6. Inicie o servidor:
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
   - Crie um arquivo `.env` na raiz do diretório `frontend`
   - Adicione:
     ```
     VITE_API_URL=http://localhost:4000
     ```
     Ou alternativamente:
     ```
     VITE_BACKEND_URL=http://localhost:4000
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

#### Frontend
- `npm run dev` - Inicia o servidor de desenvolvimento
- `npm run build` - Compila para produção
- `npm run preview` - Preview da build de produção
- `npm run lint` - Executa o linter

### Documentação da API

Acesse `http://localhost:4000/docs` para ver a documentação Swagger completa da API com:
- Todas as rotas disponíveis
- Modelos de dados (schemas)
- Exemplos de requisições e respostas
- Autenticação e autorização
- Códigos de status HTTP

### Recursos Adicionais

- **WebSocket**: Mensagens diretas funcionam em tempo real via Socket.io
- **Certificados**: Gerados automaticamente em PDF quando o aluno completa 100% do curso
- **Notificações**: Sistema automático de notificações para eventos importantes
- **Busca**: Busca avançada com múltiplos filtros e sugestões
- **Trilhas**: Organize cursos em sequências de aprendizado estruturadas

### Status dos Cursos

- **DRAFT**: Rascunho (não visível para alunos)
- **PUBLISHED**: Publicado (disponível para matrícula)
- **ARCHIVED**: Arquivado (não aceita novas matrículas)
- **SUSPENDED**: Suspenso (temporariamente indisponível)

### Níveis de Dificuldade

- **BEGINNER**: Iniciante
- **INTERMEDIATE**: Intermediário
- **ADVANCED**: Avançado