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
let verificationCode: string;

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
    // A renovação pode terminar logo depois de a página aparecer.
    await expect.poll(async () => (await p.context().cookies()).some((c) => c.name === "access_token")).toBe(true);
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
    await p.locator('.form-card input[name="maxAttempts"]').fill("5");
    await p.locator('.form-card input[name="shuffleOptions"]').check();
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
    await p.locator('textarea[name="explanation"]').fill("D é a quarta letra.");
    await p.locator(".form-card form").last().locator('button[type="submit"]').click();
    await expect(p.getByText("Questão criada com sucesso!")).toBeVisible();
    await expect(p.locator(".question-option-preview.correct").first()).toHaveText(/^C\. D/);
  });

  test("instrutora reordena módulos arrastando com o mouse", async () => {
    const p = ana.page;
    const extra = await apiAs<{ id: string }>(ana, "POST", "/modules", { title: "Módulo Extra", courseId, order: 1 });
    await p.goto(`/instructor/courses/${courseId}/content`);
    await expect(p.locator(".module-card h3")).toHaveText(["Módulo 1", "Módulo Extra"]);

    const handle = await p.getByRole("button", { name: "Reordenar Módulo Extra" }).boundingBox();
    const target = await p.locator(".module-card").first().boundingBox();
    await p.mouse.move(handle!.x + handle!.width / 2, handle!.y + handle!.height / 2);
    await p.mouse.down();
    await p.mouse.move(handle!.x + handle!.width / 2, target!.y + 5, { steps: 15 });
    await p.mouse.up();
    await expect(p.locator(".module-card h3")).toHaveText(["Módulo Extra", "Módulo 1"]);

    await expect
      .poll(async () => (await apiAs<{ id: string }[]>(ana, "GET", `/modules/course/${courseId}`)).data[0].id)
      .toBe(extra.data.id);
    await apiAs(ana, "DELETE", `/modules/${extra.data.id}`);
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

    const certs = await apiAs<{ verificationCode: string }[]>(bia, "GET", "/certificates/my");
    expect(certs.data).toHaveLength(1);
    verificationCode = certs.data[0].verificationCode;
    await expect(p.getByRole("link", { name: verificationCode })).toBeVisible();

    await p.goto(`/instructor/courses/${courseId}/content`);
    await p.waitForURL("**/catalog");
  });

  test("instrutora envia capa e material; só quem está matriculado baixa", async () => {
    const png = Buffer.from(
      "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c6360000002000154a24f5d0000000049454e44ae426082",
      "hex"
    );
    const p = ana.page;
    await p.goto(`/instructor/courses/${courseId}/edit`);
    await p.getByLabel("Enviar imagem").setInputFiles({ name: "capa.png", mimeType: "image/png", buffer: png });
    await expect(p.locator(".cover-preview")).toHaveAttribute("src", /\/files\/[a-z0-9]+$/);
    await p.click('button[type="submit"]');
    await p.waitForURL("**/instructor/courses");

    await p.goto(`/course/${courseId}`);
    await p.getByRole("button", { name: "Adicionar Material" }).click();
    await p.getByLabel("Escolher arquivo").setInputFiles({
      name: "Apostila.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4\n%%EOF\n"),
    });
    await expect(p.getByText("✓ Apostila.pdf")).toBeVisible();
    await expect(p.locator(".attachment-form input[type=text]").first()).toHaveValue("Apostila");
    await p.getByRole("button", { name: "Adicionar", exact: true }).click();
    await expect(p.locator(".attachment-item h5", { hasText: "Apostila" })).toBeVisible();

    const course = await apiAs<{ modules: { lessons: { id: string }[] }[] }>(ana, "GET", `/courses/${courseId}`);
    const lessonId = course.data.modules[0].lessons[0].id;
    const [material] = (await apiAs<{ fileUrl: string }[]>(ana, "GET", `/lessons/${lessonId}/attachments`)).data;

    // A aluna matriculada baixa o PDF; sem sessão, o arquivo é negado.
    const fetchFile = (credentials: RequestCredentials) =>
      bia.page.evaluate(
        async ({ url, credentials }) => {
          const res = await fetch(url, { credentials });
          return { status: res.status, start: (await res.text()).slice(0, 5) };
        },
        { url: material.fileUrl, credentials }
      );
    expect(await fetchFile("include")).toEqual({ status: 200, start: "%PDF-" });
    expect((await fetchFile("omit")).status).toBe(401);

    // A capa enviada aparece no catálogo (servida pela API para o frontend, em outra origem).
    await bia.page.goto("/catalog");
    const cover = bia.page.locator('img[src*="/files/"]').first();
    await expect(cover).toBeVisible();
    await expect.poll(() => cover.evaluate((img) => (img as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  });

  test("qualquer pessoa verifica o certificado pelo código, sem login", async ({ browser }) => {
    const visitor = await newSession(browser, "visitante");
    await visitor.page.goto(`/certificates/verify/${verificationCode}`);
    await expect(visitor.page.getByText("✓ Certificado autêntico")).toBeVisible();
    await expect(visitor.page.getByText("Bia Aluna")).toBeVisible();
    await expect(visitor.page.getByText(courseTitle)).toBeVisible();

    await visitor.page.goto("/certificates/verify");
    await visitor.page.fill("#code", "AAAA-BBBB-CCCC");
    await visitor.page.getByRole("button", { name: "Verificar" }).click();
    await expect(visitor.page.getByRole("alert")).toContainText("Certificado não encontrado");
  });

  test("configurações do quiz salvas pelo editor", async () => {
    const course = await apiAs<{ modules: { id: string }[] }>(ana, "GET", `/courses/${courseId}`);
    const quiz = await apiAs<{ maxAttempts: number; shuffleOptions: boolean; questions: { explanation: string }[] }>(
      ana,
      "GET",
      `/quizzes/module/${course.data.modules[0].id}`
    );
    expect(quiz.data).toMatchObject({ maxAttempts: 5, shuffleOptions: true });
    expect(quiz.data.questions[0].explanation).toBe("D é a quarta letra.");
  });

  test("quiz obrigatório: feedback sem gabarito, nova tentativa e certificado após aprovação", async () => {
    // Curso preparado pela API: exige quizzes, nota mínima 100% e 2 tentativas.
    const c = await apiAs<{ id: string }>(ana, "POST", "/courses", { title: `Curso com Quiz ${uid}`, requireQuizzesForCertificate: true });
    const m = await apiAs<{ id: string }>(ana, "POST", "/modules", { title: "Único", courseId: c.data.id });
    const l = await apiAs<{ id: string }>(ana, "POST", "/lessons", { title: "Aula única", moduleId: m.data.id });
    const q = await apiAs<{ id: string }>(ana, "POST", "/quizzes", { moduleId: m.data.id, title: "Prova", passingScore: 100, maxAttempts: 2 });
    await apiAs(ana, "POST", "/quizzes/questions", {
      quizId: q.data.id, question: "Capital do Brasil?", options: ["Rio", "Brasília"], correctAnswer: 1, explanation: "Desde 1960.",
    });
    await apiAs(ana, "PUT", `/courses/${c.data.id}`, { status: "PUBLISHED" });

    const p = bia.page;
    await apiAs(bia, "POST", "/enrollments", { courseId: c.data.id });
    await p.goto(`/course/${c.data.id}`);
    await p.getByRole("button", { name: "Marcar como Concluída" }).click();
    await expect(p.getByText("Aulas concluídas!")).toBeVisible();
    await expect(p.locator(".certificate-section")).toContainText("Prova");

    await p.locator(".quiz-option", { hasText: "Rio" }).click();
    await p.getByRole("button", { name: "Enviar Respostas" }).click();
    await expect(p.getByText("Você não atingiu a nota mínima")).toBeVisible();
    await expect(p.locator(".quiz-feedback li.incorrect")).toBeVisible();
    await expect(p.getByText("Resposta correta:")).toHaveCount(0);
    await expect(p.getByText("Desde 1960.")).toHaveCount(0);

    await p.getByRole("button", { name: "Tentar Novamente (1 restante)" }).click();
    await p.locator(".quiz-option", { hasText: "Brasília" }).click();
    await p.getByRole("button", { name: "Enviar Respostas" }).click();
    await expect(p.getByText("Parabéns! Você passou!")).toBeVisible();
    await expect(p.getByText("Desde 1960.")).toBeVisible();
    await expect(p.getByText("Certificado Disponível!")).toBeVisible();
  });

  test("vídeo: retoma de onde parou e conclui a aula ao assistir 90%", async () => {
    const c = await apiAs<{ id: string }>(ana, "POST", "/courses", { title: `Curso com Vídeo ${uid}` });
    const m = await apiAs<{ id: string }>(ana, "POST", "/modules", { title: "Único", courseId: c.data.id });
    await apiAs(ana, "POST", "/lessons", { title: "Aula em vídeo", moduleId: m.data.id, videoUrl: "https://youtu.be/dQw4w9WgXcQ" });
    await apiAs(ana, "PUT", `/courses/${c.data.id}`, { status: "PUBLISHED" });

    const p = bia.page;
    await apiAs(bia, "POST", "/enrollments", { courseId: c.data.id });
    await p.goto(`/course/${c.data.id}`);
    await expect(p.locator(".video-player iframe")).toBeVisible();
    expect(await p.evaluate(() => (window as unknown as { __fakeYT: { start: number } }).__fakeYT.start)).toBe(0);

    // Assiste até ~8s e pausa: a pausa envia a posição.
    await p.evaluate(() => (window as unknown as { __fakeYT: { play(): void } }).__fakeYT.play());
    await expect
      .poll(() => p.evaluate(() => (window as unknown as { __fakeYT: { time(): number } }).__fakeYT.time()))
      .toBeGreaterThanOrEqual(8);
    const saved = p.waitForResponse((res) => res.url().endsWith("/progress/video") && res.ok());
    await p.evaluate(() => (window as unknown as { __fakeYT: { pause(): void } }).__fakeYT.pause());
    await saved;

    // Ao voltar, o player começa de onde parou.
    await p.reload();
    await expect(p.locator(".video-player iframe")).toBeVisible();
    expect(await p.evaluate(() => (window as unknown as { __fakeYT: { start: number } }).__fakeYT.start)).toBeGreaterThanOrEqual(8);
    await expect(p.getByRole("button", { name: "Marcar como Concluída" })).toBeVisible();

    // Assiste até o fim: a aula é concluída sozinha e o certificado sai.
    await p.evaluate(() => (window as unknown as { __fakeYT: { play(): void } }).__fakeYT.play());
    await expect(p.getByText("Aula concluída: você assistiu ao vídeo.")).toBeVisible({ timeout: 20_000 });
    await expect(p.getByRole("button", { name: "✓ Aula Concluída" })).toBeVisible();
    await expect(p.getByText("Certificado Disponível!")).toBeVisible();
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

    // Reordenação pelo teclado: com a alça em foco, a seta desce o curso uma posição e o foco continua nela.
    // A janela baixa deixa o destino na metade de baixo da tela (o caso que falhou no CI com o sensor do dnd-kit).
    const announcer = p.locator("[data-sortable-announcer]");
    await p.setViewportSize({ width: 1280, height: 480 });
    const handle = p.getByRole("button", { name: `Reordenar ${courseTitle}` });
    await handle.focus();
    await p.keyboard.press("ArrowDown");
    await expect(announcer).toHaveText(`"${courseTitle}" movido para a posição 2 de 2.`);
    await expect(handle).toBeFocused();
    await p.keyboard.press("ArrowDown");
    await expect(announcer).toHaveText(`"${courseTitle}" já está na última posição.`);
    await expect(p.locator(".course-item h4").first()).toHaveText(`Curso do Caio ${uid}`);
    await p.setViewportSize({ width: 1280, height: 720 });
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
    await expect(p.getByText(/\d+ curso\(s\) e 0 trilha\(s\) transferidos\./)).toBeVisible();

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

  test("preferências de notificação por e-mail ficam salvas", async () => {
    const p = bia.page;
    await p.goto("/profile");
    const progress = p.getByRole("checkbox", { name: /Progresso/ });
    const messages = p.getByRole("checkbox", { name: /Mensagens diretas/ });
    await expect(progress).not.toBeChecked();
    await expect(messages).toBeChecked();

    await progress.check();
    await expect(p.getByText("Preferência salva.")).toBeVisible();
    await messages.uncheck();
    await expect(messages).toBeEnabled();

    await p.reload();
    await expect(p.getByRole("checkbox", { name: /Progresso/ })).toBeChecked();
    await expect(p.getByRole("checkbox", { name: /Mensagens diretas/ })).not.toBeChecked();
  });

  test("nenhum erro de console ou resposta 5xx durante a navegação", () => {
    expect(runtimeProblems).toEqual([]);
  });
});
