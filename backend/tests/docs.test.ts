import { describe, expect, it } from "vitest";
import { api } from "./helpers";

describe("documentação e cabeçalhos de segurança", () => {
  it("Swagger UI carrega e envia o cabeçalho anti-CSRF e os cookies", async () => {
    const page = await api.get("/docs/");
    expect(page.status).toBe(200);
    const init = await api.get("/docs/swagger-ui-init.js");
    expect(init.text).toMatch(/X-Requested-With/);
    expect(init.text).toMatch(/withCredentials/);
  });

  it("a API responde com os cabeçalhos do helmet", async () => {
    const res = await api.get("/health");
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["content-security-policy"]).toBeTruthy();
  });

  it("CORS só libera o frontend configurado, com credenciais", async () => {
    const allowed = await api.get("/health").set("Origin", "http://localhost:5173");
    expect(allowed.headers["access-control-allow-origin"]).toBe("http://localhost:5173");
    expect(allowed.headers["access-control-allow-credentials"]).toBe("true");
    const other = await api.get("/health").set("Origin", "https://site-malicioso.com");
    expect(other.headers["access-control-allow-origin"]).not.toBe("https://site-malicioso.com");
  });
});
