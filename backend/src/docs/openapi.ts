export const openApiSpec = {
  openapi: "3.0.0",
  info: {
    title: "Educarize LMS API",
    version: "1.0.0",
    description: `API REST completa para o sistema de gerenciamento de aprendizado (LMS) Educarize.

## Autenticação
A API utiliza autenticação baseada em JWT (JSON Web Tokens). Para acessar endpoints protegidos:
1. Faça login através do endpoint /auth/login
2. Copie o token retornado
3. Use o token no header: Authorization: Bearer <token>

## Papéis de Usuário
- **ADMIN**: Acesso total ao sistema, incluindo gestão de usuários e logs de atividades
- **INSTRUCTOR**: Pode criar e gerenciar cursos, módulos e aulas
- **STUDENT**: Pode se matricular em cursos, assistir aulas e fazer quizzes

## Recursos Principais
- Autenticação: Registro, login e gerenciamento de senha
- Cursos: CRUD completo de cursos com categorias e status
- Módulos e Aulas: Estrutura hierárquica de conteúdo
- Matrículas: Sistema de inscrição em cursos
- Progresso: Rastreamento de conclusão de aulas
- Quizzes: Sistema de avaliação com múltiplas tentativas
- Comentários: Fórum de discussão por aula
- Certificados: Geração automática de certificados PDF
- Logs de Atividade: Auditoria de ações no sistema
- Favoritos: Sistema de wishlist para salvar cursos
- Notas: Anotações por aula com busca
- Avaliações: Sistema de reviews com estrelas e comentários
- Notificações: Notificações automáticas de eventos importantes
- Tags: Sistema de tags para categorização de cursos
- Busca Avançada: Busca com múltiplos filtros
- Trilhas de Aprendizado: Cursos organizados em sequência
- Mensagens Diretas: Sistema de mensagens em tempo real (WebSocket)
- Dashboard do Instrutor: Estatísticas e métricas para instrutores
- Material de Apoio Expandido: Anexos categorizados com downloads`
  },
  servers: [
    {
      url: "http://localhost:4000",
      description: "Desenvolvimento local"
    }
  ],
  paths: {
    "/health": {
      get: {
        tags: ["Sistema"],
        summary: "Health check",
        responses: {
          "200": {
            description: "Servidor operacional"
          }
        }
      }
    },
    "/auth/register": {
      post: {
        tags: ["Autenticação"],
        summary: "Registrar novo usuário",
        description: "Cria uma nova conta de usuário no sistema. O papel padrão é STUDENT, mas pode ser especificado.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { 
                    type: "string",
                    description: "Nome completo do usuário",
                    example: "João Silva"
                  },
                  email: { 
                    type: "string", 
                    format: "email",
                    description: "Email do usuário (deve ser único)",
                    example: "joao@example.com"
                  },
                  password: { 
                    type: "string", 
                    format: "password",
                    description: "Senha do usuário (mínimo 6 caracteres)",
                    minLength: 6,
                    example: "senha123"
                  },
                  role: {
                    type: "string",
                    enum: ["ADMIN", "INSTRUCTOR", "STUDENT"],
                    description: "Papel do usuário (opcional, padrão: STUDENT)",
                    example: "STUDENT"
                  }
                },
                required: ["name", "email", "password"]
              },
              examples: {
                student: {
                  value: {
                    name: "João Silva",
                    email: "joao@example.com",
                    password: "senha123"
                  }
                },
                instructor: {
                  value: {
                    name: "Maria Santos",
                    email: "maria@example.com",
                    password: "senha456",
                    role: "INSTRUCTOR"
                  }
                }
              }
            }
          }
        },
        responses: {
          "201": {
            description: "Usuário criado com sucesso",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AuthResponse" },
                example: {
                  token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                  user: {
                    id: "cmj8yi05p0000i95xczaw7sjr",
                    name: "João Silva",
                    email: "joao@example.com",
                    role: "STUDENT",
                    avatarUrl: null
                  }
                }
              }
            }
          },
          "400": {
            description: "Dados inválidos",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
                example: { error: "Nome, email e senha são obrigatórios" }
              }
            }
          },
          "409": {
            description: "Email já cadastrado",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
                example: { error: "Email já cadastrado" }
              }
            }
          }
        }
      }
    },
    "/auth/login": {
      post: {
        tags: ["Autenticação"],
        summary: "Login com email e senha",
        description: "Autentica um usuário e retorna um token JWT válido por 7 dias.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  email: { 
                    type: "string", 
                    format: "email",
                    description: "Email do usuário",
                    example: "joao@example.com"
                  },
                  password: { 
                    type: "string", 
                    format: "password",
                    description: "Senha do usuário",
                    example: "senha123"
                  }
                },
                required: ["email", "password"]
              },
              example: {
                email: "joao@example.com",
                password: "senha123"
              }
            }
          }
        },
        responses: {
          "200": {
            description: "Login bem-sucedido",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AuthResponse" },
                example: {
                  token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                  user: {
                    id: "cmj8yi05p0000i95xczaw7sjr",
                    name: "João Silva",
                    email: "joao@example.com",
                    role: "STUDENT",
                    avatarUrl: null
                  }
                }
              }
            }
          },
          "401": {
            description: "Credenciais inválidas",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
                example: { error: "Credenciais inválidas" }
              }
            }
          }
        }
      }
    },
    "/auth/me": {
      get: {
        tags: ["Autenticação"],
        summary: "Dados do usuário autenticado",
        description: "Retorna os dados do usuário atualmente autenticado baseado no token JWT.",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Dados do usuário",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    user: { $ref: "#/components/schemas/User" }
                  }
                },
                example: {
                  user: {
                    id: "cmj8yi05p0000i95xczaw7sjr",
                    name: "João Silva",
                    email: "joao@example.com",
                    role: "STUDENT",
                    avatarUrl: null,
                    createdAt: "2024-12-16T10:00:00.000Z"
                  }
                }
              }
            }
          },
          "401": {
            description: "Não autenticado",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
                example: { error: "Token inválido ou expirado" }
              }
            }
          }
        }
      }
    },
    "/courses": {
      get: {
        tags: ["Cursos"],
        summary: "Listar cursos",
        description: "Retorna uma lista de cursos com filtros opcionais. Estudantes veem apenas cursos publicados, enquanto instrutores e admins veem todos os cursos.",
        security: [{ bearerAuth: [] }],
        parameters: [
          { 
            name: "categoryId", 
            in: "query", 
            schema: { type: "string" },
            description: "Filtrar por ID de categoria",
            example: "cmj8rngyr0002ls7vd48hkzdx"
          },
          { 
            name: "difficulty", 
            in: "query", 
            schema: { type: "string", enum: ["BEGINNER", "INTERMEDIATE", "ADVANCED"] },
            description: "Filtrar por nível de dificuldade",
            example: "BEGINNER"
          },
          { 
            name: "status", 
            in: "query", 
            schema: { type: "string", enum: ["DRAFT", "PUBLISHED", "ARCHIVED", "SUSPENDED"] },
            description: "Filtrar por status (apenas INSTRUCTOR/ADMIN)",
            example: "PUBLISHED"
          },
          { 
            name: "search", 
            in: "query", 
            schema: { type: "string" },
            description: "Buscar por título ou descrição",
            example: "JavaScript"
          }
        ],
        responses: {
          "200": { 
            description: "Lista de cursos",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/Course" }
                }
              }
            }
          },
          "401": {
            description: "Não autenticado",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" }
              }
            }
          }
        }
      },
      post: {
        tags: ["Cursos"],
        summary: "Criar curso (INSTRUCTOR/ADMIN)",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  coverImageUrl: { type: "string" },
                  durationHours: { type: "integer" },
                  difficulty: { type: "string", enum: ["BEGINNER", "INTERMEDIATE", "ADVANCED"] },
                  categoryId: { type: "string" }
                },
                required: ["title"]
              }
            }
          }
        },
        responses: {
          "201": { description: "Curso criado" },
          "403": { description: "Sem permissão" }
        }
      }
    },
    "/courses/{id}": {
      get: {
        tags: ["Cursos"],
        summary: "Obter detalhes de um curso",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Detalhes do curso" },
          "404": { description: "Curso não encontrado" }
        }
      },
      put: {
        tags: ["Cursos"],
        summary: "Atualizar curso",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  coverImageUrl: { type: "string" },
                  durationHours: { type: "integer" },
                  difficulty: { type: "string" },
                  categoryId: { type: "string" },
                  status: { type: "string", enum: ["DRAFT", "PUBLISHED", "ARCHIVED", "SUSPENDED"] }
                }
              }
            }
          }
        },
        responses: {
          "200": { description: "Curso atualizado" },
          "403": { description: "Sem permissão" }
        }
      },
      delete: {
        tags: ["Cursos"],
        summary: "Deletar curso",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Curso deletado" },
          "403": { description: "Sem permissão" }
        }
      }
    },
    "/courses/{id}/students": {
      get: {
        tags: ["Cursos"],
        summary: "Listar alunos do curso (INSTRUCTOR/ADMIN)",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Lista de alunos" },
          "403": { description: "Sem permissão" }
        }
      }
    },
    "/modules/course/{courseId}": {
      get: {
        tags: ["Módulos"],
        summary: "Listar módulos de um curso",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "courseId", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Lista de módulos" }
        }
      }
    },
    "/modules": {
      post: {
        tags: ["Módulos"],
        summary: "Criar módulo (INSTRUCTOR/ADMIN)",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  order: { type: "integer" },
                  courseId: { type: "string" }
                },
                required: ["title", "courseId"]
              }
            }
          }
        },
        responses: {
          "201": { description: "Módulo criado" }
        }
      }
    },
    "/modules/{id}": {
      put: {
        tags: ["Módulos"],
        summary: "Atualizar módulo",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  order: { type: "integer" }
                }
              }
            }
          }
        },
        responses: {
          "200": { description: "Módulo atualizado" }
        }
      },
      delete: {
        tags: ["Módulos"],
        summary: "Deletar módulo",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Módulo deletado" }
        }
      }
    },
    "/lessons/module/{moduleId}": {
      get: {
        tags: ["Aulas"],
        summary: "Listar aulas de um módulo",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "moduleId", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Lista de aulas" }
        }
      }
    },
    "/lessons/{id}": {
      get: {
        tags: ["Aulas"],
        summary: "Obter detalhes de uma aula",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Detalhes da aula" }
        }
      },
      put: {
        tags: ["Aulas"],
        summary: "Atualizar aula",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  videoUrl: { type: "string" },
                  durationMinutes: { type: "integer" },
                  order: { type: "integer" }
                }
              }
            }
          }
        },
        responses: {
          "200": { description: "Aula atualizada" }
        }
      },
      delete: {
        tags: ["Aulas"],
        summary: "Deletar aula",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Aula deletada" }
        }
      }
    },
    "/lessons": {
      post: {
        tags: ["Aulas"],
        summary: "Criar aula (INSTRUCTOR/ADMIN)",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  videoUrl: { type: "string" },
                  durationMinutes: { type: "integer" },
                  order: { type: "integer" },
                  moduleId: { type: "string" }
                },
                required: ["title", "moduleId"]
              }
            }
          }
        },
        responses: {
          "201": { description: "Aula criada" }
        }
      }
    },
    "/lessons/{id}/attachments": {
      post: {
        tags: ["Aulas"],
        summary: "Adicionar anexo a uma aula",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  fileUrl: { type: "string" },
                  fileType: { type: "string", enum: ["PDF", "ZIP", "OTHER"] },
                  fileSize: { type: "integer" }
                },
                required: ["name", "fileUrl", "fileType"]
              }
            }
          }
        },
        responses: {
          "201": { description: "Anexo adicionado" }
        }
      }
    },
    "/lessons/attachments/{attachmentId}": {
      delete: {
        tags: ["Aulas"],
        summary: "Deletar anexo de uma aula",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "attachmentId", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Anexo deletado" },
          "403": { description: "Sem permissão" }
        }
      }
    },
    "/progress/complete": {
      post: {
        tags: ["Progresso"],
        summary: "Marcar aula como concluída",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  lessonId: { type: "string" }
                },
                required: ["lessonId"]
              }
            }
          }
        },
        responses: {
          "200": { description: "Aula marcada como concluída" },
          "401": { description: "Não autenticado" }
        }
      }
    },
    "/progress/incomplete": {
      post: {
        tags: ["Progresso"],
        summary: "Marcar aula como não concluída",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  lessonId: { type: "string" }
                },
                required: ["lessonId"]
              }
            }
          }
        },
        responses: {
          "200": { description: "Aula marcada como não concluída" },
          "401": { description: "Não autenticado" }
        }
      }
    },
    "/progress/course/{courseId}": {
      get: {
        tags: ["Progresso"],
        summary: "Obter progresso de um curso",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "courseId", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Progresso do curso" },
          "401": { description: "Não autenticado" }
        }
      }
    },
    "/progress/lesson/{lessonId}": {
      get: {
        tags: ["Progresso"],
        summary: "Obter progresso de uma aula",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "lessonId", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Progresso da aula" },
          "401": { description: "Não autenticado" }
        }
      }
    },
    "/comments/lesson/{lessonId}": {
      get: {
        tags: ["Comentários"],
        summary: "Listar comentários de uma aula",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "lessonId", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Lista de comentários" },
          "401": { description: "Não autenticado" }
        }
      }
    },
    "/comments": {
      post: {
        tags: ["Comentários"],
        summary: "Criar comentário em uma aula",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  lessonId: { type: "string" },
                  content: { type: "string" },
                  parentId: { type: "string" }
                },
                required: ["lessonId", "content"]
              }
            }
          }
        },
        responses: {
          "201": { description: "Comentário criado" },
          "401": { description: "Não autenticado" }
        }
      }
    },
    "/comments/{id}": {
      put: {
        tags: ["Comentários"],
        summary: "Atualizar comentário",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  content: { type: "string" }
                },
                required: ["content"]
              }
            }
          }
        },
        responses: {
          "200": { description: "Comentário atualizado" },
          "403": { description: "Sem permissão" },
          "401": { description: "Não autenticado" }
        }
      },
      delete: {
        tags: ["Comentários"],
        summary: "Deletar comentário",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Comentário deletado" },
          "403": { description: "Sem permissão" },
          "401": { description: "Não autenticado" }
        }
      }
    },
    "/quizzes/module/{moduleId}": {
      get: {
        tags: ["Quizzes"],
        summary: "Obter quiz de um módulo",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "moduleId", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Quiz do módulo" },
          "404": { description: "Quiz não encontrado" },
          "401": { description: "Não autenticado" }
        }
      }
    },
    "/quizzes/attempt": {
      post: {
        tags: ["Quizzes"],
        summary: "Submeter tentativa de quiz",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  quizId: { type: "string" },
                  answers: {
                    type: "object",
                    additionalProperties: { type: "integer" }
                  }
                },
                required: ["quizId", "answers"]
              }
            }
          }
        },
        responses: {
          "200": { description: "Tentativa submetida" },
          "401": { description: "Não autenticado" }
        }
      }
    },
    "/quizzes/{quizId}/attempts": {
      get: {
        tags: ["Quizzes"],
        summary: "Listar tentativas de um quiz",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "quizId", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Lista de tentativas" },
          "401": { description: "Não autenticado" }
        }
      }
    },
    "/quizzes": {
      post: {
        tags: ["Quizzes"],
        summary: "Criar quiz (INSTRUCTOR/ADMIN)",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  moduleId: { type: "string" },
                  title: { type: "string" },
                  description: { type: "string" },
                  passingScore: { type: "integer" }
                },
                required: ["moduleId", "title", "passingScore"]
              }
            }
          }
        },
        responses: {
          "201": { description: "Quiz criado" },
          "403": { description: "Sem permissão" }
        }
      }
    },
    "/quizzes/{id}": {
      put: {
        tags: ["Quizzes"],
        summary: "Atualizar quiz",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  passingScore: { type: "integer" }
                }
              }
            }
          }
        },
        responses: {
          "200": { description: "Quiz atualizado" },
          "403": { description: "Sem permissão" }
        }
      },
      delete: {
        tags: ["Quizzes"],
        summary: "Deletar quiz",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Quiz deletado" },
          "403": { description: "Sem permissão" }
        }
      }
    },
    "/quizzes/questions": {
      post: {
        tags: ["Quizzes"],
        summary: "Adicionar questão a um quiz",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  quizId: { type: "string" },
                  question: { type: "string" },
                  type: { type: "string", enum: ["MULTIPLE_CHOICE"] },
                  options: { type: "array", items: { type: "string" } },
                  correctAnswer: { type: "integer" },
                  order: { type: "integer" }
                },
                required: ["quizId", "question", "options", "correctAnswer"]
              }
            }
          }
        },
        responses: {
          "201": { description: "Questão criada" },
          "403": { description: "Sem permissão" }
        }
      }
    },
    "/quizzes/questions/{id}": {
      put: {
        tags: ["Quizzes"],
        summary: "Atualizar questão",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  question: { type: "string" },
                  options: { type: "array", items: { type: "string" } },
                  correctAnswer: { type: "integer" },
                  order: { type: "integer" }
                }
              }
            }
          }
        },
        responses: {
          "200": { description: "Questão atualizada" },
          "403": { description: "Sem permissão" }
        }
      },
      delete: {
        tags: ["Quizzes"],
        summary: "Deletar questão",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Questão deletada" },
          "403": { description: "Sem permissão" }
        }
      }
    },
    "/admin/stats": {
      get: {
        tags: ["Administração"],
        summary: "Obter estatísticas do dashboard (ADMIN)",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Estatísticas do dashboard" },
          "403": { description: "Apenas ADMIN" }
        }
      }
    },
    "/admin/users": {
      get: {
        tags: ["Administração"],
        summary: "Listar usuários (ADMIN)",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
          { name: "search", in: "query", schema: { type: "string" } }
        ],
        responses: {
          "200": { description: "Lista de usuários" },
          "403": { description: "Apenas ADMIN" }
        }
      }
    },
    "/admin/users/{id}": {
      get: {
        tags: ["Administração"],
        summary: "Obter detalhes de um usuário (ADMIN)",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Detalhes do usuário" },
          "403": { description: "Apenas ADMIN" }
        }
      },
      delete: {
        tags: ["Administração"],
        summary: "Deletar usuário (ADMIN)",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Usuário deletado" },
          "403": { description: "Apenas ADMIN" }
        }
      }
    },
    "/admin/users/{id}/role": {
      put: {
        tags: ["Administração"],
        summary: "Atualizar papel de um usuário (ADMIN)",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  role: { type: "string", enum: ["ADMIN", "INSTRUCTOR", "STUDENT"] }
                },
                required: ["role"]
              }
            }
          }
        },
        responses: {
          "200": { description: "Papel atualizado" },
          "403": { description: "Apenas ADMIN" }
        }
      }
    },
    "/enrollments": {
      post: {
        tags: ["Matrículas"],
        summary: "Matricular-se em um curso",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  courseId: { type: "string" }
                },
                required: ["courseId"]
              }
            }
          }
        },
        responses: {
          "201": { description: "Matriculado com sucesso" },
          "400": { description: "Já matriculado ou curso não publicado" }
        }
      }
    },
    "/enrollments/my": {
      get: {
        tags: ["Matrículas"],
        summary: "Listar meus cursos matriculados",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Lista de cursos matriculados" }
        }
      }
    },
    "/enrollments/{courseId}": {
      delete: {
        tags: ["Matrículas"],
        summary: "Cancelar matrícula",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "courseId", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Matrícula cancelada" }
        }
      }
    },
    "/categories": {
      get: {
        tags: ["Categorias"],
        summary: "Listar categorias",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Lista de categorias" }
        }
      },
      post: {
        tags: ["Categorias"],
        summary: "Criar categoria (ADMIN)",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  description: { type: "string" }
                },
                required: ["name"]
              }
            }
          }
        },
        responses: {
          "201": { description: "Categoria criada" },
          "403": { description: "Apenas ADMIN" }
        }
      }
    },
    "/certificates/my": {
      get: {
        tags: ["Certificados"],
        summary: "Listar meus certificados",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Lista de certificados do usuário",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: { type: "string" },
                      pdfUrl: { type: "string" },
                      courseId: { type: "string" },
                      issuedAt: { type: "string", format: "date-time" },
                      course: {
                        type: "object",
                        properties: {
                          id: { type: "string" },
                          title: { type: "string" },
                          coverImageUrl: { type: "string" }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          "401": { description: "Não autenticado" }
        }
      }
    },
    "/certificates/generate": {
      post: {
        tags: ["Certificados"],
        summary: "Gerar certificado para um curso",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  courseId: { type: "string" }
                },
                required: ["courseId"]
              }
            }
          }
        },
        responses: {
          "200": {
            description: "Certificado gerado com sucesso",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    pdfUrl: { type: "string" },
                    message: { type: "string" }
                  }
                }
              }
            }
          },
          "400": { description: "Erro ao gerar certificado (curso não completado ou já existe)" },
          "401": { description: "Não autenticado" }
        }
      }
    },
    "/certificates/{id}/download": {
      get: {
        tags: ["Certificados"],
        summary: "Baixar certificado por ID",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" }
          }
        ],
        responses: {
          "200": {
            description: "Arquivo PDF do certificado",
            content: {
              "application/pdf": {
                schema: { type: "string", format: "binary" }
              }
            }
          },
          "404": { description: "Certificado não encontrado" },
          "401": { description: "Não autenticado" }
        }
      }
    },
    "/certificates/{id}": {
      delete: {
        tags: ["Certificados"],
        summary: "Deletar certificado (permite regenerar)",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" }
          }
        ],
        responses: {
          "200": { description: "Certificado deletado com sucesso" },
          "404": { description: "Certificado não encontrado" },
          "401": { description: "Não autenticado" }
        }
      }
    },
    "/auth/change-password": {
      post: {
        tags: ["Autenticação"],
        summary: "Alterar senha do usuário autenticado",
        description: "Permite que o usuário altere sua própria senha. Requer a senha atual para validação.",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  currentPassword: { 
                    type: "string", 
                    format: "password",
                    description: "Senha atual do usuário",
                    example: "senhaAntiga123"
                  },
                  newPassword: { 
                    type: "string", 
                    format: "password",
                    description: "Nova senha (mínimo 6 caracteres)",
                    minLength: 6,
                    example: "novaSenha456"
                  }
                },
                required: ["currentPassword", "newPassword"]
              },
              example: {
                currentPassword: "senhaAntiga123",
                newPassword: "novaSenha456"
              }
            }
          }
        },
        responses: {
          "200": { 
            description: "Senha alterada com sucesso",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string", example: "Senha alterada com sucesso" }
                  }
                }
              }
            }
          },
          "400": { 
            description: "Senha atual incorreta ou nova senha inválida",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
                example: { error: "Senha atual incorreta" }
              }
            }
          },
          "401": { 
            description: "Não autenticado",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" }
              }
            }
          }
        }
      }
    },
    "/admin/users/{id}/reset-password": {
      put: {
        tags: ["Administração"],
        summary: "Resetar senha de um usuário (ADMIN)",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" }
          }
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  newPassword: { type: "string", format: "password" }
                },
                required: ["newPassword"]
              }
            }
          }
        },
        responses: {
          "200": { description: "Senha resetada com sucesso" },
          "400": { description: "Erro ao resetar senha" },
          "403": { description: "Apenas ADMIN" }
        }
      }
    },
    "/activity-logs": {
      get: {
        tags: ["Logs de Atividade"],
        summary: "Listar logs de atividades (ADMIN)",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 50 } },
          { name: "action", in: "query", schema: { type: "string" } },
          { name: "resourceType", in: "query", schema: { type: "string" } },
          { name: "userId", in: "query", schema: { type: "string" } }
        ],
        responses: {
          "200": { description: "Lista de logs de atividades" },
          "403": { description: "Apenas ADMIN" }
        }
      }
    },
    "/activity-logs/{id}": {
      get: {
        tags: ["Logs de Atividade"],
        summary: "Obter log de atividade por ID (ADMIN)",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" }
          }
        ],
        responses: {
          "200": { description: "Detalhes do log" },
          "404": { description: "Log não encontrado" },
          "403": { description: "Apenas ADMIN" }
        }
      }
    },
    "/auth/users": {
      get: {
        tags: ["Autenticação"],
        summary: "Listar usuários (para mensagens)",
        description: "Retorna uma lista básica de usuários para seleção em mensagens diretas",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Lista de usuários",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: { type: "string" },
                      name: { type: "string" },
                      email: { type: "string" },
                      avatarUrl: { type: "string", nullable: true },
                      role: { type: "string", enum: ["ADMIN", "INSTRUCTOR", "STUDENT"] }
                    }
                  }
                }
              }
            }
          },
          "401": { description: "Não autenticado" }
        }
      }
    },
    "/favorites": {
      get: {
        tags: ["Favoritos"],
        summary: "Listar meus cursos favoritos",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Lista de cursos favoritos",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/Course" }
                }
              }
            }
          },
          "401": { description: "Não autenticado" }
        }
      },
      post: {
        tags: ["Favoritos"],
        summary: "Adicionar curso aos favoritos",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  courseId: { type: "string" }
                },
                required: ["courseId"]
              }
            }
          }
        },
        responses: {
          "201": { description: "Curso adicionado aos favoritos" },
          "400": { description: "Curso já está nos favoritos" },
          "401": { description: "Não autenticado" }
        }
      }
    },
    "/favorites/{courseId}": {
      delete: {
        tags: ["Favoritos"],
        summary: "Remover curso dos favoritos",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "courseId", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Curso removido dos favoritos" },
          "401": { description: "Não autenticado" }
        }
      }
    },
    "/favorites/{courseId}/check": {
      get: {
        tags: ["Favoritos"],
        summary: "Verificar se curso está nos favoritos",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "courseId", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": {
            description: "Status do favorito",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    isFavorite: { type: "boolean" }
                  }
                }
              }
            }
          },
          "401": { description: "Não autenticado" }
        }
      }
    },
    "/notes": {
      get: {
        tags: ["Notas"],
        summary: "Listar minhas notas",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Lista de notas",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/Note" }
                }
              }
            }
          },
          "401": { description: "Não autenticado" }
        }
      },
      post: {
        tags: ["Notas"],
        summary: "Criar nota em uma aula",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  lessonId: { type: "string" },
                  content: { type: "string" }
                },
                required: ["lessonId", "content"]
              }
            }
          }
        },
        responses: {
          "201": { description: "Nota criada", content: { "application/json": { schema: { $ref: "#/components/schemas/Note" } } } },
          "401": { description: "Não autenticado" }
        }
      }
    },
    "/notes/{id}": {
      put: {
        tags: ["Notas"],
        summary: "Atualizar nota",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  content: { type: "string" }
                },
                required: ["content"]
              }
            }
          }
        },
        responses: {
          "200": { description: "Nota atualizada" },
          "403": { description: "Sem permissão" },
          "401": { description: "Não autenticado" }
        }
      },
      delete: {
        tags: ["Notas"],
        summary: "Deletar nota",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Nota deletada" },
          "403": { description: "Sem permissão" },
          "401": { description: "Não autenticado" }
        }
      }
    },
    "/notes/lesson/{lessonId}": {
      get: {
        tags: ["Notas"],
        summary: "Listar notas de uma aula",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "lessonId", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": {
            description: "Lista de notas da aula",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/Note" }
                }
              }
            }
          },
          "401": { description: "Não autenticado" }
        }
      }
    },
    "/reviews": {
      post: {
        tags: ["Avaliações"],
        summary: "Criar avaliação de curso",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  courseId: { type: "string" },
                  rating: { type: "integer", minimum: 1, maximum: 5 },
                  comment: { type: "string" }
                },
                required: ["courseId", "rating"]
              }
            }
          }
        },
        responses: {
          "201": { description: "Avaliação criada", content: { "application/json": { schema: { $ref: "#/components/schemas/CourseReview" } } } },
          "400": { description: "Já existe avaliação para este curso" },
          "401": { description: "Não autenticado" }
        }
      }
    },
    "/reviews/{id}": {
      put: {
        tags: ["Avaliações"],
        summary: "Atualizar avaliação",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  rating: { type: "integer", minimum: 1, maximum: 5 },
                  comment: { type: "string" }
                }
              }
            }
          }
        },
        responses: {
          "200": { description: "Avaliação atualizada" },
          "403": { description: "Sem permissão" },
          "401": { description: "Não autenticado" }
        }
      },
      delete: {
        tags: ["Avaliações"],
        summary: "Deletar avaliação",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Avaliação deletada" },
          "403": { description: "Sem permissão" },
          "401": { description: "Não autenticado" }
        }
      }
    },
    "/reviews/course/{courseId}": {
      get: {
        tags: ["Avaliações"],
        summary: "Listar avaliações de um curso",
        parameters: [{ name: "courseId", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": {
            description: "Lista de avaliações",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/CourseReview" }
                }
              }
            }
          }
        }
      }
    },
    "/reviews/my": {
      get: {
        tags: ["Avaliações"],
        summary: "Listar minhas avaliações",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Lista de minhas avaliações",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/CourseReview" }
                }
              }
            }
          },
          "401": { description: "Não autenticado" }
        }
      }
    },
    "/notifications": {
      get: {
        tags: ["Notificações"],
        summary: "Listar minhas notificações",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Lista de notificações",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/Notification" }
                }
              }
            }
          },
          "401": { description: "Não autenticado" }
        }
      }
    },
    "/notifications/{id}": {
      put: {
        tags: ["Notificações"],
        summary: "Marcar notificação como lida",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Notificação marcada como lida" },
          "401": { description: "Não autenticado" }
        }
      },
      delete: {
        tags: ["Notificações"],
        summary: "Deletar notificação",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Notificação deletada" },
          "401": { description: "Não autenticado" }
        }
      }
    },
    "/notifications/read-all": {
      put: {
        tags: ["Notificações"],
        summary: "Marcar todas as notificações como lidas",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Todas as notificações marcadas como lidas" },
          "401": { description: "Não autenticado" }
        }
      }
    },
    "/notifications/unread-count": {
      get: {
        tags: ["Notificações"],
        summary: "Obter contagem de notificações não lidas",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Contagem de notificações não lidas",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    count: { type: "integer", minimum: 0 }
                  }
                }
              }
            }
          },
          "401": { description: "Não autenticado" }
        }
      }
    },
    "/tags": {
      get: {
        tags: ["Tags"],
        summary: "Listar todas as tags",
        responses: {
          "200": {
            description: "Lista de tags",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/Tag" }
                }
              }
            }
          }
        }
      },
      post: {
        tags: ["Tags"],
        summary: "Criar tag (INSTRUCTOR/ADMIN)",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string" }
                },
                required: ["name"]
              }
            }
          }
        },
        responses: {
          "201": { description: "Tag criada" },
          "403": { description: "Sem permissão" }
        }
      }
    },
    "/tags/popular": {
      get: {
        tags: ["Tags"],
        summary: "Listar tags populares",
        responses: {
          "200": {
            description: "Lista de tags populares",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: { type: "string" },
                      name: { type: "string" },
                      courseCount: { type: "integer" }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/tags/{tagId}/courses": {
      get: {
        tags: ["Tags"],
        summary: "Listar cursos por tag",
        parameters: [{ name: "tagId", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": {
            description: "Lista de cursos com a tag",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/Course" }
                }
              }
            }
          }
        }
      }
    },
    "/tags/courses/{courseId}": {
      get: {
        tags: ["Tags"],
        summary: "Listar tags de um curso",
        parameters: [{ name: "courseId", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": {
            description: "Lista de tags do curso",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/Tag" }
                }
              }
            }
          }
        }
      },
      post: {
        tags: ["Tags"],
        summary: "Adicionar tag a um curso (INSTRUCTOR/ADMIN)",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "courseId", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  tagId: { type: "string" }
                },
                required: ["tagId"]
              }
            }
          }
        },
        responses: {
          "201": { description: "Tag adicionada ao curso" },
          "403": { description: "Sem permissão" }
        }
      }
    },
    "/tags/courses/{courseId}/{tagId}": {
      delete: {
        tags: ["Tags"],
        summary: "Remover tag de um curso (INSTRUCTOR/ADMIN)",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "courseId", in: "path", required: true, schema: { type: "string" } },
          { name: "tagId", in: "path", required: true, schema: { type: "string" } }
        ],
        responses: {
          "200": { description: "Tag removida do curso" },
          "403": { description: "Sem permissão" }
        }
      }
    },
    "/search/advanced": {
      get: {
        tags: ["Busca"],
        summary: "Busca avançada de cursos",
        parameters: [
          { name: "q", in: "query", schema: { type: "string" }, description: "Termo de busca" },
          { name: "categoryId", in: "query", schema: { type: "string" } },
          { name: "difficulty", in: "query", schema: { type: "string", enum: ["BEGINNER", "INTERMEDIATE", "ADVANCED"] } },
          { name: "minRating", in: "query", schema: { type: "integer", minimum: 1, maximum: 5 } },
          { name: "tags", in: "query", schema: { type: "string" }, description: "IDs de tags separados por vírgula" },
          { name: "status", in: "query", schema: { type: "string", enum: ["DRAFT", "PUBLISHED", "ARCHIVED", "SUSPENDED"] } },
          { name: "instructorId", in: "query", schema: { type: "string" } }
        ],
        responses: {
          "200": {
            description: "Resultados da busca",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/Course" }
                }
              }
            }
          }
        }
      }
    },
    "/search/lessons": {
      get: {
        tags: ["Busca"],
        summary: "Buscar aulas",
        parameters: [
          { name: "q", in: "query", schema: { type: "string" }, required: true, description: "Termo de busca" }
        ],
        responses: {
          "200": {
            description: "Resultados da busca",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/Lesson" }
                }
              }
            }
          }
        }
      }
    },
    "/search/notes": {
      get: {
        tags: ["Busca"],
        summary: "Buscar minhas notas",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "q", in: "query", schema: { type: "string" }, required: true, description: "Termo de busca" }
        ],
        responses: {
          "200": {
            description: "Resultados da busca",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/Note" }
                }
              }
            }
          },
          "401": { description: "Não autenticado" }
        }
      }
    },
    "/search/tags/popular": {
      get: {
        tags: ["Busca"],
        summary: "Obter tags populares para busca",
        responses: {
          "200": {
            description: "Lista de tags populares",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: { type: "string" },
                      name: { type: "string" },
                      courseCount: { type: "integer" }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/search/suggestions": {
      get: {
        tags: ["Busca"],
        summary: "Obter sugestões de busca",
        parameters: [
          { name: "q", in: "query", schema: { type: "string" }, description: "Termo parcial" }
        ],
        responses: {
          "200": {
            description: "Sugestões de busca",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    courses: { type: "array", items: { type: "string" } },
                    tags: { type: "array", items: { type: "string" } }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/learning-paths": {
      get: {
        tags: ["Trilhas de Aprendizado"],
        summary: "Listar trilhas de aprendizado",
        responses: {
          "200": {
            description: "Lista de trilhas",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/LearningPath" }
                }
              }
            }
          }
        }
      },
      post: {
        tags: ["Trilhas de Aprendizado"],
        summary: "Criar trilha de aprendizado (INSTRUCTOR/ADMIN)",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  coverImageUrl: { type: "string" },
                  difficulty: { type: "string", enum: ["BEGINNER", "INTERMEDIATE", "ADVANCED"] },
                  estimatedHours: { type: "integer", minimum: 0 },
                  status: { type: "string", enum: ["DRAFT", "PUBLISHED", "ARCHIVED", "SUSPENDED"] }
                },
                required: ["title"]
              }
            }
          }
        },
        responses: {
          "201": { description: "Trilha criada" },
          "403": { description: "Sem permissão" }
        }
      }
    },
    "/learning-paths/my": {
      get: {
        tags: ["Trilhas de Aprendizado"],
        summary: "Listar minhas trilhas",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Lista de trilhas do usuário",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/LearningPath" }
                }
              }
            }
          },
          "401": { description: "Não autenticado" }
        }
      }
    },
    "/learning-paths/{id}": {
      get: {
        tags: ["Trilhas de Aprendizado"],
        summary: "Obter detalhes de uma trilha",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": {
            description: "Detalhes da trilha",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/LearningPath" }
              }
            }
          },
          "404": { description: "Trilha não encontrada" }
        }
      },
      put: {
        tags: ["Trilhas de Aprendizado"],
        summary: "Atualizar trilha (INSTRUCTOR/ADMIN)",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  coverImageUrl: { type: "string" },
                  difficulty: { type: "string", enum: ["BEGINNER", "INTERMEDIATE", "ADVANCED"] },
                  estimatedHours: { type: "integer", minimum: 0 },
                  status: { type: "string", enum: ["DRAFT", "PUBLISHED", "ARCHIVED", "SUSPENDED"] }
                }
              }
            }
          }
        },
        responses: {
          "200": { description: "Trilha atualizada" },
          "403": { description: "Sem permissão" }
        }
      },
      delete: {
        tags: ["Trilhas de Aprendizado"],
        summary: "Deletar trilha (INSTRUCTOR/ADMIN)",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Trilha deletada" },
          "403": { description: "Sem permissão" }
        }
      }
    },
    "/learning-paths/{id}/progress": {
      get: {
        tags: ["Trilhas de Aprendizado"],
        summary: "Obter progresso em uma trilha",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": {
            description: "Progresso na trilha",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/LearningPathProgress" }
              }
            }
          },
          "401": { description: "Não autenticado" }
        }
      }
    },
    "/learning-paths/{id}/courses": {
      post: {
        tags: ["Trilhas de Aprendizado"],
        summary: "Adicionar curso a uma trilha (INSTRUCTOR/ADMIN)",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  courseId: { type: "string" },
                  order: { type: "integer", minimum: 0 },
                  isRequired: { type: "boolean", default: true }
                },
                required: ["courseId"]
              }
            }
          }
        },
        responses: {
          "201": { description: "Curso adicionado à trilha" },
          "403": { description: "Sem permissão" }
        }
      },
      delete: {
        tags: ["Trilhas de Aprendizado"],
        summary: "Remover curso de uma trilha (INSTRUCTOR/ADMIN)",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
          { name: "courseId", in: "query", required: true, schema: { type: "string" } }
        ],
        responses: {
          "200": { description: "Curso removido da trilha" },
          "403": { description: "Sem permissão" }
        }
      }
    },
    "/learning-paths/{id}/enroll": {
      post: {
        tags: ["Trilhas de Aprendizado"],
        summary: "Inscrever-se em uma trilha",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "201": { description: "Inscrito na trilha com sucesso" },
          "400": { description: "Já inscrito ou trilha não publicada" },
          "401": { description: "Não autenticado" }
        }
      }
    },
    "/messages": {
      post: {
        tags: ["Mensagens"],
        summary: "Enviar mensagem direta",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  receiverId: { type: "string" },
                  content: { type: "string" }
                },
                required: ["receiverId", "content"]
              }
            }
          }
        },
        responses: {
          "201": {
            description: "Mensagem enviada",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Message" }
              }
            }
          },
          "400": { description: "Não pode enviar mensagem para si mesmo" },
          "401": { description: "Não autenticado" }
        }
      }
    },
    "/messages/conversations": {
      get: {
        tags: ["Mensagens"],
        summary: "Listar conversas",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Lista de conversas",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      userId: { type: "string" },
                      user: { $ref: "#/components/schemas/User" },
                      lastMessage: { $ref: "#/components/schemas/Message" },
                      unreadCount: { type: "integer", minimum: 0 }
                    }
                  }
                }
              }
            }
          },
          "401": { description: "Não autenticado" }
        }
      }
    },
    "/messages/conversations/{userId}": {
      get: {
        tags: ["Mensagens"],
        summary: "Obter mensagens de uma conversa",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "userId", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": {
            description: "Lista de mensagens",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    messages: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Message" }
                    }
                  }
                }
              }
            }
          },
          "401": { description: "Não autenticado" }
        }
      },
      put: {
        tags: ["Mensagens"],
        summary: "Marcar conversa como lida",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "userId", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Conversa marcada como lida" },
          "401": { description: "Não autenticado" }
        }
      }
    },
    "/messages/{id}": {
      put: {
        tags: ["Mensagens"],
        summary: "Marcar mensagem como lida",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Mensagem marcada como lida" },
          "401": { description: "Não autenticado" }
        }
      },
      delete: {
        tags: ["Mensagens"],
        summary: "Deletar mensagem",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Mensagem deletada" },
          "403": { description: "Sem permissão" },
          "401": { description: "Não autenticado" }
        }
      }
    },
    "/messages/unread-count": {
      get: {
        tags: ["Mensagens"],
        summary: "Obter contagem de mensagens não lidas",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Contagem de mensagens não lidas",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    count: { type: "integer", minimum: 0 }
                  }
                }
              }
            }
          },
          "401": { description: "Não autenticado" }
        }
      }
    },
    "/instructor/dashboard/stats": {
      get: {
        tags: ["Instrutor"],
        summary: "Obter estatísticas do dashboard do instrutor (INSTRUCTOR/ADMIN)",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Estatísticas do dashboard",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    totalCourses: { type: "integer" },
                    totalStudents: { type: "integer" },
                    totalEnrollments: { type: "integer" },
                    averageRating: { type: "number" },
                    recentEnrollments: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          courseTitle: { type: "string" },
                          studentName: { type: "string" },
                          enrolledAt: { type: "string", format: "date-time" }
                        }
                      }
                    },
                    enrollmentTrends: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          month: { type: "string" },
                          count: { type: "integer" }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          "403": { description: "Apenas INSTRUCTOR/ADMIN" }
        }
      }
    },
    "/lessons/{id}/attachments": {
      get: {
        tags: ["Aulas"],
        summary: "Listar anexos de uma aula",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": {
            description: "Lista de anexos",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/LessonAttachment" }
                }
              }
            }
          },
          "401": { description: "Não autenticado" }
        }
      },
      post: {
        tags: ["Aulas"],
        summary: "Adicionar anexo a uma aula (INSTRUCTOR/ADMIN)",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  description: { type: "string" },
                  fileUrl: { type: "string" },
                  fileType: { type: "string", enum: ["PDF", "ZIP", "VIDEO", "LINK", "DOCUMENT", "IMAGE", "OTHER"] },
                  fileSize: { type: "integer", minimum: 0 },
                  category: { type: "string", enum: ["EXERCISE", "REFERENCE", "TEMPLATE", "SLIDES", "CODE", "OTHER"] },
                  order: { type: "integer", minimum: 0 },
                  thumbnailUrl: { type: "string" }
                },
                required: ["name", "fileUrl", "fileType"]
              }
            }
          }
        },
        responses: {
          "201": { description: "Anexo adicionado" },
          "403": { description: "Sem permissão" }
        }
      }
    },
    "/lessons/attachments/{attachmentId}": {
      put: {
        tags: ["Aulas"],
        summary: "Atualizar anexo (INSTRUCTOR/ADMIN)",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "attachmentId", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  description: { type: "string" },
                  fileUrl: { type: "string" },
                  fileType: { type: "string", enum: ["PDF", "ZIP", "VIDEO", "LINK", "DOCUMENT", "IMAGE", "OTHER"] },
                  fileSize: { type: "integer", minimum: 0 },
                  category: { type: "string", enum: ["EXERCISE", "REFERENCE", "TEMPLATE", "SLIDES", "CODE", "OTHER"] },
                  order: { type: "integer", minimum: 0 },
                  thumbnailUrl: { type: "string" }
                }
              }
            }
          }
        },
        responses: {
          "200": { description: "Anexo atualizado" },
          "403": { description: "Sem permissão" }
        }
      },
      delete: {
        tags: ["Aulas"],
        summary: "Deletar anexo (INSTRUCTOR/ADMIN)",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "attachmentId", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Anexo deletado" },
          "403": { description: "Sem permissão" }
        }
      }
    },
    "/lessons/attachments/{attachmentId}/download": {
      post: {
        tags: ["Aulas"],
        summary: "Registrar download de anexo",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "attachmentId", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Download registrado" },
          "401": { description: "Não autenticado" }
        }
      }
    }
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Token JWT obtido através do endpoint /auth/login"
      }
    },
    schemas: {
      User: {
        type: "object",
        properties: {
          id: { type: "string", description: "ID único do usuário" },
          name: { type: "string", description: "Nome completo do usuário" },
          email: { type: "string", format: "email", description: "Email do usuário" },
          role: { 
            type: "string", 
            enum: ["ADMIN", "INSTRUCTOR", "STUDENT"],
            description: "Papel do usuário no sistema"
          },
          avatarUrl: { 
            type: "string", 
            nullable: true,
            description: "URL do avatar do usuário" 
          },
          createdAt: { 
            type: "string", 
            format: "date-time",
            description: "Data de criação do usuário"
          },
          updatedAt: { 
            type: "string", 
            format: "date-time",
            description: "Data da última atualização"
          }
        },
        required: ["id", "name", "email", "role"]
      },
      Course: {
        type: "object",
        properties: {
          id: { type: "string", description: "ID único do curso" },
          title: { type: "string", description: "Título do curso" },
          description: { 
            type: "string", 
            nullable: true,
            description: "Descrição detalhada do curso" 
          },
          coverImageUrl: { 
            type: "string", 
            nullable: true,
            description: "URL da imagem de capa do curso" 
          },
          durationHours: { 
            type: "integer", 
            description: "Carga horária do curso em horas",
            minimum: 0
          },
          difficulty: { 
            type: "string", 
            enum: ["BEGINNER", "INTERMEDIATE", "ADVANCED"],
            description: "Nível de dificuldade do curso"
          },
          status: { 
            type: "string", 
            enum: ["DRAFT", "PUBLISHED", "ARCHIVED", "SUSPENDED"],
            description: "Status de publicação do curso"
          },
          instructorId: { type: "string", description: "ID do instrutor responsável" },
          categoryId: { 
            type: "string", 
            nullable: true,
            description: "ID da categoria do curso" 
          },
          instructor: { 
            $ref: "#/components/schemas/User",
            description: "Dados do instrutor"
          },
          category: {
            $ref: "#/components/schemas/CourseCategory",
            nullable: true,
            description: "Categoria do curso"
          },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" }
        },
        required: ["id", "title", "durationHours", "difficulty", "status", "instructorId"]
      },
      CourseCategory: {
        type: "object",
        properties: {
          id: { type: "string", description: "ID único da categoria" },
          name: { type: "string", description: "Nome da categoria", uniqueItems: true },
          description: { 
            type: "string", 
            nullable: true,
            description: "Descrição da categoria" 
          },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" }
        },
        required: ["id", "name"]
      },
      Module: {
        type: "object",
        properties: {
          id: { type: "string", description: "ID único do módulo" },
          title: { type: "string", description: "Título do módulo" },
          description: { 
            type: "string", 
            nullable: true,
            description: "Descrição do módulo" 
          },
          order: { 
            type: "integer", 
            description: "Ordem de exibição do módulo",
            minimum: 0,
            default: 0
          },
          courseId: { type: "string", description: "ID do curso ao qual pertence" },
          lessons: {
            type: "array",
            items: { $ref: "#/components/schemas/Lesson" },
            description: "Lista de aulas do módulo"
          },
          quiz: {
            $ref: "#/components/schemas/Quiz",
            nullable: true,
            description: "Quiz do módulo (se existir)"
          },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" }
        },
        required: ["id", "title", "order", "courseId"]
      },
      Lesson: {
        type: "object",
        properties: {
          id: { type: "string", description: "ID único da aula" },
          title: { type: "string", description: "Título da aula" },
          description: { 
            type: "string", 
            nullable: true,
            description: "Descrição da aula" 
          },
          videoUrl: { 
            type: "string", 
            nullable: true,
            format: "uri",
            description: "URL do vídeo (YouTube/Vimeo)" 
          },
          durationMinutes: { 
            type: "integer", 
            description: "Duração da aula em minutos",
            minimum: 0,
            default: 0
          },
          order: { 
            type: "integer", 
            description: "Ordem de exibição da aula",
            minimum: 0,
            default: 0
          },
          moduleId: { type: "string", description: "ID do módulo ao qual pertence" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" }
        },
        required: ["id", "title", "moduleId"]
      },
      Enrollment: {
        type: "object",
        properties: {
          id: { type: "string", description: "ID único da matrícula" },
          userId: { type: "string", description: "ID do usuário matriculado" },
          courseId: { type: "string", description: "ID do curso" },
          enrolledAt: { 
            type: "string", 
            format: "date-time",
            description: "Data da matrícula"
          },
          user: { 
            $ref: "#/components/schemas/User",
            description: "Dados do usuário"
          },
          course: { 
            $ref: "#/components/schemas/Course",
            description: "Dados do curso"
          }
        },
        required: ["id", "userId", "courseId", "enrolledAt"]
      },
      UserProgress: {
        type: "object",
        properties: {
          id: { type: "string", description: "ID único do registro de progresso" },
          userId: { type: "string", description: "ID do usuário" },
          lessonId: { type: "string", description: "ID da aula" },
          completed: { 
            type: "boolean", 
            description: "Se a aula foi marcada como concluída",
            default: false
          },
          completedAt: { 
            type: "string", 
            format: "date-time",
            nullable: true,
            description: "Data de conclusão da aula"
          },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" }
        },
        required: ["id", "userId", "lessonId", "completed"]
      },
      CourseProgress: {
        type: "object",
        properties: {
          totalLessons: { 
            type: "integer", 
            description: "Total de aulas do curso",
            minimum: 0
          },
          completedLessons: { 
            type: "integer", 
            description: "Número de aulas concluídas",
            minimum: 0
          },
          progressPercentage: { 
            type: "number", 
            description: "Percentual de conclusão do curso",
            minimum: 0,
            maximum: 100
          },
          lessons: {
            type: "array",
            items: { $ref: "#/components/schemas/LessonProgress" },
            description: "Lista de progresso por aula"
          }
        },
        required: ["totalLessons", "completedLessons", "progressPercentage", "lessons"]
      },
      LessonProgress: {
        type: "object",
        properties: {
          lessonId: { type: "string", description: "ID da aula" },
          completed: { 
            type: "boolean", 
            description: "Se a aula foi concluída"
          },
          completedAt: { 
            type: "string", 
            format: "date-time",
            nullable: true,
            description: "Data de conclusão"
          }
        },
        required: ["lessonId", "completed"]
      },
      LessonComment: {
        type: "object",
        properties: {
          id: { type: "string", description: "ID único do comentário" },
          content: { type: "string", description: "Conteúdo do comentário" },
          parentId: { 
            type: "string", 
            nullable: true,
            description: "ID do comentário pai (se for resposta)" 
          },
          userId: { type: "string", description: "ID do usuário autor" },
          lessonId: { type: "string", description: "ID da aula" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
          user: { 
            $ref: "#/components/schemas/User",
            description: "Dados do autor"
          },
          replies: {
            type: "array",
            items: { $ref: "#/components/schemas/LessonComment" },
            description: "Respostas ao comentário"
          }
        },
        required: ["id", "content", "userId", "lessonId"]
      },
      Quiz: {
        type: "object",
        properties: {
          id: { type: "string", description: "ID único do quiz" },
          title: { type: "string", description: "Título do quiz" },
          description: { 
            type: "string", 
            nullable: true,
            description: "Descrição do quiz" 
          },
          passingScore: { 
            type: "integer", 
            description: "Nota mínima para aprovação (0-100)",
            minimum: 0,
            maximum: 100,
            default: 70
          },
          moduleId: { 
            type: "string", 
            description: "ID do módulo ao qual pertence",
            uniqueItems: true
          },
          questions: {
            type: "array",
            items: { $ref: "#/components/schemas/QuizQuestion" },
            description: "Lista de questões do quiz"
          },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" }
        },
        required: ["id", "title", "passingScore", "moduleId"]
      },
      QuizQuestion: {
        type: "object",
        properties: {
          id: { type: "string", description: "ID único da questão" },
          question: { type: "string", description: "Texto da pergunta" },
          type: { 
            type: "string", 
            enum: ["MULTIPLE_CHOICE"],
            description: "Tipo da questão",
            default: "MULTIPLE_CHOICE"
          },
          options: { 
            type: "array",
            items: { type: "string" },
            description: "Opções de resposta",
            minItems: 2
          },
          correctAnswer: { 
            type: "integer", 
            description: "Índice da resposta correta (0-based)",
            minimum: 0
          },
          order: { 
            type: "integer", 
            description: "Ordem da questão",
            minimum: 0,
            default: 0
          },
          quizId: { type: "string", description: "ID do quiz" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" }
        },
        required: ["id", "question", "type", "options", "correctAnswer", "quizId"]
      },
      QuizAttempt: {
        type: "object",
        properties: {
          id: { type: "string", description: "ID único da tentativa" },
          userId: { type: "string", description: "ID do usuário" },
          quizId: { type: "string", description: "ID do quiz" },
          answers: { 
            type: "object",
            additionalProperties: { type: "integer" },
            description: "Respostas do usuário: { questionId: answerIndex }"
          },
          score: { 
            type: "integer", 
            description: "Nota obtida (0-100)",
            minimum: 0,
            maximum: 100
          },
          passed: { 
            type: "boolean", 
            description: "Se a tentativa foi aprovada"
          },
          completedAt: { 
            type: "string", 
            format: "date-time",
            description: "Data de conclusão da tentativa"
          }
        },
        required: ["id", "userId", "quizId", "answers", "score", "passed", "completedAt"]
      },
      Certificate: {
        type: "object",
        properties: {
          id: { type: "string", description: "ID único do certificado" },
          pdfUrl: { 
            type: "string", 
            format: "uri",
            description: "URL do arquivo PDF do certificado" 
          },
          userId: { type: "string", description: "ID do usuário" },
          courseId: { type: "string", description: "ID do curso" },
          issuedAt: { 
            type: "string", 
            format: "date-time",
            description: "Data de emissão do certificado"
          },
          course: {
            type: "object",
            properties: {
              id: { type: "string" },
              title: { type: "string" },
              coverImageUrl: { type: "string", nullable: true }
            },
            description: "Dados básicos do curso"
          }
        },
        required: ["id", "pdfUrl", "userId", "courseId", "issuedAt"]
      },
      ActivityLog: {
        type: "object",
        properties: {
          id: { type: "string", description: "ID único do log" },
          action: { 
            type: "string",
            enum: [
              "COURSE_CREATED", "COURSE_UPDATED", "COURSE_DELETED",
              "LESSON_CREATED", "LESSON_UPDATED", "LESSON_DELETED",
              "MODULE_CREATED", "MODULE_UPDATED", "MODULE_DELETED",
              "USER_CREATED", "USER_UPDATED", "USER_DELETED",
              "ENROLLMENT_CREATED", "ENROLLMENT_DELETED",
              "QUIZ_CREATED", "QUIZ_UPDATED", "QUIZ_DELETED",
              "CERTIFICATE_GENERATED"
            ],
            description: "Tipo de ação registrada"
          },
          description: { 
            type: "string", 
            nullable: true,
            description: "Descrição detalhada da atividade" 
          },
          resourceId: { 
            type: "string", 
            nullable: true,
            description: "ID do recurso relacionado" 
          },
          resourceType: { 
            type: "string",
            enum: ["COURSE", "LESSON", "MODULE", "USER", "ENROLLMENT", "QUIZ", "CERTIFICATE"],
            nullable: true,
            description: "Tipo do recurso relacionado" 
          },
          userId: { 
            type: "string", 
            nullable: true,
            description: "ID do usuário que realizou a ação" 
          },
          createdAt: { 
            type: "string", 
            format: "date-time",
            description: "Data e hora da atividade"
          },
          user: {
            $ref: "#/components/schemas/User",
            nullable: true,
            description: "Dados do usuário que realizou a ação"
          }
        },
        required: ["id", "action", "createdAt"]
      },
      Error: {
        type: "object",
        properties: {
          error: { 
            type: "string", 
            description: "Mensagem de erro descritiva" 
          }
        },
        required: ["error"]
      },
      AuthResponse: {
        type: "object",
        properties: {
          token: { 
            type: "string", 
            description: "Token JWT para autenticação" 
          },
          user: { 
            $ref: "#/components/schemas/User",
            description: "Dados do usuário autenticado"
          }
        },
        required: ["token", "user"]
      },
      Pagination: {
        type: "object",
        properties: {
          page: { 
            type: "integer", 
            description: "Página atual",
            minimum: 1
          },
          limit: { 
            type: "integer", 
            description: "Itens por página",
            minimum: 1
          },
          total: { 
            type: "integer", 
            description: "Total de itens",
            minimum: 0
          },
          totalPages: { 
            type: "integer", 
            description: "Total de páginas",
            minimum: 0
          }
        },
        required: ["page", "limit", "total", "totalPages"]
      },
      Favorite: {
        type: "object",
        properties: {
          id: { type: "string", description: "ID único do favorito" },
          userId: { type: "string", description: "ID do usuário" },
          courseId: { type: "string", description: "ID do curso" },
          createdAt: { type: "string", format: "date-time" },
          course: { $ref: "#/components/schemas/Course", description: "Dados do curso" }
        },
        required: ["id", "userId", "courseId", "createdAt"]
      },
      Note: {
        type: "object",
        properties: {
          id: { type: "string", description: "ID único da nota" },
          content: { type: "string", description: "Conteúdo da nota" },
          userId: { type: "string", description: "ID do usuário" },
          lessonId: { type: "string", description: "ID da aula" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
          lesson: {
            type: "object",
            properties: {
              id: { type: "string" },
              title: { type: "string" }
            },
            description: "Dados básicos da aula"
          }
        },
        required: ["id", "content", "userId", "lessonId"]
      },
      CourseReview: {
        type: "object",
        properties: {
          id: { type: "string", description: "ID único da avaliação" },
          rating: { 
            type: "integer", 
            description: "Avaliação em estrelas (1-5)",
            minimum: 1,
            maximum: 5
          },
          comment: { 
            type: "string", 
            nullable: true,
            description: "Comentário da avaliação" 
          },
          userId: { type: "string", description: "ID do usuário" },
          courseId: { type: "string", description: "ID do curso" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
          user: { 
            $ref: "#/components/schemas/User",
            description: "Dados do usuário que avaliou"
          },
          course: {
            type: "object",
            properties: {
              id: { type: "string" },
              title: { type: "string" }
            },
            description: "Dados básicos do curso"
          }
        },
        required: ["id", "rating", "userId", "courseId"]
      },
      Notification: {
        type: "object",
        properties: {
          id: { type: "string", description: "ID único da notificação" },
          title: { type: "string", description: "Título da notificação" },
          message: { type: "string", description: "Mensagem da notificação" },
          type: { 
            type: "string", 
            enum: ["INFO", "SUCCESS", "WARNING", "ERROR"],
            description: "Tipo da notificação"
          },
          read: { 
            type: "boolean", 
            description: "Se a notificação foi lida",
            default: false
          },
          userId: { type: "string", description: "ID do usuário" },
          createdAt: { type: "string", format: "date-time" }
        },
        required: ["id", "title", "message", "type", "userId", "createdAt"]
      },
      Tag: {
        type: "object",
        properties: {
          id: { type: "string", description: "ID único da tag" },
          name: { type: "string", description: "Nome da tag", uniqueItems: true },
          createdAt: { type: "string", format: "date-time" }
        },
        required: ["id", "name"]
      },
      Message: {
        type: "object",
        properties: {
          id: { type: "string", description: "ID único da mensagem" },
          content: { type: "string", description: "Conteúdo da mensagem" },
          senderId: { type: "string", description: "ID do remetente" },
          receiverId: { type: "string", description: "ID do destinatário" },
          read: { 
            type: "boolean", 
            description: "Se a mensagem foi lida",
            default: false
          },
          createdAt: { type: "string", format: "date-time" },
          sender: { 
            $ref: "#/components/schemas/User",
            description: "Dados do remetente"
          },
          receiver: { 
            $ref: "#/components/schemas/User",
            description: "Dados do destinatário"
          }
        },
        required: ["id", "content", "senderId", "receiverId", "createdAt"]
      },
      LearningPath: {
        type: "object",
        properties: {
          id: { type: "string", description: "ID único da trilha" },
          title: { type: "string", description: "Título da trilha" },
          description: { 
            type: "string", 
            nullable: true,
            description: "Descrição da trilha" 
          },
          coverImageUrl: { 
            type: "string", 
            nullable: true,
            description: "URL da imagem de capa" 
          },
          difficulty: { 
            type: "string", 
            enum: ["BEGINNER", "INTERMEDIATE", "ADVANCED"],
            description: "Nível de dificuldade",
            default: "BEGINNER"
          },
          estimatedHours: { 
            type: "integer", 
            description: "Horas estimadas",
            minimum: 0,
            default: 0
          },
          status: { 
            type: "string", 
            enum: ["DRAFT", "PUBLISHED", "ARCHIVED", "SUSPENDED"],
            description: "Status da trilha",
            default: "DRAFT"
          },
          instructorId: { type: "string", description: "ID do instrutor" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
          instructor: { 
            $ref: "#/components/schemas/User",
            description: "Dados do instrutor"
          },
          pathCourses: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                courseId: { type: "string" },
                order: { type: "integer" },
                isRequired: { type: "boolean" },
                course: { $ref: "#/components/schemas/Course" }
              }
            },
            description: "Cursos da trilha"
          }
        },
        required: ["id", "title", "difficulty", "status", "instructorId"]
      },
      LearningPathProgress: {
        type: "object",
        properties: {
          completedCourses: { 
            type: "integer", 
            description: "Cursos concluídos",
            minimum: 0
          },
          totalCourses: { 
            type: "integer", 
            description: "Total de cursos",
            minimum: 0
          },
          progressPercentage: { 
            type: "integer", 
            description: "Percentual de progresso",
            minimum: 0,
            maximum: 100
          },
          isCompleted: { 
            type: "boolean", 
            description: "Se a trilha foi completada"
          },
          enrolledAt: { type: "string", format: "date-time" },
          completedAt: { 
            type: "string", 
            format: "date-time",
            nullable: true
          }
        },
        required: ["completedCourses", "totalCourses", "progressPercentage", "isCompleted"]
      },
      LessonAttachment: {
        type: "object",
        properties: {
          id: { type: "string", description: "ID único do anexo" },
          name: { type: "string", description: "Nome do anexo" },
          description: { 
            type: "string", 
            nullable: true,
            description: "Descrição do material" 
          },
          fileUrl: { 
            type: "string", 
            format: "uri",
            description: "URL do arquivo" 
          },
          fileType: { 
            type: "string", 
            enum: ["PDF", "ZIP", "VIDEO", "LINK", "DOCUMENT", "IMAGE", "OTHER"],
            description: "Tipo do arquivo"
          },
          fileSize: { 
            type: "integer", 
            nullable: true,
            description: "Tamanho em bytes",
            minimum: 0
          },
          category: { 
            type: "string", 
            nullable: true,
            enum: ["EXERCISE", "REFERENCE", "TEMPLATE", "SLIDES", "CODE", "OTHER"],
            description: "Categoria do material" 
          },
          order: { 
            type: "integer", 
            description: "Ordem de exibição",
            minimum: 0,
            default: 0
          },
          thumbnailUrl: { 
            type: "string", 
            nullable: true,
            description: "URL da miniatura/preview" 
          },
          downloadCount: { 
            type: "integer", 
            description: "Contador de downloads",
            minimum: 0,
            default: 0
          },
          lessonId: { type: "string", description: "ID da aula" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" }
        },
        required: ["id", "name", "fileUrl", "fileType", "lessonId"]
      }
    }
  }
} as const;


