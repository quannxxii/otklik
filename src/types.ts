export type Status = "draft" | "sent" | "reply" | "interview" | "offer" | "reject";

export type TimelineType =
  | "created"
  | "sent"
  | "reply"
  | "interview"
  | "test"
  | "offer"
  | "reject"
  | "followup"
  | "note";

export type TimelineEvent = {
  id: string;
  at: string;
  type: TimelineType;
  text: string;
};

export type Application = {
  id: string;
  company: string;
  role: string;
  platform: string;
  status: Status;
  url: string;
  date: string;
  followUp: string;
  note: string;
  letterTpl: string;
  updatedAt: string;
  fitScore?: number;
  salary?: string;
  contact?: string;
  interviewNotes?: string;
  city?: string;
  stack?: string;
  jdRaw?: string;
  interviewAt?: string;
  testDeadline?: string;
  rejectReason?: string;
  timeline?: TimelineEvent[];
};

export const REJECT_REASONS = [
  "Не ответили",
  "Слабый стек / нет опыта",
  "Вилка не сошлась",
  "Сам отказался",
  "После тестового",
  "После собеса",
  "Другое",
] as const;

export type Profile = {
  name: string;
  role: string;
  city: string;
  email: string;
  telegram: string;
  github: string;
  portfolio: string;
  skills: string;
  dailyGoal: number;
  followDays: number;
  notifyFollowUps: boolean;
  onboardingDone: boolean;
};

export type LetterTemplate = {
  id: string;
  title: string;
  body: string;
};

export const STATUS_LABEL: Record<Status, string> = {
  draft: "черновик",
  sent: "отправлено",
  reply: "ответ",
  interview: "собес",
  offer: "оффер",
  reject: "отказ",
};

export const STATUS_ORDER: Status[] = [
  "draft",
  "sent",
  "reply",
  "interview",
  "offer",
  "reject",
];

export const PLATFORMS = [
  "hh.ru",
  "Хабр Карьера",
  "LinkedIn",
  "GetMatch",
  "Telegram",
  "Сайт компании",
  "Другое",
] as const;

export const DEFAULT_PROFILE: Profile = {
  name: "",
  role: "Fullstack-разработчик",
  city: "Москва",
  email: "",
  telegram: "",
  github: "",
  portfolio: "",
  skills: "JavaScript, TypeScript, Vue, React, PHP, Flutter, Dart, Supabase, PostgreSQL, Next.js",
  dailyGoal: 5,
  followDays: 5,
  notifyFollowUps: true,
  onboardingDone: false,
};

export const DEFAULT_TEMPLATES: LetterTemplate[] = [
  {
    id: "fullstack",
    title: "Fullstack",
    body: `Привет! Я {{name}}, {{role}}, {{city}}.

Откликаюсь на «{{vacancy}}» в {{company}}. Кратко о себе: коммерческий опыт и свои продукты — детали в портфолио.

Стек, который пересекается: {{matched}}.

Ищу full-time ({{city}} / remote). Тестовое готов взять сразу.

{{links}}`,
  },
  {
    id: "frontend",
    title: "Frontend",
    body: `Привет! Я {{name}}, frontend / fullstack из {{city}}.

Интересна вакансия «{{vacancy}}» в {{company}}. По стеку пересекаемся: {{matched}}.

Full-time, готов к тестовому.

{{links}}`,
  },
  {
    id: "short",
    title: "Короткий",
    body: `Привет! {{name}}, {{role}}, {{city}}.
Отклик на «{{vacancy}}» — {{company}}.
Стек: {{matched}}
{{links}}
Тестовое могу сразу.`,
  },
  {
    id: "targeted",
    title: "Под вакансию",
    body: `Привет! Я {{name}}.

«{{vacancy}}» в {{company}} — откликаюсь точечно по пересечениям:
{{matched_lines}}

{{role}}, {{city}}. Готов тестовое или короткий созвон.

{{links}}`,
  },
  {
    id: "followup",
    title: "Follow-up",
    body: `Привет! Несколько дней назад откликался на «{{vacancy}}» в {{company}}.
Подскажите, резюме дошло? Если удобно — готов тестовое или короткий созвон.

{{name}}
{{links}}`,
  },
];

export const SAMPLE_JD = `Frontend / Fullstack Developer (Vue / React)
Компания: СеверТех
https://hh.ru/vacancy/12345678

Зарплата: от 180 000 до 250 000 ₽ net
Город: Москва / гибрид / remote

Мы ищем разработчика в продуктовую команду.
Стек: Vue 3, TypeScript, PHP, PostgreSQL, REST API.
Будет плюсом: React, Flutter, Docker, CI/CD.

Задачи:
— фичи на клиенте и чуть бэкенда
— код-ревью, оценка задач
— довести до продакшена`;
