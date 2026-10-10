export type Role = "ADMIN" | "INSTRUCTOR" | "STUDENT";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatarUrl?: string | null;
  /** Nulo enquanto o e-mail não for confirmado. */
  emailVerifiedAt?: string | null;
}

export interface Lesson {
  id: string;
  title: string;
  description?: string | null;
  videoUrl?: string | null;
  durationMinutes?: number;
  order?: number;
}

export interface Module {
  id: string;
  title: string;
  description?: string | null;
  order?: number;
  lessons?: Lesson[];
}

export interface CourseCategory {
  id: string;
  name: string;
  description?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface Course {
  id: string;
  title: string;
  description?: string | null;
  coverImageUrl?: string | null;
  durationHours?: number;
  difficulty?: string;
  status?: string;
  category?: CourseCategory | null;
  requireQuizzesForCertificate?: boolean;
  instructor?: Pick<User, "id" | "name" | "avatarUrl">;
  modules?: Module[];
}

export interface LessonProgress {
  lessonId: string;
  completed: boolean;
  completedAt?: string | null;
}

export interface CourseProgress {
  totalLessons: number;
  completedLessons: number;
  progressPercentage: number;
  lessons: LessonProgress[];
  /** Quizzes que faltam para o certificado (cursos que exigem aprovação). */
  pendingQuizzes?: { id: string; title: string; moduleId: string }[];
}

export interface LessonComment {
  id: string;
  content: string;
  parentId?: string | null;
  userId: string;
  lessonId: string;
  createdAt: string;
  updatedAt: string;
  user: Pick<User, "id" | "name" | "avatarUrl">;
  replies?: LessonComment[];
}

export interface QuizQuestion {
  id: string;
  question: string;
  type: string;
  options: string[];
  /** Enviado apenas para o dono do curso ou administradores. */
  correctAnswer?: number;
  /** Explicação da resposta (apenas para o dono do curso ou administradores). */
  explanation?: string | null;
  order: number;
}

export interface Quiz {
  id: string;
  title: string;
  description?: string | null;
  passingScore: number;
  /** Limite de tentativas por aluno (nulo = ilimitado). */
  maxAttempts: number | null;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  moduleId: string;
  questions: QuizQuestion[];
  /** Situação do usuário atual. */
  attemptsUsed?: number;
  attemptsRemaining?: number | null;
  passed?: boolean;
}

export interface QuizQuestionResult {
  questionId: string;
  selected: number | null;
  correct: boolean;
  /** Presentes só quando o gabarito é revelado (aprovação ou tentativas esgotadas). */
  correctAnswer?: number;
  explanation?: string | null;
}

export interface QuizAttempt {
  id: string;
  userId: string;
  quizId: string;
  answers: { [questionId: string]: number };
  score: number;
  passed: boolean;
  completedAt: string;
  /** Presentes na resposta do envio de uma tentativa. */
  attemptsUsed?: number;
  attemptsRemaining?: number | null;
  answersRevealed?: boolean;
  results?: QuizQuestionResult[];
}

export interface Certificate {
  id: string;
  pdfUrl: string;
  userId: string;
  /** Nulo se o curso foi excluído; os dados abaixo continuam disponíveis. */
  courseId: string | null;
  courseTitle: string;
  courseDurationHours: number;
  instructorName: string;
  studentName: string;
  issuedAt: string;
  course?: {
    id: string;
    title: string;
    coverImageUrl?: string | null;
    durationHours: number;
    instructor: {
      name: string;
    };
  } | null;
}

export interface Favorite {
  id: string;
  userId: string;
  courseId: string;
  createdAt: string;
  course: Course;
}

export interface Tag {
  id: string;
  name: string;
  createdAt: string;
  _count?: {
    courses: number;
  };
}

export interface CourseTag {
  id: string;
  courseId: string;
  tagId: string;
  createdAt: string;
  tag: Tag;
}

export interface Note {
  id: string;
  content: string;
  userId: string;
  lessonId: string;
  createdAt: string;
  updatedAt: string;
  lesson?: {
    id: string;
    title: string;
    module?: {
      id: string;
      title: string;
      course?: {
        id: string;
        title: string;
      };
    };
  };
}

export interface CourseReview {
  id: string;
  rating: number;
  comment?: string | null;
  userId: string;
  courseId: string;
  createdAt: string;
  updatedAt: string;
  user: Pick<User, "id" | "name" | "avatarUrl">;
}

export type NotificationCategory = "MESSAGE" | "COMMENT" | "CERTIFICATE" | "REVIEW" | "QUIZ" | "ENROLLMENT" | "PROGRESS";

export interface NotificationPreference {
  category: NotificationCategory;
  email: boolean;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: "INFO" | "SUCCESS" | "WARNING" | "ERROR";
  category?: NotificationCategory | "GENERAL";
  read: boolean;
  userId: string;
  createdAt: string;
}

/** Resposta de POST /files. */
export interface UploadedFile {
  id: string;
  url: string;
  name: string;
  mimeType: string;
  size: number;
  fileType: string;
}

export interface LessonAttachment {
  id: string;
  name: string;
  description?: string | null;
  fileUrl: string;
  fileType: string;
  fileSize?: number | null;
  category?: string | null;
  order: number;
  thumbnailUrl?: string | null;
  downloadCount: number;
  /** Preenchido quando o material foi enviado ao Educarize (e não é um link externo). */
  fileId?: string | null;
  lessonId: string;
  createdAt: string;
  updatedAt: string;
}

export interface LearningPath {
  id: string;
  title: string;
  description?: string | null;
  coverImageUrl?: string | null;
  difficulty?: string | null;
  estimatedHours?: number | null;
  instructorId: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  instructor: Pick<User, "id" | "name" | "avatarUrl">;
  courses?: LearningPathCourse[];
  _count?: {
    enrollments: number;
  };
}

export interface LearningPathCourse {
  id: string;
  learningPathId: string;
  courseId: string;
  order: number;
  isRequired: boolean;
  createdAt: string;
  course: Course;
}

export interface LearningPathEnrollment {
  id: string;
  userId: string;
  learningPathId: string;
  enrolledAt: string;
  completedAt?: string | null;
  progress: number;
  learningPath?: LearningPath;
}

export interface Message {
  id: string;
  content: string;
  senderId: string;
  receiverId: string;
  read: boolean;
  createdAt: string;
  sender: Pick<User, "id" | "name" | "avatarUrl">;
  receiver: Pick<User, "id" | "name" | "avatarUrl">;
}

export interface Conversation {
  userId: string;
  user: Pick<User, "id" | "name" | "avatarUrl">;
  lastMessage: Message;
  unreadCount: number;
}


export interface Paginated {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/** Resposta de GET /courses. */
export interface CoursesPage {
  courses: Course[];
  pagination: Paginated;
}

/** Parâmetros de query string enviados ao axios. */
export type QueryParams = Record<string, string | number | boolean | string[] | undefined>;

export interface MyEnrollment {
  id: string;
  userId: string;
  courseId: string;
  enrolledAt: string;
  course: Course;
}

export interface SearchCourse extends Course {
  averageRating: number;
  totalReviews: number;
  tags: CourseTag[];
}

export interface SearchSuggestions {
  courses: { id: string; title: string }[];
  tags: { id: string; name: string }[];
}

export interface LearningPathProgress {
  enrollment: LearningPathEnrollment;
  progress: number;
  totalCourses: number;
  completedCourses: number;
  totalLessons: number;
  completedLessons: number;
}
