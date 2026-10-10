import { describe, expect, it } from "vitest";
import { api, auth, createCourse, registerUser } from "./helpers";

async function enrolledStudent() {
  const instructor = await registerUser("INSTRUCTOR");
  const student = await registerUser();
  const { course, lesson } = await createCourse(instructor, { publish: true });
  await api.post("/enrollments").set(auth(student)).send({ courseId: course.id });
  return { instructor, student, course, lesson };
}

const report = (lessonId: string, positionSeconds: number, watchedDeltaSeconds: number, durationSeconds = 600) => ({
  lessonId,
  positionSeconds,
  durationSeconds,
  watchedDeltaSeconds,
});

describe("progresso por vídeo", () => {
  it("soma o tempo assistido, guarda a posição e conclui ao atingir 90%", async () => {
    const { student, lesson, course } = await enrolledStudent();

    // 8 envios de 60s = 480s (80%): ainda não conclui.
    let last;
    for (let i = 1; i <= 8; i++) {
      last = (await api.post("/progress/video").set(auth(student)).send(report(lesson.id, i * 60, 60))).body;
    }
    expect(last).toMatchObject({ watchedSeconds: 480, lastPositionSeconds: 480, completed: false, autoCompleted: false });

    const resume = (await api.get(`/progress/lesson/${lesson.id}`).set(auth(student))).body;
    expect(resume).toMatchObject({ lastPositionSeconds: 480, videoDurationSeconds: 600 });

    // +60s = 540s (90%): conclui automaticamente e o fluxo normal (certificado) roda.
    const done = (await api.post("/progress/video").set(auth(student)).send(report(lesson.id, 540, 60))).body;
    expect(done).toMatchObject({ completed: true, autoCompleted: true, watchedSeconds: 540 });
    expect((await api.get(`/progress/course/${course.id}`).set(auth(student))).body.progressPercentage).toBe(100);
    expect((await api.get("/certificates/my").set(auth(student))).body).toHaveLength(1);

    // Envios seguintes não "concluem de novo".
    const after = (await api.post("/progress/video").set(auth(student)).send(report(lesson.id, 560, 20))).body;
    expect(after).toMatchObject({ completed: true, autoCompleted: false });
  });

  it("pular para o fim não conclui a aula (só conta tempo assistido)", async () => {
    const { student, lesson } = await enrolledStudent();
    const res = (await api.post("/progress/video").set(auth(student)).send(report(lesson.id, 599, 5))).body;
    expect(res).toMatchObject({ watchedSeconds: 5, lastPositionSeconds: 599, completed: false });
  });

  it("o tempo assistido nunca passa da duração e o incremento é limitado", async () => {
    const { student, lesson } = await enrolledStudent();
    for (let i = 0; i < 3; i++) await api.post("/progress/video").set(auth(student)).send(report(lesson.id, 50, 100, 120));
    const row = (await api.get(`/progress/lesson/${lesson.id}`).set(auth(student))).body;
    expect(row.watchedSeconds).toBe(120);

    const tooBig = await api.post("/progress/video").set(auth(student)).send(report(lesson.id, 10, 500));
    expect(tooBig.status).toBe(400);
  });

  it("exige matrícula", async () => {
    const { lesson } = await enrolledStudent();
    const stranger = await registerUser();
    const res = await api.post("/progress/video").set(auth(stranger)).send(report(lesson.id, 10, 10));
    expect(res.status).toBe(403);
  });
});
