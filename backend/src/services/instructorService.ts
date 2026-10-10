import { prisma } from "../config/database";

export class InstructorService {
  async getDashboardStats(instructorId: string) {
    const [
      totalCourses,
      publishedCourses,
      totalEnrollments,
      totalStudents,
      totalLessons,
      totalQuizzes,
      totalComments,
      totalCertificates,
      courses,
      enrollmentsOverTime,
      completionRates,
      quizPerformance,
      topStudents,
      recentEnrollments,
      recentComments,
      averageRatings,
    ] = await Promise.all([
      prisma.course.count({ where: { instructorId } }),
      prisma.course.count({ where: { instructorId, status: "PUBLISHED" } }),
      prisma.enrollment.count({
        where: { course: { instructorId } },
      }),
      prisma.user.count({
        where: { enrollments: { some: { course: { instructorId } } } },
      }),
      prisma.lesson.count({
        where: { module: { course: { instructorId } } },
      }),
      prisma.quiz.count({
        where: { module: { course: { instructorId } } },
      }),
      prisma.lessonComment.count({
        where: { lesson: { module: { course: { instructorId } } } },
      }),
      prisma.certificate.count({
        where: { course: { instructorId } },
      }),
      prisma.course.findMany({
        where: { instructorId },
        include: {
          category: true,
          _count: {
            select: {
              enrollments: true,
              modules: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      this.getEnrollmentsOverTime(instructorId),
      this.getCompletionRates(instructorId),
      this.getQuizPerformance(instructorId),
      this.getTopStudents(instructorId),
      prisma.enrollment.findMany({
        where: { course: { instructorId } },
        take: 10,
        orderBy: { enrolledAt: "desc" },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          course: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      }),
      prisma.lessonComment.findMany({
        where: { lesson: { module: { course: { instructorId } } } },
        take: 10,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: {
              id: true,
              name: true,
            },
          },
          lesson: {
            select: {
              id: true,
              title: true,
              module: {
                select: {
                  course: {
                    select: {
                      id: true,
                      title: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),
      this.getAverageRatings(instructorId),
    ]);

    return {
      totals: {
        courses: totalCourses,
        publishedCourses,
        enrollments: totalEnrollments,
        students: totalStudents,
        lessons: totalLessons,
        quizzes: totalQuizzes,
        comments: totalComments,
        certificates: totalCertificates,
      },
      courses: courses.map((course) => ({
        id: course.id,
        title: course.title,
        status: course.status,
        category: course.category?.name || "Sem categoria",
        enrollments: course._count.enrollments,
        modules: course._count.modules,
        createdAt: course.createdAt,
      })),
      enrollmentsOverTime,
      completionRates,
      quizPerformance,
      topStudents,
      recentEnrollments: recentEnrollments.map((e) => ({
        id: e.id,
        userName: e.user.name,
        userEmail: e.user.email,
        courseTitle: e.course.title,
        enrolledAt: e.enrolledAt,
      })),
      recentComments: recentComments.map((c) => ({
        id: c.id,
        userName: c.user.name,
        courseTitle: c.lesson.module.course.title,
        lessonTitle: c.lesson.title,
        content: c.content.substring(0, 100) + (c.content.length > 100 ? "..." : ""),
        createdAt: c.createdAt,
      })),
      averageRatings,
    };
  }

  private async getEnrollmentsOverTime(instructorId: string) {
    // Datas no fuso do servidor, para as chaves dos dias e das matrículas baterem.
    const dayKey = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - 29);

    // Só as matrículas da janela de 30 dias são lidas.
    const enrollments = await prisma.enrollment.findMany({
      where: { course: { instructorId }, enrolledAt: { gte: start } },
      select: { enrolledAt: true },
    });

    const counts = new Map<string, number>();
    for (const { enrolledAt } of enrollments) {
      const key = dayKey(enrolledAt);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    return Array.from({ length: 30 }, (_, i) => {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      const key = dayKey(day);
      return { date: key, count: counts.get(key) ?? 0 };
    });
  }

  private async getCompletionRates(instructorId: string) {
    const courses = await prisma.course.findMany({
      where: { instructorId },
      select: {
        id: true,
        title: true,
        _count: { select: { enrollments: true } },
        modules: { select: { _count: { select: { lessons: true } } } },
      },
    });

    return Promise.all(
      courses.map(async (course) => {
        const totalLessons = course.modules.reduce((sum, mod) => sum + mod._count.lessons, 0);
        const totalStudents = course._count.enrollments;

        // Curso sem aulas (ou sem alunos) não tem conclusões.
        let completedStudents = 0;
        if (totalLessons > 0 && totalStudents > 0) {
          const perStudent = await prisma.userProgress.groupBy({
            by: ["userId"],
            where: {
              completed: true,
              lesson: { module: { courseId: course.id } },
              user: { enrollments: { some: { courseId: course.id } } },
            },
            _count: { _all: true },
          });
          completedStudents = perStudent.filter((s) => s._count._all >= totalLessons).length;
        }

        return {
          courseId: course.id,
          courseTitle: course.title,
          completionRate: totalStudents > 0 ? Math.round((completedStudents / totalStudents) * 100) : 0,
          totalStudents,
          completedStudents,
        };
      })
    );
  }

  private async getQuizPerformance(instructorId: string) {
    const ofInstructor = { quiz: { module: { course: { instructorId } } } };

    const [quizzes, totals, passed] = await Promise.all([
      prisma.quiz.findMany({
        where: { module: { course: { instructorId } } },
        select: { id: true, title: true, module: { select: { course: { select: { title: true } } } } },
      }),
      prisma.quizAttempt.groupBy({
        by: ["quizId"],
        where: ofInstructor,
        _count: { _all: true },
        _avg: { score: true },
      }),
      prisma.quizAttempt.groupBy({
        by: ["quizId"],
        where: { ...ofInstructor, passed: true },
        _count: { _all: true },
      }),
    ]);

    const totalsByQuiz = new Map(totals.map((t) => [t.quizId, t]));
    const passedByQuiz = new Map(passed.map((p) => [p.quizId, p._count._all]));

    return quizzes.map((quiz) => {
      const total = totalsByQuiz.get(quiz.id)?._count._all ?? 0;
      const passedAttempts = passedByQuiz.get(quiz.id) ?? 0;
      return {
        quizId: quiz.id,
        quizTitle: quiz.title,
        courseTitle: quiz.module.course.title,
        totalAttempts: total,
        passedAttempts,
        failedAttempts: total - passedAttempts,
        averageScore: Math.round(totalsByQuiz.get(quiz.id)?._avg.score ?? 0),
        passRate: total > 0 ? Math.round((passedAttempts / total) * 100) : 0,
      };
    });
  }

  private async getTopStudents(instructorId: string) {
    const ofInstructor = { module: { course: { instructorId } } };

    // Os 10 alunos com mais aulas concluídas nos cursos deste instrutor, calculado no banco.
    const top = await prisma.userProgress.groupBy({
      by: ["userId"],
      where: { completed: true, lesson: ofInstructor },
      _count: { userId: true },
      orderBy: { _count: { userId: "desc" } },
      take: 10,
    });

    if (top.length === 0) return [];
    const userIds = top.map((t) => t.userId);

    const [users, attempts, passedQuizzes] = await Promise.all([
      prisma.user.findMany({
        where: { id: { in: userIds } },
        select: {
          id: true,
          name: true,
          email: true,
          _count: {
            select: {
              enrollments: { where: { course: { instructorId } } },
              certificates: { where: { course: { instructorId } } },
            },
          },
        },
      }),
      prisma.quizAttempt.groupBy({
        by: ["userId"],
        where: { userId: { in: userIds }, quiz: ofInstructor },
        _avg: { score: true },
      }),
      prisma.quizAttempt.groupBy({
        by: ["userId", "quizId"],
        where: { userId: { in: userIds }, passed: true, quiz: ofInstructor },
      }),
    ]);

    const usersById = new Map(users.map((u) => [u.id, u]));
    const avgByUser = new Map(attempts.map((a) => [a.userId, a._avg.score ?? 0]));
    const passedByUser = new Map<string, number>();
    for (const p of passedQuizzes) passedByUser.set(p.userId, (passedByUser.get(p.userId) ?? 0) + 1);

    return top.flatMap((t) => {
      const user = usersById.get(t.userId);
      if (!user) return [];
      return [
        {
          userId: user.id,
          userName: user.name,
          userEmail: user.email,
          coursesEnrolled: user._count.enrollments,
          lessonsCompleted: t._count.userId,
          certificatesEarned: user._count.certificates,
          quizzesPassed: passedByUser.get(user.id) ?? 0,
          averageQuizScore: Math.round(avgByUser.get(user.id) ?? 0),
        },
      ];
    });
  }

  private async getAverageRatings(instructorId: string) {
    const [courses, perCourse, overall] = await Promise.all([
      prisma.course.findMany({ where: { instructorId }, select: { id: true, title: true } }),
      prisma.courseReview.groupBy({
        by: ["courseId"],
        where: { course: { instructorId } },
        _avg: { rating: true },
        _count: { _all: true },
      }),
      // Média geral ponderada por avaliação (cursos sem avaliação não puxam a média para baixo).
      prisma.courseReview.aggregate({
        where: { course: { instructorId } },
        _avg: { rating: true },
      }),
    ]);

    const byCourse = new Map(perCourse.map((c) => [c.courseId, c]));

    return {
      overallAverage: Math.round((overall._avg.rating ?? 0) * 10) / 10,
      byCourse: courses.map((course) => {
        const stats = byCourse.get(course.id);
        return {
          courseId: course.id,
          courseTitle: course.title,
          averageRating: Math.round((stats?._avg.rating ?? 0) * 10) / 10,
          totalReviews: stats?._count._all ?? 0,
        };
      }),
    };
  }
}

