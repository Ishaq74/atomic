import type { Locale } from "@i18n/config";

export interface ServiceNotificationTranslations {
  publishedTitle: string;
  publishedMessage: string;
  reviewTitle: string;
  reviewMessage: string;
  commentTitle: string;
  commentReplyTitle: string;
  contributionPending: string;
}

const translations: Record<Locale, ServiceNotificationTranslations> = {
  fr: {
    publishedTitle: "Service publié",
    publishedMessage: "Votre service est désormais publié.",
    reviewTitle: "Nouvel avis",
    reviewMessage: "Un nouvel avis a été soumis pour votre service.",
    commentTitle: "Nouveau commentaire",
    commentReplyTitle: "Nouvelle réponse",
    contributionPending: "Votre contribution est en attente de modération.",
  },
  en: {
    publishedTitle: "Service published",
    publishedMessage: "Your service is now published.",
    reviewTitle: "New review",
    reviewMessage: "A new review was submitted for your service.",
    commentTitle: "New comment",
    commentReplyTitle: "New reply",
    contributionPending: "Your contribution is awaiting moderation.",
  },
  es: {
    publishedTitle: "Servicio publicado",
    publishedMessage: "Tu servicio ya está publicado.",
    reviewTitle: "Nueva reseña",
    reviewMessage: "Se ha enviado una nueva reseña para tu servicio.",
    commentTitle: "Nuevo comentario",
    commentReplyTitle: "Nueva respuesta",
    contributionPending: "Tu contribución está pendiente de moderación.",
  },
  ar: {
    publishedTitle: "تم نشر الخدمة",
    publishedMessage: "أصبحت خدمتك منشورة الآن.",
    reviewTitle: "تقييم جديد",
    reviewMessage: "تم إرسال تقييم جديد لخدمتك.",
    commentTitle: "تعليق جديد",
    commentReplyTitle: "رد جديد",
    contributionPending: "مساهمتك بانتظار المراجعة.",
  },
};

export function getServiceNotificationTranslations(locale: Locale): ServiceNotificationTranslations {
  return translations[locale] ?? translations.fr;
}
