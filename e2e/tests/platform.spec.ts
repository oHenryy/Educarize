import fs from "fs";
import { expect, test } from "@playwright/test";
import { apiAs, lastEmailTo, linkPathFromEmail, login, newSession, register, runtimeProblems, Session } from "./support";

const uid = Date.now().toString().slice(-6);
const courseTitle = `Curso E2E ${uid}`;

let ana: Session;   // instrutora autora
let bia: Session;   // aluna
let caio: Session;  // outro instrutor
let admin: Session;
let courseId: string;

test.describe.serial("Educarize de ponta a ponta", () => {
  test.beforeAll(async ({ browser }) => {
    ana = await newSession(browser, "ana");
    bia = await newSession(browser, "bia");
    caio = await newSession(browser, "caio");
    admin = await newSession(browser, "admin");
  });

  test("cadastro e menus por papel", async ({ browser }) => {
    const anon = await newSession(browser, "anon");
    await anon.page.goto("/register");
    await expect(anon.page.locator("#role option")).toHaveText(["Aluno", "Instrutor"].map((t) => new RegExp(t, "i")));
    expect(await anon.page.$$eval("#role option", (os) => os.map((o) => (o as HTMLOptionElement).value))).toEqual([
      "STUDENT",
      "INSTRUCTOR",
    ]);

    await register(ana, "Ana Instrutora", `ana${uid}@e2e.test`, "INSTRUCTOR");
    await expect(ana.page.getByRole("link", { name: "Meus Cursos" })).toBeVisible();
    await register(bia, "Bia Aluna", `bia${uid}@e2e.test`, "STUDENT");
    await expect(bia.page.getByRole("link", { name: "Meus Cursos" })).toHaveCount(0);
    await register(caio, "Caio Instrutor", `caio${uid}@e2e.test`, "INSTRUCTOR");
    await login(admin, "admin@e2e.test", "admin123");
    await expect(admin.page.getByRole("link", { name: "Usuários" })).toBeVisible();
  });

  test("aluna confirma o e-mail pelo link recebido", async () => {
    const p = bia.page;
    await expect(p.getByText("Confirme seu e-mail pelo link")).toBeVisible();

    const email = lastEmailTo(`bia${uid}@e2e.test`);
    expect(email?.subject).toMatch(/Confirme seu e-mail/);
    await p.goto(linkPathFromEmail(email!.text));
    await expect(p.getByText("E-mail confirmado com sucesso!")).toBeVisible();

    await p.goto("/catalog");
    await expect(p.locator(".catalog")).toBeVisible();
    await expect(p.getByText("Confirme seu e-mail pelo link")).toHaveCount(0);
  });

  test("a sessão fica em cookie httpOnly e é renovada automaticamente", async () => {
    const p = bia.page;
    const storage = await p.evaluate(() => JSON.stringify({ ...localStorage }) + document.cookie);
    expect(storage).not.toMatch(/token/i);

    const cookies = await p.context().cookies();
    const access = cookies.find((c) => c.name === "access_token");
    const refresh = cookies.find((c) => c.name === "refresh_token");
    expect(access?.httpOnly).toBe(true);
    expect(refresh?.httpOnly).toBe(true);
    expect(refresh?.path).toBe("/auth");

    // Simula o access token expirado: a aplicação renova pelo refresh token sem pedir login.
    await p.context().clearCookies({ name: "access_token" });
    await p.goto("/favorites");
    await expect(p).toHaveURL(/\/favorites$/);
    await expect(p.getByRole("link", { name: "Favoritos" })).toBeVisible();
    expect((await p.context().cookies()).some((c) => c.name === "access_token")).toBe(true);
  });

  test("instrutora cria curso em rascunho, invisível para a aluna", async () => {
    const p = ana.page;
    await p.goto("/instructor/courses/new");
    await p.fill("#title", courseTitle);
    await p.fill("#description", "Curso criado pelo teste de ponta a ponta");
    await p.fill("#durationHours", "4");
    await p.click('button[type="submit"]');
    await p.waitForURL(/\/instructor\/courses\/[^/]+\/edit/);
    courseId = p.url().split("/courses/")[1].split("/")[0];

    await p.goto("/instructor/courses");
    await expect(p.getByText(courseTitle)).toBeVisible();

    await bia.page.goto("/catalog");
    await expect(bia.page.locator(".catalog")).toBeVisible();
    await expect(bia.page.getByText(courseTitle)).toHaveCount(0);
    await bia.page.goto(`/course/${courseId}`);
    await expect(bia.page.getByText("Não foi possível carregar o curso")).toBeVisible();
  });

  test("instrutora monta o conteúdo: módulo, aula, quiz e questão", async () => {
    const p = ana.page;
    await p.goto(`/instructor/courses/${courseId}/content`);

    await p.getByRole("button", { name: "+ Novo Módulo" }).click();
    await p.locator('.form-card input[name="title"]').fill("Módulo 1");
    await p.locator(".form-card").getByRole("button", { name: "Criar" }).click();
    await expect(p.locator(".module-card").getByText("Módulo 1")).toBeVisible();

    await p.getByRole("button", { name: "+ Aula" }).click();
    await p.locator('.form-card input[name="title"]').fill("Aula 1");
    await p.locator('.form-card input[name="videoUrl"]').fill("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    await p.locator(".form-card").getByRole("button", { name: "Criar" }).click();
    await expect(p.getByText("Aula criada com sucesso!")).toBeVisible();
    await expect(p.locator(".module-card").getByText("Aula 1")).toBeVisible();

    await p.getByRole("button", { name: "📝 Quiz" }).click();
    await p.locator('.form-card input[name="title"]').fill("Quiz do Módulo 1");
    await p.locator('.form-card input[name="passingScore"]').fill("0");
    await p.locator(".form-card").getByRole("button", { name: "Criar" }).click();
    await expect(p.getByText("Quiz criado com sucesso!")).toBeVisible();
    await expect(p.locator('.form-card input[name="passingScore"]')).toHaveValue("0");

    // Opção 3 em branco: a resposta "Opção 4 (D)" deve virar o índice 2 da lista final.
    await p.getByRole("button", { name: "+ Adicionar Questão" }).click();
    await p.locator('textarea[name="question"]').fill("Qual é a letra D?");
    await p.locator('input[name="option1"]').fill("A");
    await p.locator('input[name="option2"]').fill("B");
    await p.locator('input[name="option4"]').fill("D");
    await p.locator('select[name="correctAnswer"]').selectOption("3");
    await p.locator(".form-card form").last().locator('button[type="submit"]').click();
    await expect(p.getByText("Questão criada com sucesso!")).toBeVisible();
    await expect(p.locator(".question-option-preview.correct").first()).toHaveText(/^C\. D/);
  });

  test("instrutora publica o curso (sem opção de suspender)", async () => {
    const p = ana.page;
    await p.goto(`/instructor/courses/${courseId}/edit`);
    await expect(p.locator("#status")).toBeVisible();
    expect(await p.$$eval("#status option", (os) => os.map((o) => (o as HTMLOptionElement).value))).not.toContain(
      "SUSPENDED"
    );
    await p.selectOption("#status", "PUBLISHED");
    await p.click('button[type="submit"]');
    await p.waitForURL("**/instructor/courses");
    const course = await apiAs<{ status: string }>(ana, "GET", `/courses/${courseId}`);
    expect(course.data.status).toBe("PUBLISHED");
  });

  test("aluna se matricula, assiste, comenta, conclui, faz o quiz e baixa o certificado", async () => {
    const p = bia.page;
    await p.goto(`/course/${courseId}`);
    await p.getByRole("button", { name: "Matricular-se neste curso" }).click();
    await expect(p.getByText("Matriculado com sucesso!")).toBeVisible();
    await expect(p.locator(".video-player iframe")).toHaveAttribute("src", "https://www.youtube.com/embed/dQw4w9WgXcQ");

    await p.fill(".comment-form textarea", "Ótima aula!");
    await p.getByRole("button", { name: "Comentar" }).click();
    await expect(p.locator(".comment-item").getByText("Ótima aula!")).toBeVisible();

    await p.getByRole("button", { name: "Marcar como Concluída" }).click();
    await expect(p.getByRole("button", { name: "✓ Aula Concluída" })).toBeVisible();
    await expect(p.getByText("Certificado Disponível!")).toBeVisible();
    await expect(p.locator(".video-player iframe")).toBeVisible();

    await p.locator(".quiz-option", { hasText: "D" }).click();
    await p.getByRole("button", { name: "Enviar Respostas" }).click();
    await expect(p.getByText("Parabéns! Você passou!")).toBeVisible();

    const [download] = await Promise.all([
      p.waitForEvent("download"),
      p.getByRole("button", { name: "📥 Baixar Certificado" }).click(),
    ]);
    const file = await download.path();
    expect(fs.readFileSync(file!).subarray(0, 4).toString()).toBe("%PDF");

    const certs = await apiAs<unknown[]>(bia, "GET", "/certificates/my");
    expect(certs.data).toHaveLength(1);

    await p.goto(`/instructor/courses/${courseId}/content`);
    await p.waitForURL("**/catalog");
  });

  test("outro instrutor precisa se matricular no curso alheio", async () => {
    const p = caio.page;
    await p.goto("/catalog");
    const card = p.locator(".course-card", { hasText: courseTitle });
    await expect(card.getByRole("button", { name: "Matricular-se" })).toBeVisible();
    await p.goto(`/course/${courseId}`);
    await expect(p.getByRole("button", { name: "Matricular-se neste curso" })).toBeVisible();
  });

  test("trilha em rascunho combina cursos de instrutores diferentes e é reordenada", async () => {
    const p = caio.page;
    const own = await apiAs<{ id: string }>(caio, "POST", "/courses", { title: `Curso do Caio ${uid}` });
    await apiAs(caio, "PUT", `/courses/${own.data.id}`, { status: "PUBLISHED" });

    await p.goto("/instructor/learning-paths/new");
    await p.fill('input[placeholder="Ex: Desenvolvimento Web Completo"]', `Trilha ${uid}`);
    await p.click('button[type="submit"]');
    await p.waitForURL("**/instructor/learning-paths");
    await expect(p.getByText(`Trilha ${uid}`)).toBeVisible();

    await p.locator('a[href^="/instructor/learning-paths/"][href$="/courses"]').first().click();
    await p.waitForURL(/learning-paths\/[^/]+\/courses/);
    const select = p.locator(".add-course-form select");

    await p.getByRole("button", { name: "+ Adicionar Curso" }).click();
    await expect(p.locator("select optgroup")).toHaveCount(2);
    await select.selectOption({ label: `${courseTitle} — Ana Instrutora` });
    await p.getByRole("button", { name: "Adicionar" }).click();
    await expect(p.locator(".courses-section").getByText(courseTitle)).toBeVisible();

    await p.getByRole("button", { name: "+ Adicionar Curso" }).click();
    await select.selectOption({ label: `Curso do Caio ${uid}` });
    await p.getByRole("button", { name: "Adicionar" }).click();
    await expect(p.locator(".courses-section").getByText(`Curso do Caio ${uid}`)).toBeVisible();

    await p.getByRole("button", { name: "↓" }).first().click();
    const pathId = p.url().split("/learning-paths/")[1].split("/")[0];
    await expect
      .poll(async () => {
        const lp = await apiAs<{ courses: { course: { title: string } }[] }>(caio, "GET", `/learning-paths/${pathId}`);
        return lp.data.courses[0].course.title;
      })
      .toBe(`Curso do Caio ${uid}`);
  });

  test("mensagens chegam em tempo real", async () => {
    const anaMe = await apiAs<{ user: { id: string } }>(ana, "GET", "/auth/me");
    await apiAs(bia, "POST", "/messages", { receiverId: anaMe.data.user.id, content: "Olá, professora!" });

    await ana.page.goto("/messages");
    await ana.page.locator(".conversations-sidebar").getByText("Bia Aluna").click();
    await expect(ana.page.locator(".messages-list").getByText("Olá, professora!")).toBeVisible();

    await bia.page.goto("/messages");
    await bia.page.locator(".conversations-sidebar").getByText("Ana Instrutora").click();
    await bia.page.waitForTimeout(800); // aguarda o socket conectar
    // Contador do sino da Ana antes da mensagem (notificações chegam pelo socket, sem polling).
    const badge = ana.page.locator(".notification-badge");
    const unreadBefore = Number((await badge.count()) ? await badge.innerText() : 0);

    await bia.page.fill('input[placeholder="Digite sua mensagem..."]', `Tempo real ${uid}`);
    await bia.page.getByRole("button", { name: "Enviar" }).click();
    await expect(ana.page.locator(".messages-list").getByText(`Tempo real ${uid}`)).toBeVisible();
    // O sino exibe "9+" a partir de 10 não lidas.
    await expect(badge).toHaveText(unreadBefore + 1 > 9 ? "9+" : String(unreadBefore + 1));
  });

  test("busca de usuário no chat consulta o servidor", async () => {
    const p = bia.page;
    await p.getByTitle("Nova conversa").click();
    await p.fill('input[placeholder="Buscar usuário..."]', "Caio");
    await expect(p.locator(".user-list .user-item")).toHaveCount(1);
    await expect(p.locator(".user-list")).toContainText("Caio Instrutor");
    await p.fill('input[placeholder="Buscar usuário..."]', "inexistente-xyz");
    await expect(p.getByText("Nenhum usuário encontrado")).toBeVisible();
  });

  test("admin transfere o conteúdo, exclui a autora e a sessão dela é encerrada", async () => {
    const p = admin.page;
    await p.goto("/admin/users");
    const selfRow = p.locator("tr", { hasText: "(você)" });
    await expect(selfRow.getByRole("button", { name: "Editar Papel" })).toHaveCount(0);

    const anaRow = p.locator("tr", { hasText: `ana${uid}@e2e.test` });
    await expect(anaRow.getByRole("button", { name: "Deletar" })).toBeDisabled();
    await anaRow.getByRole("button", { name: "Transferir Conteúdo" }).click();
    await anaRow.locator("select").selectOption({ label: "Caio Instrutor (INSTRUCTOR)" });
    await anaRow.getByRole("button", { name: "Transferir" }).click();
    await expect(p.getByText("1 curso(s) e 0 trilha(s) transferidos.")).toBeVisible();

    await anaRow.getByRole("button", { name: "Deletar" }).click();
    await expect(p.getByText("Usuário deletado com sucesso!")).toBeVisible();
    await expect(p.locator("tr", { hasText: `ana${uid}@e2e.test` })).toHaveCount(0);

    // A sessão dela recebe 401: os erros de rede esperados dessa sessão não contam como problema.
    const before = runtimeProblems.length;
    await ana.page.goto("/catalog");
    await ana.page.waitForURL("**/login");
    runtimeProblems.splice(before);
  });

  test("papel atualizado aparece sem novo login", async () => {
    const caioMe = await apiAs<{ user: { id: string } }>(caio, "GET", "/auth/me");
    const res = await apiAs(admin, "PUT", `/admin/users/${caioMe.data.user.id}/role`, { role: "ADMIN" });
    expect(res.status).toBe(200);
    await caio.page.goto("/catalog");
    await expect(caio.page.getByRole("link", { name: "Usuários" })).toBeVisible();
  });

  test("logout encerra a sessão e a senha pode ser recuperada por e-mail", async () => {
    const p = bia.page;
    await p.getByRole("button", { name: "Sair" }).click();
    await p.waitForURL("**/login");
    expect((await apiAs(bia, "GET", "/auth/me")).status).toBe(401);
    await p.goto("/catalog");
    await p.waitForURL("**/login");

    await p.getByRole("link", { name: "Esqueci minha senha" }).click();
    // A tela de login também tem #email: espera a navegação terminar antes de preencher.
    await expect(p.getByRole("heading", { name: "Esqueci minha senha" })).toBeVisible();
    await p.fill("#email", `bia${uid}@e2e.test`);
    await p.getByRole("button", { name: "Enviar link" }).click();
    await expect(p.getByText("Se o e-mail estiver cadastrado")).toBeVisible();

    const email = lastEmailTo(`bia${uid}@e2e.test`);
    expect(email?.subject).toMatch(/Redefinição de senha/);
    await p.goto(linkPathFromEmail(email!.text));
    await expect(p.getByRole("heading", { name: "Criar nova senha" })).toBeVisible();
    await p.fill("#password", "novaSenha9");
    await p.fill("#confirmation", "novaSenha9");
    await p.getByRole("button", { name: "Redefinir senha" }).click();
    await expect(p.getByText("Senha redefinida com sucesso.")).toBeVisible();

    await login(bia, `bia${uid}@e2e.test`, "novaSenha9");
    await expect(p.getByRole("link", { name: "Favoritos" })).toBeVisible();
  });

  test("nenhum erro de console ou resposta 5xx durante a navegação", () => {
    expect(runtimeProblems).toEqual([]);
  });
});
