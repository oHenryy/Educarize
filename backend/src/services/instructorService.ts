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
      prisma.enrollment.findMany({
        where: { course: { instructorId } },
        select: { userId: true },
        distinct: ["userId"],
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
        students: totalStudents.length,
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
    const enrollments = await prisma.enrollment.findMany({
      where: { course: { instructorId } },
      select: { enrolledAt: true },
      orderBy: { enrolledAt: "asc" },
    });

    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      date.setHours(0, 0, 0, 0);
      return date.toISOString().split("T")[0];
    });

    const enrollmentsByDate = enrollments.reduce((acc, enrollment) => {
      const date = new Date(enrollment.enrolledAt).toISOString().split("T")[0];
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return last30Days.map((date) => ({
      date,
      count: enrollmentsByDate[date] || 0,
    }));
  }

  private async getCompletionRates(instructorId: string) {
    const courses = await prisma.course.findMany({
      where: { instructorId },
      include: {
        modules: {
          include: {
            lessons: true,
          },
        },
        enrollments: {
          include: {
            user: {
              include: {
                progress: {
                  where: { completed: true },
                },
              },
            },
          },
        },
      },
    });

    return courses.map((course) => {
      const totalLessons = course.modules.reduce((sum, mod) => sum + mod.lessons.length, 0);
      const enrollments = course.enrollments.length;
      
      if (enrollments === 0) {
        return {
          courseId: course.id,
          courseTitle: course.title,
          completionRate: 0,
          totalStudents: 0,
          completedStudents: 0,
        };
      }

      const completedStudents = course.enrollments.filter((enrollment) => {
        const completedLessons = enrollment.user.progress.filter(
          (p) => course.modules.some((mod) => mod.lessons.some((l) => l.id === p.lessonId))
        ).length;
        return completedLessons === totalLessons;
      }).length;

      return {
        courseId: course.id,
        courseTitle: course.title,
        completionRate: Math.round((completedStudents / enrollments) * 100),
        totalStudents: enrollments,
        completedStudents,
      };
    });
  }

  private async getQuizPerformance(instructorId: string) {
    const quizzes = await prisma.quiz.findMany({
      where: { module: { course: { instructorId } } },
      include: {
        attempts: true,
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
    });

    return quizzes.map((quiz) => {
      const attempts = quiz.attempts;
      const passed = attempts.filter((a) => a.passed).length;
      const total = attempts.length;
      const averageScore =
        attempts.length > 0
          ? Math.round(attempts.reduce((sum, a) => sum + a.score, 0) / attempts.length)
          : 0;

      return {
        quizId: quiz.id,
        quizTitle: quiz.title,
        courseTitle: quiz.module.course.title,
        totalAttempts: total,
        passedAttempts: passed,
        failedAttempts: total - passed,
        averageScore,
        passRate: total > 0 ? Math.round((passed / total) * 100) : 0,
      };
    });
  }

  private async getTopStudents(instructorId: string) {
    const enrollments = await prisma.enrollment.findMany({
      where: { course: { instructorId } },
      include: {
        user: {
          include: {
            progress: {
              where: { completed: true },
            },
            certificates: {
              where: { course: { instructorId } },
            },
            quizAttempts: {
              where: {
                quiz: {
                  module: {
                    course: { instructorId },
                  },
                },
              },
            },
          },
        },
        course: {
          include: {
            modules: {
              include: {
                lessons: true,
              },
            },
          },
        },
      },
    });

    const studentStats = enrollments.reduce((acc, enrollment) => {
      const userId = enrollment.user.id;
      if (!acc[userId]) {
        acc[userId] = {
          userId,
          userName: enrollment.user.name,
          userEmail: enrollment.user.email,
          coursesEnrolled: 0,
          lessonsCompleted: 0,
          certificatesEarned: 0,
          quizzesPassed: 0,
          averageQuizScore: 0,
        };
      }

      acc[userId].coursesEnrolled++;
      acc[userId].lessonsCompleted += enrollment.user.progress.length;
      acc[userId].certificatesEarned += enrollment.user.certificates.length;

      const courseQuizAttempts = enrollment.user.quizAttempts.filter((attempt) =>
        enrollment.course.modules.some((mod) => mod.quiz?.id === attempt.quizId)
      );
      const passedInCourse = courseQuizAttempts.filter((a) => a.passed).length;
      acc[userId].quizzesPassed += passedInCourse;

      if (courseQuizAttempts.length > 0) {
        const totalScore = courseQuizAttempts.reduce((sum, a) => sum + a.score, 0);
        const previousAttempts = acc[userId].quizzesPassed - passedInCourse;
        const previousTotalScore = acc[userId].averageQuizScore * previousAttempts;
        const newTotalScore = previousTotalScore + totalScore;
        const newTotalAttempts = previousAttempts + courseQuizAttempts.length;
        acc[userId].averageQuizScore = newTotalAttempts > 0 ? Math.round(newTotalScore / newTotalAttempts) : 0;
      }
      return acc;
    }, {} as Record<string, any>);

    return Object.values(studentStats)
      .sort((a: any, b: any) => b.lessonsCompleted - a.lessonsCompleted)
      .slice(0, 10);
  }

  private async getAverageRatings(instructorId: string) {
    const courses = await prisma.course.findMany({
      where: { instructorId },
      include: {
        reviews: true,
      },
    });

    const courseRatings = courses.map((course) => {
      if (course.reviews.length === 0) {
        return {
          courseId: course.id,
          courseTitle: course.title,
          averageRating: 0,
          totalReviews: 0,
        };
      }

      const averageRating =
        course.reviews.reduce((sum, review) => sum + review.rating, 0) / course.reviews.length;

      return {
        courseId: course.id,
        courseTitle: course.title,
        averageRating: Math.round(averageRating * 10) / 10,
        totalReviews: course.reviews.length,
      };
    });

    const overallAverage =
      courseRatings.length > 0
        ? courseRatings.reduce((sum, r) => sum + r.averageRating, 0) / courseRatings.length
        : 0;

    return {
      overallAverage: Math.round(overallAverage * 10) / 10,
      byCourse: courseRatings,
    };
  }
}

