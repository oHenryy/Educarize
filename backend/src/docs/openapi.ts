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


