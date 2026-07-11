import { randomUUID } from 'node:crypto';
import { and, eq, inArray, isNull } from 'drizzle-orm';
import { invalidateCache } from '../src/database/cache';
import { getDrizzle, schema, shutdownDb } from '../src/database/drizzle';
import { auth } from '../src/lib/auth';
import { calculateSeoScore } from '../src/lib/blog/validation';
import { generateExcerpt, generateSchemaMarkup, getOgLocale } from '../src/lib/blog/utils';
import { LOCALES, type Locale } from '../src/i18n/config';

const DEMO_PASSWORD = 'DemoBlog1234!';

const DEMO_USERS = [
  { email: 'annecy-author-demo@atomic.local', name: 'Claire Martin' },
  { email: 'annecy-reader-demo@atomic.local', name: 'Leo Walker' },
  { email: 'annecy-critic-demo@atomic.local', name: 'Sofia Reyes' },
] as const;

type DemoLocale = (typeof LOCALES)[number];

interface CategoryTranslationSeed {
  slug?: string;
  name: string;
  description: string;
  metaTitle: string;
  metaDescription: string;
}

interface CategorySeed {
  slug: string;
  icon: string;
  color: string;
  sortOrder: number;
  parentSlug?: string;
  translations: Record<DemoLocale, CategoryTranslationSeed>;
}

interface TagSeed {
  slug: string;
  color: string;
  translations: Record<DemoLocale, { name: string; slug?: string }>;
}

interface PostTranslationSeed {
  slug: string;
  title: string;
  excerpt: string;
  metaDescription: string;
  metaKeywords: string;
  focusKeyword: string;
  content: string;
}

interface CommentSeed {
  key: string;
  content: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SPAM' | 'TRASH';
  guestName?: string;
  guestEmail?: string;
  authorEmail?: string;
  parentKey?: string;
}

interface ReviewSeed {
  key: string;
  authorEmail: string;
  rating: number;
  title: string;
  content: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SPAM';
  isRecommended: boolean;
  helpfulByEmails?: string[];
}

interface ReactionSeed {
  userEmail: string;
  reactionType: 'LIKE' | 'LOVE' | 'FIRE' | 'CLAP' | 'LAUGH' | 'SAD';
}

interface ReportSeed {
  targetType: 'comment' | 'review';
  targetKey: string;
  reporterEmail: string;
  reason: 'SPAM' | 'ABUSIVE' | 'OFF_TOPIC' | 'HATE_SPEECH' | 'OTHER';
  description: string;
  status: 'PENDING' | 'REVIEWED' | 'RESOLVED' | 'REJECTED';
}

interface PostSeed {
  baseSlug: string;
  viewCount: number;
  isFeatured: boolean;
  isSticky: boolean;
  publishedAt: string;
  categorySlugs: string[];
  tagSlugs: string[];
  translations: Record<DemoLocale, PostTranslationSeed>;
  comments: CommentSeed[];
  reviews: ReviewSeed[];
  reactions: ReactionSeed[];
  reports: ReportSeed[];
}

const CATEGORY_SEEDS: CategorySeed[] = [
  {
    slug: 'annecy-experiences',
    icon: 'mdi:map-marker-path',
    color: '#0F766E',
    sortOrder: 1,
    translations: {
      fr: {
        slug: 'experiences-annecy',
        name: 'Experiences a Annecy',
        description: 'Guides pratiques pour profiter d Annecy sur plusieurs rythmes: balade, marche et reperes utiles.',
        metaTitle: 'Experiences a Annecy',
        metaDescription: 'Selection d experiences a Annecy avec itineraires, bonnes pratiques et reperes de saison.',
      },
      en: {
        slug: 'annecy-experiences',
        name: 'Annecy Experiences',
        description: 'Practical guides to experience Annecy through walks, city rhythms and useful local anchors.',
        metaTitle: 'Annecy Experiences',
        metaDescription: 'Explore Annecy experiences with practical itineraries, pacing tips and seasonal guidance.',
      },
      es: {
        slug: 'experiencias-annecy',
        name: 'Experiencias en Annecy',
        description: 'Guias practicas para descubrir Annecy entre paseos, ritmos urbanos y consejos utiles.',
        metaTitle: 'Experiencias en Annecy',
        metaDescription: 'Descubre experiencias en Annecy con itinerarios concretos y recomendaciones de temporada.',
      },
      ar: {
        slug: 'tajareb-annecy',
        name: 'تجارب آنسي',
        description: 'ادلة عملية لاكتشاف آنسي بين المشي والايقاع المحلي والنصائح المفيدة.',
        metaTitle: 'تجارب آنسي',
        metaDescription: 'اكتشف تجارب آنسي مع مسارات عملية ونصائح موسمية واضحة.',
      },
    },
  },
  {
    slug: 'annecy-food-drink',
    icon: 'mdi:silverware-fork-knife',
    color: '#B45309',
    sortOrder: 2,
    parentSlug: 'annecy-experiences',
    translations: {
      fr: {
        slug: 'gastronomie-cafes',
        name: 'Gastronomie et cafes',
        description: 'Adresses gourmandes, cafes de quartier et haltes avec vue autour du lac et de la vieille ville.',
        metaTitle: 'Gastronomie a Annecy',
        metaDescription: 'Restaurants, cafes et haltes gourmandes testes a Annecy et autour du lac.',
      },
      en: {
        slug: 'food-and-cafes',
        name: 'Food and Cafes',
        description: 'Restaurant picks, neighborhood cafes and scenic stops around the lake and old town.',
        metaTitle: 'Food in Annecy',
        metaDescription: 'Tried restaurants, cafes and scenic food stops around Annecy and the lake.',
      },
      es: {
        slug: 'gastronomia-cafes',
        name: 'Gastronomia y cafes',
        description: 'Restaurantes, cafes de barrio y paradas con vista junto al lago y el casco antiguo.',
        metaTitle: 'Gastronomia en Annecy',
        metaDescription: 'Restaurantes, cafes y paradas gastronomicas probadas en Annecy y junto al lago.',
      },
      ar: {
        slug: 'mataem-wa-maqahi',
        name: 'المطاعم والمقاهي',
        description: 'عناوين مطاعم ومقاهي محلية وتوقفات جميلة حول البحيرة والمدينة القديمة.',
        metaTitle: 'الطعام في آنسي',
        metaDescription: 'مطاعم ومقاه وتجارب طعام مجربة في آنسي وحول البحيرة.',
      },
    },
  },
  {
    slug: 'annecy-outdoor-routes',
    icon: 'mdi:bike',
    color: '#2563EB',
    sortOrder: 3,
    parentSlug: 'annecy-experiences',
    translations: {
      fr: {
        slug: 'balades-outdoor',
        name: 'Balades et outdoor',
        description: 'Parcours a velo, points de baignade, haltes famille et rythmes de sortie autour du lac.',
        metaTitle: 'Outdoor a Annecy',
        metaDescription: 'Itineraires outdoor a Annecy: velo, baignade, pauses famille et conseils pratiques.',
      },
      en: {
        slug: 'outdoor-routes',
        name: 'Outdoor Routes',
        description: 'Bike loops, swim stops, family pauses and outdoor pacing around the lake.',
        metaTitle: 'Outdoor in Annecy',
        metaDescription: 'Outdoor itineraries in Annecy with cycling routes, swim stops and family logistics.',
      },
      es: {
        slug: 'rutas-aire-libre',
        name: 'Rutas al aire libre',
        description: 'Rutas en bici, paradas para nadar y ritmos familiares alrededor del lago.',
        metaTitle: 'Outdoor en Annecy',
        metaDescription: 'Rutas outdoor en Annecy con bici, banos y consejos logísticos para familias.',
      },
      ar: {
        slug: 'masarat-kharijiya',
        name: 'مسارات خارجية',
        description: 'مسارات دراجات وتوقفات سباحة وخطوات مناسبة للعائلة حول البحيرة.',
        metaTitle: 'الهواء الطلق في آنسي',
        metaDescription: 'مسارات خارجية في آنسي مع دراجات وتوقفات سباحة ونصائح للعائلات.',
      },
    },
  },
];

const TAG_SEEDS: TagSeed[] = [
  {
    slug: 'annecy-lake',
    color: '#0EA5E9',
    translations: {
      fr: { name: 'Lac d Annecy', slug: 'lac-annecy' },
      en: { name: 'Lake Annecy', slug: 'annecy-lake' },
      es: { name: 'Lago de Annecy', slug: 'lago-annecy' },
      ar: { name: 'بحيرة آنسي', slug: 'buhayrat-annecy' },
    },
  },
  {
    slug: 'annecy-old-town',
    color: '#7C3AED',
    translations: {
      fr: { name: 'Vieille ville', slug: 'vieille-ville' },
      en: { name: 'Old Town', slug: 'old-town' },
      es: { name: 'Casco antiguo', slug: 'casco-antiguo' },
      ar: { name: 'المدينة القديمة', slug: 'al-madina-al-qadima' },
    },
  },
  {
    slug: 'annecy-cycling',
    color: '#1D4ED8',
    translations: {
      fr: { name: 'Velo', slug: 'velo' },
      en: { name: 'Cycling', slug: 'cycling' },
      es: { name: 'Ciclismo', slug: 'ciclismo' },
      ar: { name: 'الدراجات', slug: 'al-darajat' },
    },
  },
  {
    slug: 'annecy-family',
    color: '#DB2777',
    translations: {
      fr: { name: 'En famille', slug: 'en-famille' },
      en: { name: 'Family', slug: 'family' },
      es: { name: 'En familia', slug: 'en-familia' },
      ar: { name: 'للعائلة', slug: 'lil-aila' },
    },
  },
  {
    slug: 'annecy-local-food',
    color: '#EA580C',
    translations: {
      fr: { name: 'Cuisine locale', slug: 'cuisine-locale' },
      en: { name: 'Local Food', slug: 'local-food' },
      es: { name: 'Cocina local', slug: 'cocina-local' },
      ar: { name: 'المطبخ المحلي', slug: 'matbakh-mahali' },
    },
  },
];

const POST_SEEDS: PostSeed[] = [
  {
    baseSlug: 'annecy-demo-weekend',
    viewCount: 184,
    isFeatured: true,
    isSticky: true,
    publishedAt: '2026-06-12T08:00:00.000Z',
    categorySlugs: ['annecy-experiences'],
    tagSlugs: ['annecy-lake', 'annecy-old-town', 'annecy-family'],
    translations: {
      fr: {
        slug: 'annecy-week-end-48h',
        title: '48 heures a Annecy: lac, vieille ville et bonnes pauses sans courir partout',
        excerpt: 'Un week-end concret a Annecy avec un rythme realiste, des pauses au bord du lac et des reperes utiles pour profiter sans se disperser.',
        metaDescription: 'Un itineraire complet pour passer 48 heures a Annecy entre marche, lac, vieille ville et adresses simples a suivre.',
        metaKeywords: 'annecy, week-end, lac d annecy, vieille ville, famille',
        focusKeyword: 'week-end a Annecy',
        content: `<p>Annecy fonctionne tres bien sur un format de 48 heures si vous acceptez de garder un rythme simple. Le bon reflexe consiste a alterner une vraie marche dans la vieille ville, un temps long au bord de l eau et une ou deux adresses fiables au lieu d empiler les spots.</p><h2>Samedi: marcher avant de consommer</h2><p>Commencez vers le canal du Thiou, entre les facades colorees et les petites passerelles. Le marche de la vieille ville reste le meilleur point de depart pour prendre la mesure du centre. Ensuite, montez doucement vers le chateau pour gagner une vue qui permet de comprendre la forme de la ville et la proximite du lac.</p><ul><li>08:30: marche et cafe autour du marche</li><li>11:00: vieille ville et points de vue</li><li>14:00: pause au Paquier puis baignade si la meteo suit</li></ul><h2>Dimanche: lac et respiration</h2><p>Le lendemain, gardez une boucle tres legere entre les Jardins de l Europe, le pont des Amours et une location de pedalos ou de velos selon la saison. L idee n est pas de tout cocher, mais d avoir assez d air pour profiter de la lumiere sur le lac et revenir au centre sans stress.</p><blockquote>Le vrai luxe a Annecy, ce n est pas d en faire plus, c est de laisser de la place aux transitions entre deux lieux.</blockquote>`,
      },
      en: {
        slug: 'annecy-48-hours-itinerary',
        title: '48 hours in Annecy: lake time, old town walks and a calmer pace',
        excerpt: 'A realistic 48-hour Annecy plan with enough time for the old town, the lakefront and proper breaks instead of rushed checklists.',
        metaDescription: 'A complete 48-hour Annecy itinerary mixing the old town, the lakefront and practical timing that feels realistic on foot.',
        metaKeywords: 'annecy, 48 hours, lake annecy, old town, family travel',
        focusKeyword: '48 hours in Annecy',
        content: `<p>Annecy works best over 48 hours when you stop trying to compress every postcard stop into one loop. The city becomes far more enjoyable when you pair one proper old town walk with generous lake time and a small number of dependable stops.</p><h2>Saturday: start with the streets</h2><p>Begin around the Thiou canal, then let the streets pull you through the market area before climbing toward the castle. The route is short, but it gives enough elevation to understand how closely the town and the lake sit together.</p><ul><li>08:30: market walk and coffee</li><li>11:00: old town circuit and castle viewpoint</li><li>14:00: Paquier lawns and a swim break if the weather holds</li></ul><h2>Sunday: stay near the water</h2><p>Keep the second day lighter, with the Jardins de l Europe, the Pont des Amours and either a pedal boat or a short bike rental depending on the season. Annecy rewards spacing and repetition more than speed.</p><blockquote>The best Annecy weekends leave room between places, not just a trail of pins on a map.</blockquote>`,
      },
      es: {
        slug: 'annecy-itinerario-48-horas',
        title: '48 horas en Annecy: lago, casco antiguo y un ritmo que si se disfruta',
        excerpt: 'Un plan realista de 48 horas en Annecy, con tiempo suficiente para el casco antiguo, el lago y pausas que no se sienten apuradas.',
        metaDescription: 'Itinerario completo de 48 horas en Annecy entre casco antiguo, lago y tiempos pensados para caminar sin prisas.',
        metaKeywords: 'annecy, 48 horas, lago annecy, casco antiguo, familia',
        focusKeyword: '48 horas en Annecy',
        content: `<p>Annecy se disfruta mucho mas en 48 horas cuando no intentas encadenar todos los lugares fotografiados en una sola vuelta. La ciudad gana cuando mezclas una caminata real por el casco antiguo con tiempo largo junto al agua y pocas paradas bien elegidas.</p><h2>Sabado: primero caminar</h2><p>Empieza por el canal del Thiou y el mercado del centro historico. Luego sube con calma hacia el castillo para leer la ciudad desde arriba y entender como se conecta con el lago.</p><ul><li>08:30: mercado y cafe</li><li>11:00: paseo por el casco antiguo y mirador</li><li>14:00: descanso en Le Paquier y bano si acompana el clima</li></ul><h2>Domingo: aire y agua</h2><p>Dedica el segundo dia a una vuelta ligera por los jardines, el Pont des Amours y una actividad simple sobre el lago. En Annecy, el margen entre una parada y otra es parte de la experiencia.</p><blockquote>Lo mejor de Annecy no es hacer mas, sino dejar sitio entre una escena y la siguiente.</blockquote>`,
      },
      ar: {
        slug: 'annecy-48h-guide-ar',
        title: 'ثمان واربعون ساعة في آنسي بين البحيرة والمدينة القديمة بوتيرة مريحة',
        excerpt: 'برنامج عملي ليومين في آنسي يوازن بين المدينة القديمة والبحيرة والتوقفات الهادئة بدون استعجال.',
        metaDescription: 'دليل عملي لقضاء 48 ساعة في آنسي بين المشي حول القنوات والبحيرة والتوقفات المناسبة للعائلة.',
        metaKeywords: 'آنسي, 48 ساعة, البحيرة, المدينة القديمة, عائلة',
        focusKeyword: '48 ساعة في آنسي',
        content: `<p>تظهر آنسي بشكل افضل عندما تعطيها يومين كاملين بدلا من محاولة جمع كل الاماكن المشهورة في جولة سريعة. المدينة تكافئ من يمشي بهدوء بين القنوات ثم يترك وقتا طويلا للبحيرة والتوقفات البسيطة.</p><h2>السبت: ابدأ بالمشي</h2><p>ابدأ من قناة تيو ثم مر عبر السوق والازقة القديمة قبل الصعود بهدوء نحو القلعة. هذا المسار القصير يكشف العلاقة القريبة جدا بين المركز التاريخي والبحيرة.</p><ul><li>08:30 جولة سوق مع قهوة</li><li>11:00 مسار المدينة القديمة ونقطة مشاهدة</li><li>14:00 استراحة في لو باكيه مع سباحة عند الطقس المناسب</li></ul><h2>الاحد: خفف الايقاع</h2><p>خصص اليوم الثاني للحدائق وجسر العشاق ونشاط خفيف على البحيرة. في آنسي، الفراغ بين محطتين جزء من المتعة نفسها.</p><blockquote>القيمة الحقيقية في آنسي ليست في عدد الاماكن، بل في المسافة الهادئة بينها.</blockquote>`,
      },
    },
    comments: [
      {
        key: 'weekend-root',
        content: 'Itineraire vraiment utile. On a suivi le samedi presque a la lettre avec deux enfants et le rythme etait nickel.',
        status: 'APPROVED',
        guestName: 'Camille',
        guestEmail: 'camille.demo@example.com',
      },
      {
        key: 'weekend-reply',
        content: 'Merci. Le vrai point cle ici, c est de garder du temps libre entre la vieille ville et Le Paquier.',
        status: 'APPROVED',
        authorEmail: 'annecy-author-demo@atomic.local',
        parentKey: 'weekend-root',
      },
    ],
    reviews: [
      {
        key: 'weekend-review-approved',
        authorEmail: 'annecy-reader-demo@atomic.local',
        rating: 5,
        title: 'Le meilleur point de depart pour une premiere visite',
        content: 'On a garde la structure generale de l article et tout etait coherent sur place. Les temps de marche sont justes.',
        status: 'APPROVED',
        isRecommended: true,
        helpfulByEmails: ['annecy-critic-demo@atomic.local'],
      },
    ],
    reactions: [
      { userEmail: 'annecy-reader-demo@atomic.local', reactionType: 'LOVE' },
      { userEmail: 'annecy-critic-demo@atomic.local', reactionType: 'LIKE' },
    ],
    reports: [],
  },
  {
    baseSlug: 'annecy-demo-food',
    viewCount: 129,
    isFeatured: false,
    isSticky: false,
    publishedAt: '2026-06-19T09:00:00.000Z',
    categorySlugs: ['annecy-food-drink'],
    tagSlugs: ['annecy-lake', 'annecy-old-town', 'annecy-local-food'],
    translations: {
      fr: {
        slug: 'annecy-ou-manger-autour-du-lac',
        title: 'Ou manger autour du lac d Annecy: 7 adresses qui tiennent la route du petit dej au diner',
        excerpt: 'Selection testee d adresses autour d Annecy pour le cafe, le dejeuner, l aperitif et un diner avec vue sans piege touristique.',
        metaDescription: 'Restaurants et cafes a Annecy testes sur le terrain, avec vrai contexte: horaires, ambiance et meilleur moment pour y aller.',
        metaKeywords: 'annecy restaurant, lac d annecy, cafe, brunch, cuisine locale',
        focusKeyword: 'ou manger a Annecy',
        content: `<p>Autour du lac d Annecy, la question n est pas seulement ou manger mais a quel moment s y poser. Une meme adresse peut etre brillante a 09:00 et bien moins interessante a 14:30. Le plus utile est donc de penser les lieux selon le rythme de la journee.</p><h2>Le matin: rester simple</h2><p>Pour le petit dejeuner, les cafes autour de la vieille ville sont plus agreables avant 10:00, quand les quais restent fluides. Cherchez des cartes courtes, une terrasse lisible et un service qui n a pas encore bascule en mode flux tendu.</p><h2>Midi et soir: mieux vaut peu mais bien place</h2><p>Pour dejeuner, privilegiez une table avec vue laterale plutot qu une facade frontale sur les spots les plus charges. Au diner, gardez un timing legerement decale: arriver a 19:00 ou apres 21:00 change completement l ambiance autour du lac.</p><ul><li>Petit dej: vieille ville avant 10:00</li><li>Dejeuner: terrasses a vue laterale, moins de bruit</li><li>Diner: horaires decales et reservation utile le week-end</li></ul>`,
      },
      en: {
        slug: 'annecy-where-to-eat-lake',
        title: 'Where to eat around Lake Annecy: 7 spots that actually hold up all day',
        excerpt: 'A tested list of Annecy cafés and restaurants for breakfast, lunch, aperitif and dinner without the usual tourist traps.',
        metaDescription: 'Field-tested Annecy food picks with timing notes, atmosphere cues and the best moment to book each stop.',
        metaKeywords: 'annecy restaurants, lake annecy food, cafes, brunch, local food',
        focusKeyword: 'where to eat in Annecy',
        content: `<p>Around Lake Annecy, the better question is not only where to eat but when to sit down. One address can feel excellent at breakfast and much flatter once the crowds peak. Timing matters almost as much as the plate.</p><h2>Morning works in your favor</h2><p>The old town cafés are strongest before 10:00, when the quays still feel open and service is not operating under pressure. Short menus and direct service are usually a better signal than a long tourist-facing card.</p><h2>Lunch and dinner need positioning</h2><p>At lunch, side-view terraces often deliver a calmer experience than the front-row spots. For dinner, shifting earlier or later than the main rush changes the entire tone around the lake.</p><ul><li>Breakfast: old town before 10:00</li><li>Lunch: side-view terraces, less noise</li><li>Dinner: offset timing and weekend reservations</li></ul>`,
      },
      es: {
        slug: 'annecy-donde-comer-lago',
        title: 'Donde comer alrededor del lago de Annecy: 7 direcciones que si valen la pena',
        excerpt: 'Selección probada de cafés y restaurantes en Annecy para desayuno, comida, aperitivo y cena sin caer en trampas obvias.',
        metaDescription: 'Direcciones gastronómicas en Annecy probadas en contexto real: horarios, ambiente y mejor momento para ir.',
        metaKeywords: 'annecy restaurantes, lago annecy, cafe, brunch, cocina local',
        focusKeyword: 'donde comer en Annecy',
        content: `<p>En Annecy importa tanto la hora como la dirección. Un mismo lugar puede ser excelente temprano y bastante más plano cuando todo el frente del lago está lleno. La clave es leer cada parada según el momento del día.</p><h2>La mañana es el mejor filtro</h2><p>Los cafés del casco antiguo funcionan mejor antes de las 10:00, cuando todavía hay espacio y el servicio no está acelerado. Las cartas cortas y una terraza bien orientada suelen ser mejores señales que un menú infinito.</p><h2>Comida y cena: mejor elegir posición</h2><p>Para comer, las terrazas con vista lateral suelen dar una experiencia más tranquila. Por la noche, cenar un poco antes o después del pico cambia por completo el ambiente.</p><ul><li>Desayuno: centro histórico antes de las 10:00</li><li>Comida: terrazas laterales y menos ruido</li><li>Cena: reserva útil y horario desplazado</li></ul>`,
      },
      ar: {
        slug: 'annecy-food-guide-ar',
        title: 'اين تاكل حول بحيرة آنسي سبعة عناوين تعمل فعلا من الصباح حتى المساء',
        excerpt: 'اختيارات مجربة من مقاهي ومطاعم آنسي للفطور والغداء والمساء بدون الوقوع في العناوين السياحية السهلة.',
        metaDescription: 'عناوين طعام مجربة في آنسي مع ملاحظات عن التوقيت والهدوء وافضل وقت لكل محطة.',
        metaKeywords: 'آنسي, مطاعم, بحيرة آنسي, مقاهي, طعام محلي',
        focusKeyword: 'اين تاكل في آنسي',
        content: `<p>حول بحيرة آنسي لا يكفي اختيار المكان، بل يجب اختيار الوقت ايضا. بعض العناوين تكون ممتازة في الصباح ثم تصبح اقل راحة عند ازدحام الواجهة المائية. لذلك من الافضل قراءة كل محطة داخل ايقاع اليوم نفسه.</p><h2>الصباح يكشف المكان الجيد</h2><p>مقاهي المدينة القديمة تكون افضل قبل العاشرة صباحا، عندما تبقى الحركة خفيفة والخدمة مباشرة. القائمة القصيرة والجلوس الواضح مؤشران افضل من قائمة طويلة موجهة للسياح.</p><h2>الغداء والعشاء يحتاجان توقيتا جيدا</h2><p>في الظهر، التراس الجانبي غالبا اهدأ من الصف الاول. وفي المساء، تقديم العشاء قبل الذروة او بعدها يعطي تجربة افضل بكثير.</p><ul><li>فطور قبل 10:00 في المدينة القديمة</li><li>غداء في تراس جانبي اهدأ</li><li>عشاء بتوقيت مبكر او متاخر مع حجز في نهاية الاسبوع</li></ul>`,
      },
    },
    comments: [
      {
        key: 'food-comment-pending',
        content: 'Je veux bien une mise a jour hiver avec les adresses qui gardent une vraie terrasse couverte.',
        status: 'PENDING',
        guestName: 'Marc',
        guestEmail: 'marc.demo@example.com',
      },
    ],
    reviews: [
      {
        key: 'food-review-approved',
        authorEmail: 'annecy-critic-demo@atomic.local',
        rating: 4,
        title: 'Tres utile pour eviter les restos a vue sans fond',
        content: 'Le point sur les horaires decales m a vraiment aide. On a mieux mange en suivant ce conseil qu en visant la premiere terrasse venue.',
        status: 'APPROVED',
        isRecommended: true,
        helpfulByEmails: ['annecy-reader-demo@atomic.local'],
      },
    ],
    reactions: [
      { userEmail: 'annecy-reader-demo@atomic.local', reactionType: 'CLAP' },
      { userEmail: 'annecy-author-demo@atomic.local', reactionType: 'LIKE' },
    ],
    reports: [],
  },
  {
    baseSlug: 'annecy-demo-cycling',
    viewCount: 96,
    isFeatured: false,
    isSticky: false,
    publishedAt: '2026-06-26T07:15:00.000Z',
    categorySlugs: ['annecy-outdoor-routes'],
    tagSlugs: ['annecy-lake', 'annecy-cycling', 'annecy-family'],
    translations: {
      fr: {
        slug: 'annecy-velo-tour-lac-famille',
        title: 'Tour du lac d Annecy a velo: version famille, pauses baignade et logistique qui compte vraiment',
        excerpt: 'Parcours velo pense pour une journee famille autour du lac d Annecy avec points de pause, sections faciles et points d attention utiles.',
        metaDescription: 'Guide concret pour faire le tour du lac d Annecy a velo en famille avec haltes, timing et logistique vraiment utile.',
        metaKeywords: 'annecy velo, tour du lac, famille, baignade, outdoor',
        focusKeyword: 'tour du lac d Annecy a velo',
        content: `<p>Le tour du lac d Annecy a velo est tres accessible si vous le preparez comme une journee de rythme et non comme une performance. L essentiel consiste a identifier les sections ou les enfants roulent bien, les moments de pause et les points ou il vaut mieux remplir les gourdes.</p><h2>Les sections faciles a garder en tete</h2><p>Le troncon au bord de l eau entre Annecy et Sevrier donne tout de suite confiance. Plus loin, gardez des pauses franches a Saint-Jorioz puis vers Duingt pour eviter l effet tunnel. Le but n est pas d aller vite, mais de conserver une bonne humeur stable sur l ensemble de la boucle.</p><ul><li>Depart tot pour rouler au frais</li><li>Pause baignade ou pique-nique a mi-parcours</li><li>Retour en fin d apres-midi avec lumiere tres douce sur le lac</li></ul><h2>Ce qui change tout</h2><p>Deux antivols, une vraie marge d eau et un repas simple reserve d avance sont plus utiles qu un materiel trop technique. La logistique fait la sortie.</p>`,
      },
      en: {
        slug: 'annecy-cycle-lake-family-route',
        title: 'Cycling Lake Annecy: a family loop with swim breaks and the logistics that matter',
        excerpt: 'A family-friendly Lake Annecy bike loop with realistic pacing, swim stops and the practical details that actually improve the day.',
        metaDescription: 'Concrete guide to cycling around Lake Annecy with family-friendly timing, swim stops and practical logistics.',
        metaKeywords: 'annecy cycling, lake loop, family route, swim stops, outdoor',
        focusKeyword: 'cycling Lake Annecy',
        content: `<p>The Lake Annecy bike loop is very manageable with children when you plan it as a rhythm day rather than a performance target. The key is to know where the easy stretches are, where to stop and when to refill water without waiting for fatigue to dictate the route.</p><h2>Easy sections first</h2><p>The waterfront stretch between Annecy and Sevrier builds confidence quickly. Further on, stronger pauses around Saint-Jorioz and near Duingt keep the mood steady and prevent the second half from turning into a slog.</p><ul><li>Start early while the air is cooler</li><li>Build in one real swim or picnic break</li><li>Return late afternoon for softer light on the lake</li></ul><h2>What matters more than gear</h2><p>Two locks, extra water and one booked low-friction meal matter more than overthinking equipment. The logistics make the ride work.</p>`,
      },
      es: {
        slug: 'annecy-vuelta-lago-bici-familia',
        title: 'Vuelta al lago de Annecy en bici: ruta familiar, paradas para banarse y logistica util',
        excerpt: 'Ruta en bici para hacer en familia alrededor del lago de Annecy con pausas reales, tramos faciles y consejos que si cambian la jornada.',
        metaDescription: 'Guia concreta para dar la vuelta al lago de Annecy en bici con familia, pausas, bano y logistica practica.',
        metaKeywords: 'annecy bici, vuelta al lago, familia, bano, outdoor',
        focusKeyword: 'vuelta al lago de Annecy en bici',
        content: `<p>La vuelta al lago de Annecy en bici es muy llevadera si la piensas como una jornada con ritmo, no como un reto deportivo. Lo importante es reconocer los tramos faciles, decidir bien las pausas y evitar que el cansancio marque toda la ruta.</p><h2>Tramos faciles y descansos claros</h2><p>El tramo junto al agua entre Annecy y Sevrier ayuda a arrancar bien. Luego conviene hacer pausas de verdad en Saint-Jorioz y cerca de Duingt para que la segunda mitad siga siendo agradable para todos.</p><ul><li>Salida temprana para rodar con fresco</li><li>Pausa de bano o picnic a mitad del recorrido</li><li>Regreso por la tarde con mejor luz sobre el lago</li></ul><h2>La logistica vale mas que el exceso de equipo</h2><p>Dos candados, agua suficiente y una comida simple ya pensada funcionan mejor que complicar el material. La logistica sostiene la ruta.</p>`,
      },
      ar: {
        slug: 'annecy-cycle-route-ar',
        title: 'جولة بحيرة آنسي بالدراجة نسخة عائلية مع توقفات سباحة ولوجستيات مهمة',
        excerpt: 'مسار عائلي بالدراجة حول بحيرة آنسي مع وتيرة واقعية ونقاط توقف ونصائح عملية تجعل اليوم اسهل.',
        metaDescription: 'دليل عملي لجولة بحيرة آنسي بالدراجة للعائلات مع توقفات سباحة وتوقيت مناسب ونصائح لوجستية.',
        metaKeywords: 'آنسي, دراجات, جولة البحيرة, عائلة, سباحة',
        focusKeyword: 'جولة بحيرة آنسي بالدراجة',
        content: `<p>جولة بحيرة آنسي بالدراجة تصبح مناسبة جدا للعائلة عندما تنظم كيوم متوازن لا كاختبار سرعة. المهم هو معرفة المقاطع السهلة ونقاط التوقف ووقت تعبئة الماء قبل ان يفرض التعب ايقاعه على المجموعة.</p><h2>ابدأ بالمقاطع السهلة</h2><p>المسار القريب من الماء بين آنسي وسيفري يمنح بداية مريحة. بعد ذلك، تساعد توقفات واضحة في سان جوريوز وقرب دوينغت على الحفاظ على مزاج جيد حتى نهاية الجولة.</p><ul><li>انطلاق مبكر للاستفادة من الجو اللطيف</li><li>توقف سباحة او نزهة في منتصف اليوم</li><li>عودة بعد العصر مع ضوء اجمل على البحيرة</li></ul><h2>ما يصنع الفرق فعلا</h2><p>قفلان للدراجات وماء كاف ووجبة بسيطة محجوزة مسبقا اهم من تعقيد المعدات. اللوجستيات هي التي تجعل اليوم ناجحا.</p>`,
      },
    },
    comments: [
      {
        key: 'cycling-comment-approved',
        content: 'We did the loop with a 9-year-old and the Duingt pause was exactly where motivation started to drop. Very accurate pacing.',
        status: 'APPROVED',
        guestName: 'Nora',
        guestEmail: 'nora.demo@example.com',
      },
    ],
    reviews: [
      {
        key: 'cycling-review-approved',
        authorEmail: 'annecy-critic-demo@atomic.local',
        rating: 4,
        title: 'Good route, solid timing estimates',
        content: 'The Duingt halfway point is real. We stopped there and the kids were already tired. All distances and times matched our experience.',
        status: 'APPROVED',
        isRecommended: true,
        helpfulByEmails: ['annecy-author-demo@atomic.local'],
      },
      {
        key: 'cycling-review-pending',
        authorEmail: 'annecy-reader-demo@atomic.local',
        rating: 3,
        title: 'Useful, but I would add a wet weather version',
        content: 'Great structure overall. A rainy-day alternative and more details on bike rental sizing would make it complete.',
        status: 'PENDING',
        isRecommended: true,
      },
    ],
    reactions: [
      { userEmail: 'annecy-critic-demo@atomic.local', reactionType: 'FIRE' },
      { userEmail: 'annecy-author-demo@atomic.local', reactionType: 'CLAP' },
    ],
    reports: [
      {
        targetType: 'review',
        targetKey: 'cycling-review-pending',
        reporterEmail: 'annecy-critic-demo@atomic.local',
        reason: 'OFF_TOPIC',
        description: 'A useful moderation sample for the pending review queue.',
        status: 'PENDING',
      },
    ],
  },
];

function toDate(input: string): Date {
  return new Date(input);
}

function buildSeoMarkup(locale: Locale, translation: PostTranslationSeed, categorySlugs: string[], tagSlugs: string[]) {
  return generateSchemaMarkup('BlogPosting', {
    headline: translation.title,
    description: translation.metaDescription,
    inLanguage: locale,
    keywords: translation.metaKeywords.split(',').map((item) => item.trim()),
    articleSection: categorySlugs,
    about: tagSlugs,
  });
}

async function ensureUser(email: string, name: string): Promise<string> {
  const db = getDrizzle();
  const [existing] = await db
    .select({ id: schema.user.id })
    .from(schema.user)
    .where(eq(schema.user.email, email))
    .limit(1);

  if (!existing) {
    await auth.api.signUpEmail({
      body: {
        email,
        password: DEMO_PASSWORD,
        name,
      },
    });
  }

  const [user] = await db
    .select({ id: schema.user.id })
    .from(schema.user)
    .where(eq(schema.user.email, email))
    .limit(1);

  if (!user) {
    throw new Error(`Unable to resolve demo user ${email}`);
  }

  await db
    .update(schema.user)
    .set({ name, emailVerified: true })
    .where(eq(schema.user.id, user.id));

  return user.id;
}

async function main() {
  const db = getDrizzle();
  const demoUserIds = new Map<string, string>();

  for (const user of DEMO_USERS) {
    demoUserIds.set(user.email, await ensureUser(user.email, user.name));
  }

  const categoryIds = new Map<string, string>(CATEGORY_SEEDS.map((seed) => [seed.slug, randomUUID()]));
  const tagIds = new Map<string, string>(TAG_SEEDS.map((seed) => [seed.slug, randomUUID()]));
  const postIds = new Map<string, string>(POST_SEEDS.map((seed) => [seed.baseSlug, randomUUID()]));
  const commentIds = new Map<string, string>();
  const reviewIds = new Map<string, string>();

  await db.transaction(async (tx) => {
    await tx
      .delete(schema.blogPosts)
      .where(and(isNull(schema.blogPosts.organizationId), inArray(schema.blogPosts.slug, POST_SEEDS.map((seed) => seed.baseSlug))));

    await tx
      .delete(schema.blogCategories)
      .where(and(isNull(schema.blogCategories.organizationId), inArray(schema.blogCategories.slug, CATEGORY_SEEDS.map((seed) => seed.slug))));

    await tx
      .delete(schema.blogTags)
      .where(and(isNull(schema.blogTags.organizationId), inArray(schema.blogTags.slug, TAG_SEEDS.map((seed) => seed.slug))));

    await tx.insert(schema.blogCategories).values(
      CATEGORY_SEEDS.map((seed) => ({
        id: categoryIds.get(seed.slug)!,
        organizationId: null,
        parentId: seed.parentSlug ? categoryIds.get(seed.parentSlug)! : null,
        slug: seed.slug,
        icon: seed.icon,
        color: seed.color,
        sortOrder: seed.sortOrder,
      })),
    );

    await tx.insert(schema.blogCategoryTranslations).values(
      CATEGORY_SEEDS.flatMap((seed) =>
        LOCALES.map((locale) => ({
          categoryId: categoryIds.get(seed.slug)!,
          locale,
          name: seed.translations[locale].name,
          slug: seed.translations[locale].slug ?? seed.slug,
          description: seed.translations[locale].description,
          metaTitle: seed.translations[locale].metaTitle,
          metaDescription: seed.translations[locale].metaDescription,
        })),
      ),
    );

    await tx.insert(schema.blogTags).values(
      TAG_SEEDS.map((seed) => ({
        id: tagIds.get(seed.slug)!,
        organizationId: null,
        slug: seed.slug,
        color: seed.color,
      })),
    );

    await tx.insert(schema.blogTagTranslations).values(
      TAG_SEEDS.flatMap((seed) =>
        LOCALES.map((locale) => ({
          tagId: tagIds.get(seed.slug)!,
          locale,
          name: seed.translations[locale].name,
          slug: seed.translations[locale].slug ?? seed.slug,
        })),
      ),
    );

    const blogPostsToInsert: Array<typeof schema.blogPosts.$inferInsert> = POST_SEEDS.map((seed) => ({
        id: postIds.get(seed.baseSlug)!,
        organizationId: null,
        authorId: demoUserIds.get('annecy-author-demo@atomic.local')!,
        slug: seed.baseSlug,
        status: 'PUBLISHED',
        viewCount: seed.viewCount,
        isFeatured: seed.isFeatured,
        isSticky: seed.isSticky,
        commentStatus: 'OPEN',
        allowReviews: true,
        seoScore: 92,
        publishedAt: toDate(seed.publishedAt),
        updatedBy: demoUserIds.get('annecy-author-demo@atomic.local')!,
      }));

    await tx.insert(schema.blogPosts).values(blogPostsToInsert);

    await tx.insert(schema.blogPostTranslations).values(
      POST_SEEDS.flatMap((seed) =>
        LOCALES.map((locale) => {
          const translation = seed.translations[locale];
          return {
            postId: postIds.get(seed.baseSlug)!,
            locale,
            title: translation.title,
            slug: translation.slug,
            content: translation.content,
            excerpt: translation.excerpt || generateExcerpt(translation.content),
            metaTitle: translation.title,
            metaDescription: translation.metaDescription,
            metaKeywords: translation.metaKeywords,
            canonicalUrl: `https://example.com/${locale}/blog/${translation.slug}`,
            ogTitle: translation.title,
            ogDescription: translation.metaDescription,
          };
        }),
      ),
    );

    await tx.insert(schema.blogPostCategories).values(
      POST_SEEDS.flatMap((seed) =>
        seed.categorySlugs.map((categorySlug) => ({
          postId: postIds.get(seed.baseSlug)!,
          categoryId: categoryIds.get(categorySlug)!,
        })),
      ),
    );

    await tx.insert(schema.blogPostTags).values(
      POST_SEEDS.flatMap((seed) =>
        seed.tagSlugs.map((tagSlug) => ({
          postId: postIds.get(seed.baseSlug)!,
          tagId: tagIds.get(tagSlug)!,
        })),
      ),
    );

    const blogSeoRows: Array<typeof schema.blogPostSeo.$inferInsert> = POST_SEEDS.flatMap((seed) =>
        LOCALES.map((locale) => {
          const translation = seed.translations[locale];
          return {
            postId: postIds.get(seed.baseSlug)!,
            locale,
            focusKeyword: translation.focusKeyword,
            focusKeywordScore: calculateSeoScore({
              title: translation.title,
              metaTitle: translation.title,
              metaDescription: translation.metaDescription,
              content: translation.content,
              focusKeyword: translation.focusKeyword,
            }),
            readabilityScore: 83,
            metaRobots: 'index,follow' as const,
            metaOgType: 'article' as const,
            metaOgLocale: getOgLocale(locale),
            metaTwitterCard: 'summary_large_image' as const,
            schemaMarkup: buildSeoMarkup(locale, translation, seed.categorySlugs, seed.tagSlugs),
          };
        }),
      );

    await tx.insert(schema.blogPostSeo).values(blogSeoRows);

    const blogRevisionRows: Array<typeof schema.blogPostRevisions.$inferInsert> = POST_SEEDS.flatMap((seed) =>
        LOCALES.map((locale) => {
          const translation = seed.translations[locale];
          return {
            postId: postIds.get(seed.baseSlug)!,
            authorId: demoUserIds.get('annecy-author-demo@atomic.local')!,
            locale,
            title: translation.title,
            slug: translation.slug,
            content: translation.content,
            excerpt: translation.excerpt,
            status: 'PUBLISHED' as const,
            revisionNote: `Initial demo content (${locale})`,
          };
        }),
      );

    await tx.insert(schema.blogPostRevisions).values(blogRevisionRows);

    for (const post of POST_SEEDS) {
      for (const comment of post.comments) {
        commentIds.set(comment.key, randomUUID());
      }
    }

    await tx.insert(schema.blogComments).values(
      POST_SEEDS.flatMap((post) =>
        post.comments.map((comment, index) => ({
          id: commentIds.get(comment.key)!,
          postId: postIds.get(post.baseSlug)!,
          authorId: comment.authorEmail ? demoUserIds.get(comment.authorEmail)! : null,
          parentId: comment.parentKey ? commentIds.get(comment.parentKey)! : null,
          guestName: comment.guestName ?? null,
          guestEmail: comment.guestEmail ?? null,
          content: comment.content,
          status: comment.status,
          createdAt: new Date(Date.parse(post.publishedAt) + (index + 1) * 60 * 60 * 1000),
        })),
      ),
    );

    for (const post of POST_SEEDS) {
      for (const review of post.reviews) {
        reviewIds.set(review.key, randomUUID());
      }
    }

    await tx.insert(schema.blogPostReviews).values(
      POST_SEEDS.flatMap((post) =>
        post.reviews.map((review, index) => ({
          id: reviewIds.get(review.key)!,
          postId: postIds.get(post.baseSlug)!,
          authorId: demoUserIds.get(review.authorEmail)!,
          rating: review.rating,
          title: review.title,
          content: review.content,
          status: review.status,
          isRecommended: review.isRecommended,
          helpfulCount: review.helpfulByEmails?.length ?? 0,
          ipAddress: '127.0.0.1',
          createdAt: new Date(Date.parse(post.publishedAt) + (index + 2) * 60 * 60 * 1000),
        })),
      ),
    );

    const helpfulRows = POST_SEEDS.flatMap((post) =>
      post.reviews.flatMap((review) =>
        (review.helpfulByEmails ?? []).map((email) => ({
          reviewId: reviewIds.get(review.key)!,
          userId: demoUserIds.get(email)!,
          isHelpful: true,
        })),
      ),
    );
    if (helpfulRows.length > 0) {
      await tx.insert(schema.blogPostReviewHelpful).values(helpfulRows);
    }

    await tx.insert(schema.blogPostReactions).values(
      POST_SEEDS.flatMap((post) =>
        post.reactions.map((reaction) => ({
          postId: postIds.get(post.baseSlug)!,
          userId: demoUserIds.get(reaction.userEmail)!,
          reactionType: reaction.reactionType,
        })),
      ),
    );

    const reportRows = POST_SEEDS.flatMap((post) =>
      post.reports.map((report) => ({
        id: randomUUID(),
        postId: null,
        commentId: report.targetType === 'comment' ? commentIds.get(report.targetKey)! : null,
        reviewId: report.targetType === 'review' ? reviewIds.get(report.targetKey)! : null,
        reporterId: demoUserIds.get(report.reporterEmail)!,
        reason: report.reason,
        description: report.description,
        status: report.status,
      })),
    );
    if (reportRows.length > 0) {
      await tx.insert(schema.blogReports).values(reportRows);
    }
  });

  invalidateCache('blog:');

  const approvedComments = POST_SEEDS.flatMap((post) => post.comments).filter((comment) => comment.status === 'APPROVED').length;
  const pendingComments = POST_SEEDS.flatMap((post) => post.comments).filter((comment) => comment.status === 'PENDING').length;
  const approvedReviews = POST_SEEDS.flatMap((post) => post.reviews).filter((review) => review.status === 'APPROVED').length;
  const pendingReviews = POST_SEEDS.flatMap((post) => post.reviews).filter((review) => review.status === 'PENDING').length;
  const pendingReports = POST_SEEDS.flatMap((post) => post.reports).filter((report) => report.status === 'PENDING').length;

  console.log('\n[blog-demo] Seed complete.');
  console.log(`[blog-demo] Posts: ${POST_SEEDS.length} global posts with ${LOCALES.length} locales each.`);
  console.log(`[blog-demo] Categories: ${CATEGORY_SEEDS.length}, tags: ${TAG_SEEDS.length}.`);
  console.log(`[blog-demo] Comments: ${approvedComments} approved, ${pendingComments} pending.`);
  console.log(`[blog-demo] Reviews: ${approvedReviews} approved, ${pendingReviews} pending.`);
  console.log(`[blog-demo] Reports: ${pendingReports} pending moderation.`);

  for (const locale of LOCALES) {
    console.log(`\n[blog-demo] ${locale.toUpperCase()} URLs:`);
    for (const post of POST_SEEDS) {
      console.log(`  /${locale}/blog/${post.translations[locale].slug}`);
    }
  }

  console.log('\n[blog-demo] Admin moderation preview: /fr/admin/blog');
  console.log('[blog-demo] Demo users created or refreshed:');
  for (const user of DEMO_USERS) {
    console.log(`  ${user.email} / ${DEMO_PASSWORD}`);
  }
}

main()
  .catch((error) => {
    console.error('[blog-demo] Seed failed:', error instanceof Error ? error.stack ?? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await shutdownDb();
  });