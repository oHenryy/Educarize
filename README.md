## Educarize LMS

Plataforma LMS modular com foco em simplicidade para alunos, instrutores e administradores.

### Arquitetura Geral

- **Backend (`backend/`)**: API REST em Node.js (Express) com TypeScript, JWT para autenticação e controle de acesso por papéis (Admin, Instrutor, Aluno).
- **Frontend (`frontend/`)**: SPA em React/TypeScript consumindo a API, com rotas separadas para área do aluno, instrutor e administrador.
- **Banco de Dados**: Relacional (ex.: PostgreSQL) com modelos para usuários, cursos, matrículas, aulas, quizzes, certificados e registros de atividades.

### Módulos Principais

1. **Identidade e Acesso**
   - Cadastro/login com email e senha.
   - Perfis de usuário (foto, nome, senha).
   - ACL com papéis: Admin, Instrutor e Aluno.
   - Alteração de senha pelo próprio usuário.

2. **Gestão de Cursos (Back-office do Professor)**
   - Estrutura Curso → Módulo → Aula.
   - Gestão de mídia (links de vídeo e anexos).
   - Configurações de curso (capa, descrição, carga horária, categoria).
   - Lista de alunos matriculados por curso.

3. **Experiência de Aprendizagem (Aluno)**
   - Catálogo de cursos com busca e filtros.
   - Tela de player de vídeo com navegação lateral de aulas.
   - Marcador de progresso por aula e por curso.

4. **Avaliação e Engajamento**
   - Quizzes de múltipla escolha ao final de módulos.
   - Certificado em PDF ao atingir 100% de progresso.
   - Comentários/dúvidas por aula (estilo fórum simples).

5. **Módulo Administrativo**
   - Dashboard de métricas gerais (alunos, cursos, cadastros recentes).
   - Gestão de usuários (banir, resetar senha).
   - Log de atividades (criação/remoção de cursos, aulas, etc).

### Como rodar

1. **Backend**
   - `cd backend`
   - Copie `.env.example` para `.env` e configure as variáveis
   - `npm install`
   - `npx prisma migrate dev` (para criar o banco de dados)
   - `npm run dev`

2. **Frontend**
   - `cd frontend`
   - Crie um arquivo `.env` com `VITE_API_URL=http://localhost:4000`
   - `npm install`
   - `npm run dev`

### Documentação da API

Acesse `http://localhost:4000/docs` para ver a documentação Swagger completa da API.