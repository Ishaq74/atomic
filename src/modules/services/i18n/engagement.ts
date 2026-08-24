import type { Locale } from "@i18n/config";

export type ServiceEngagementTranslations = {
  favorite: string;
  unfavorite: string;
  reactionLabel: string;
  reviewTitle: string;
  reviewRating: string;
  reviewContent: string;
  reviewRecommended: string;
  submitReview: string;
  commentTitle: string;
  commentContent: string;
  submitComment: string;
  noReviews: string;
  noComments: string;
  pendingModeration: string;
  helpful: string;
  report: string;
  success: string;
  error: string;
};

const translations: Record<Locale, ServiceEngagementTranslations> = {
  fr: { favorite: "Ajouter aux favoris", unfavorite: "Retirer des favoris", reactionLabel: "Réagir", reviewTitle: "Avis", reviewRating: "Note", reviewContent: "Votre avis", reviewRecommended: "Je recommande ce service", submitReview: "Publier l'avis", commentTitle: "Commentaires", commentContent: "Votre commentaire", submitComment: "Publier le commentaire", noReviews: "Aucun avis pour le moment.", noComments: "Aucun commentaire pour le moment.", pendingModeration: "Votre contribution est en attente de modération.", helpful: "Utile", report: "Signaler", success: "Enregistré.", error: "Une erreur est survenue." },
  en: { favorite: "Add to favorites", unfavorite: "Remove from favorites", reactionLabel: "React", reviewTitle: "Reviews", reviewRating: "Rating", reviewContent: "Your review", reviewRecommended: "I recommend this service", submitReview: "Submit review", commentTitle: "Comments", commentContent: "Your comment", submitComment: "Submit comment", noReviews: "No reviews yet.", noComments: "No comments yet.", pendingModeration: "Your contribution is awaiting moderation.", helpful: "Helpful", report: "Report", success: "Saved.", error: "Something went wrong." },
  es: { favorite: "Añadir a favoritos", unfavorite: "Quitar de favoritos", reactionLabel: "Reaccionar", reviewTitle: "Reseñas", reviewRating: "Puntuación", reviewContent: "Tu reseña", reviewRecommended: "Recomiendo este servicio", submitReview: "Publicar reseña", commentTitle: "Comentarios", commentContent: "Tu comentario", submitComment: "Publicar comentario", noReviews: "Aún no hay reseñas.", noComments: "Aún no hay comentarios.", pendingModeration: "Tu contribución está pendiente de moderación.", helpful: "Útil", report: "Reportar", success: "Guardado.", error: "Ocurrió un error." },
  ar: { favorite: "إضافة إلى المفضلة", unfavorite: "إزالة من المفضلة", reactionLabel: "تفاعل", reviewTitle: "التقييمات", reviewRating: "التقييم", reviewContent: "مراجعتك", reviewRecommended: "أوصي بهذه الخدمة", submitReview: "نشر التقييم", commentTitle: "التعليقات", commentContent: "تعليقك", submitComment: "نشر التعليق", noReviews: "لا توجد تقييمات بعد.", noComments: "لا توجد تعليقات بعد.", pendingModeration: "مساهمتك بانتظار المراجعة.", helpful: "مفيد", report: "إبلاغ", success: "تم الحفظ.", error: "حدث خطأ." },
};

export function getServiceEngagementTranslations(locale: Locale): ServiceEngagementTranslations {
  return translations[locale] ?? translations.fr;
}
