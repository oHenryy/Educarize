export const openApiSpec = {
  openapi: "3.0.0",
  info: {
    title: "Educarize LMS API",
    version: "0.1.0",
    description: "API do LMS Educarize (autenticação e módulos principais)."
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
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  email: { type: "string", format: "email" },
                  password: { type: "string", format: "password" },
                  role: {
                    type: "string",
                    enum: ["ADMIN", "INSTRUCTOR", "STUDENT"]
                  }
                },
                required: ["name", "email", "password"]
              }
            }
          }
        },
        responses: {
          "201": {
            description: "Usuário criado com sucesso"
          },
          "400": {
            description: "Dados inválidos"
          },
          "409": {
            description: "Email já cadastrado"
          }
        }
      }
    },
    "/auth/login": {
      post: {
        tags: ["Autenticação"],
        summary: "Login com email e senha",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  email: { type: "string", format: "email" },
                  password: { type: "string", format: "password" }
                },
                required: ["email", "password"]
              }
            }
          }
        },
        responses: {
          "200": {
            description: "Login bem-sucedido"
          },
          "401": {
            description: "Credenciais inválidas"
          }
        }
      }
    },
    "/auth/me": {
      get: {
        tags: ["Autenticação"],
        summary: "Dados do usuário autenticado",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Dados do usuário"
          },
          "401": {
            description: "Não autenticado"
          }
        }
      }
    },
    "/courses": {
      get: {
        tags: ["Cursos"],
        summary: "Listar cursos",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "categoryId", in: "query", schema: { type: "string" } },
          { name: "difficulty", in: "query", schema: { type: "string", enum: ["BEGINNER", "INTERMEDIATE", "ADVANCED"] } },
          { name: "status", in: "query", schema: { type: "string", enum: ["DRAFT", "PUBLISHED", "ARCHIVED", "SUSPENDED"] } },
          { name: "search", in: "query", schema: { type: "string" } }
        ],
        responses: {
          "200": { description: "Lista de cursos" }
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
    }
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT"
      }
    }
  }
} as const;


