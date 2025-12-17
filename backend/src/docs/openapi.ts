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
- Logs de Atividade: Auditoria de ações no sistema`
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
      }
    }
  }
} as const;


