// Exhibit content from "Diwali Exhibition 2026 – Final Content Proposal" (26 slides) and the linked
// "Exhibition Brainstorming Ideas" content document.
import type { SectionId } from './types';

export interface SectionInfo {
  id: SectionId;
  num?: number;
  title: string;
  sub: string;
  color: string; // plan accent
  core: string;
  medium: string;
  build: string[];
  lightingIntent: string[];
}

export const SECTIONS: SectionInfo[] = [
  {
    id: 'entry',
    title: 'Welcome',
    sub: 'Entrance from the Foyer',
    color: '#d9b45b',
    core: 'Diwali Exhibition 2026 — Timeless Hindu Heritage.',
    medium: 'Tension-fabric welcome header over the in-lane, retractable-belt stanchions splitting IN / OUT through the 22′ opening.',
    build: ['20′ × 2′6″ stretch banner on a 10′ pipe frame', 'Intro / map poster on an A-frame', 'Belt stanchions: in-lane north, out-lane south'],
    lightingIntent: ['Warm amber up-light on the header so it reads from the Foyer', 'Keep the lane itself at ≥ 100 lx so nobody trips on stanchion bases'],
  },
  {
    id: 's1',
    num: 1,
    title: 'Hindu Festivals',
    sub: 'Many Traditions. One Light.',
    color: '#e9a43f',
    core: 'Across India, festivals may look different — but they bring families and communities together in devotion, gratitude, and joy.',
    medium: 'Large map of India with raised 3D features depicting festivals from different regions, surrounded by divos, with poster explanations.',
    build: [
      '12′ × 12′ plywood deck (10′ × 10′ map field, 1′ border flush to deck edge), 36″ to top of deck, 10′ × 10′ support base',
      'Map objects: Navratri garba dancers (Gujarat), Ganesh murti (Maharashtra), Durga Puja pandal (West Bengal), Rath Yatra chariot (Odisha), bow & arrow / Ayodhya (Uttar Pradesh), Holi colour bursts (Punjab), Pongal pots & sugarcane (Tamil Nadu), Onam snake boat (Kerala), Mysuru Dasara elephants (Karnataka), Ugadi mango leaves (Andhra Pradesh), Bathukamma flowers (Telangana)',
      'U-shaped 10′ backdrop carrying 8 posters and the header “Many Traditions. One Light.”',
      'LED tea-light divos around the map border',
    ],
    lightingIntent: ['Warm top-light on the map from two front corners (no shadows of heads on the map)', 'Posters 200–300 lx with CRI 90 spots', 'Faces around the map photo-ready from the south side'],
  },
  {
    id: 's2',
    num: 2,
    title: 'Hindu Rites & Traditions',
    sub: 'The Game of Life — 16 Sacred Steps',
    color: '#b98ba7',
    core: 'Sanatan Dharma believes life to be a sacred journey. From before birth to the final rites after death, each important moment is marked by Samskaras.',
    medium: 'Engraved panel wall (L-shape: 16′ run + 4′ corner + 16′ run, 8′ tall, 2′ deep) with 16 stage panels and lift-flap reflection boxes; lily-pad floor markers where visitors stand, listen to balaks/balikas and reflect.',
    build: ['Four 8′ × 8′ × 2′ frame modules + corner panel, nominal 2×3 framing', '16 panels 2′ × 7′9″ (two per 4′ × 8′ engraved board)', '16 lily pads on the floor'],
    lightingIntent: ['Even vertical light along all 36 linear feet of wall — no hot spots between panels', 'Light the lily-pad standing spots so faces read when balaks/balikas present'],
  },
  {
    id: 's3',
    num: 3,
    title: 'Hindu Way of Life',
    sub: 'Hindu Jivan Shaili — a walk-through home',
    color: '#9fb6a4',
    core: 'How our culture is expressed through daily living, personal habits, and lifestyle choices.',
    medium: '24′ × 24′ walk-through exhibit house: 8′ walls, 2′ perimeter modules, stretched sheer fabric ceiling.',
    build: [
      'Areas: I Entrance (shoe rack, tulsi, asopalov toran) · II Living room (harmonium, tabla, Kirtan Muktavali) · III Ghar Mandir · IV Seva corner (gullak, volunteer badge, hard hat) · V Kitchen (thaali, fruits, grains) · VI Reading corner (Vachanamrut, Satsang Diksha, Shikshapatri, Gita, beanbag, lamp) · VII Exit reflection (tall mirror)',
      'Drywall on the visitor face, exposed 2×3 framing outside',
    ],
    lightingIntent: ['Daylight-like glow through the sheer ceiling from fixtures outside the house', 'Warm practicals (standing lamp, mandir diyas) for a lived-in feel', 'Ghar Mandir must photograph well'],
  },
  {
    id: 's4',
    num: 4,
    title: 'Hindu Beliefs & Worldview',
    sub: 'Six questions, six nodes',
    color: '#8fa3c0',
    core: 'Hinduism provides a philosophical framework that answers life’s most fundamental questions — an interconnected journey.',
    medium: 'Pipe-and-drape room with six nodes in two staggered rows: 1 Who is God? · 2 Who am I? · 3 Why do my actions matter? · 4 What happens after this life? · 5 How does God remain accessible? · 6 Why is a Guru important?',
    build: [
      '1 — 8′ × 8′ × 2′ layered diorama (temples, hills, universe, halo + figure), warm LED strip behind the front layer',
      '2 — illuminated gold mirrors on a carpeted riser with string lights',
      '3 — touch-screen ripple-effect kiosk',
      '4 — TV on a mobile stand with arched side panels (life-forms tree)',
      '5 — 8′ × 3½′ × 3½′ fibre-optic tower above a murti pedestal, clear acrylic sides',
      '6 — 8′ × 8′ × 2′ ancient-map diorama with Bapa’s silhouette in beads, carved arch',
      'Each node has a poster panel on an easel',
    ],
    lightingIntent: ['Deliberately dark room so dioramas, screens and fibre optics glow', 'Every poster still readable (≥ 150 lx) with tight framed spots', 'No light on screens or the fibre-optic tower; UV for the cosmos layer'],
  },
  {
    id: 's5',
    num: 5,
    title: 'Hindu Core Values',
    sub: 'Hindu Mulya — Choose a value. Make a Sankalp. Let it blossom.',
    color: '#d69e7a',
    core: 'Just as a lotus grows through murky waters to bloom in untainted purity, the Sant guides us toward Moksha.',
    medium: '16′ lotus nail-art backdrop (8′ tall, 2′ deep): 4′ poster zone + 12′ nail-art zone; visitors add coloured bands to one of seven value-lotuses.',
    build: ['Two 8′ × 8′ × 2′ frame modules, four 4′ × 8′ sheets of ½″ sanded plywood', 'Values: Dharma, Ahimsa, Satya, Seva, Education, Respect & Gratitude, Self-Discipline', 'Band trays and sankalp cards at a table in front'],
    lightingIntent: ['Interactive — hands and faces need good, soft light (photo spot)', 'Low side/up-light rakes across the nails so the bands glow in 3D'],
  },
  {
    id: 's6',
    num: 6,
    title: 'Adhar Stambh',
    sub: 'The Three Pillars — Shastra · Mandir · Sant',
    color: '#c9b3a5',
    core: 'Hindu culture has flourished as a living tradition for thousands of years because it rests on three unshakeable pillars.',
    medium: 'Wooden pillars — a carved three-bay façade: Mandir (connects us with the Divine), Shastra (guides us with wisdom), Sant (shows us the path).',
    build: ['≈ 20′ wide × 11′ tall × 6′ deep façade with four carved pillars and an entablature (“The Three Pillars of Hinduism”)', 'Self-lit inner bays'],
    lightingIntent: ['Finale & group-photo backdrop — strongest, most even face light in the hall', 'Warm grazing light on the carved pillars'],
  },
  {
    id: 'photo',
    title: 'Diwali Photo Point',
    sub: 'Suggested addition',
    color: '#86b391',
    core: 'A dedicated, perfectly lit place for family photos so other exhibits stay uncrowded.',
    medium: '10′ × 8′ stretched-fabric backdrop with two soft high-CRI keys.',
    build: ['10′ × 8′ SEG/pillowcase tension-fabric frame', 'Floor mark for where to stand'],
    lightingIntent: ['400–600 lx on faces, key:fill ≈ 2:1, CRI 95'],
  },
  {
    id: 'stage',
    title: 'Stage masking',
    sub: 'East backdrop of the hall',
    color: '#7a6f69',
    core: 'Hides stage clutter and gives the hall a finished, coloured end wall.',
    medium: '12′ black velour pipe & drape along the stage edge with a centred banner.',
    build: ['70′ run, 12′ uprights', '16′ × 6′ banner'],
    lightingIntent: ['Saffron/amber wash from the two wall-washer bars'],
  },
];

export const SECTION_MAP = Object.fromEntries(SECTIONS.map((s) => [s.id, s])) as Record<SectionId, SectionInfo>;

export const SAMSKARAS: { name: string; title: string; q: string; wall: 1 | 2 }[] = [
  { name: 'Garbhadhan', title: 'Beginning a Family', q: 'What values and devotion do I want to pass on to the next generation?', wall: 1 },
  { name: 'Pumsavan', title: 'Caring for Life Before Birth', q: 'How can I create a peaceful and spiritual environment for this new life?', wall: 1 },
  { name: 'Simantonayan', title: 'Creating a Sacred Environment', q: 'How can our family create a loving, positive, and spiritual environment for this new life?', wall: 1 },
  { name: 'Jatakarma', title: 'Welcoming a New Life', q: 'How will I help this child grow not only physically, but also in dharma and bhakti to God?', wall: 1 },
  { name: 'Namakaran', title: 'A Name with Meaning', q: 'What does my name connect me to — and what good qualities do I want my name to represent?', wall: 1 },
  { name: 'Nishkaram', title: 'First Steps into the World', q: 'As I step into the world, how do I keep God with me wherever I go?', wall: 1 },
  { name: 'Annaprashan', title: 'Receiving the Gift of Food', q: 'When I eat each day, how can I remember that my food is a blessing from God?', wall: 1 },
  { name: 'Chudakarma', title: 'A Fresh Beginning', q: 'What is one habit or quality I can improve as I grow?', wall: 1 },
  { name: 'Kanavedh', title: 'Connected to Tradition', q: 'What tradition in my family helps me feel connected to who I am?', wall: 2 },
  { name: 'Vidyarambh', title: 'The Beginning of Learning', q: 'How can I use what I learn to become a better person and help others?', wall: 2 },
  { name: 'Upanayan', title: 'A Life of Spiritual Discipline', q: 'What spiritual practice can I be more disciplined about every day?', wall: 2 },
  { name: 'Vedarambh', title: 'Learning Sacred Knowledge', q: 'Am I giving as much importance to learning about God, sant and dharma as about the world?', wall: 2 },
  { name: 'Keshant', title: 'Growing up with Self-Control', q: 'As I become more independent, how can I also grow in self-control and responsibility?', wall: 2 },
  { name: 'Samavartan', title: 'Taking Learning Into Life', q: 'How will I use my knowledge and talents to serve others and live in my dharma?', wall: 2 },
  { name: 'Vivaha', title: 'Two People, One Sacred Partnership', q: 'How can we help each other grow closer to God while building our life together?', wall: 2 },
  { name: 'Antyeshti', title: 'The Final Rite, Not the End', q: 'If my life is temporary and my atma is eternal, what should matter most in how I live today?', wall: 2 },
];

export const PANEL_COLORS = ['#8fbf5a', '#c070c9', '#e0a44a', '#57a0d8', '#f2c94c', '#6fcf97', '#eb5757', '#9b8cf2', '#2d9cdb', '#f2994a', '#bb6bd9', '#27ae60', '#e2b93b', '#56ccf2', '#f06292', '#a1887f'];

export const FESTIVALS = [
  { state: 'Gujarat', fest: 'Navratri', obj: 'garba dancers & dandiya', color: '#e2a03f', u: -0.33, v: 0.05 },
  { state: 'Maharashtra', fest: 'Ganesh Chaturthi', obj: 'Ganesh murti', color: '#f2994a', u: -0.18, v: -0.12 },
  { state: 'West Bengal', fest: 'Durga Puja', obj: 'pandal', color: '#eb5757', u: 0.27, v: 0.08 },
  { state: 'Odisha', fest: 'Rath Yatra', obj: 'chariot & horses', color: '#d4a017', u: 0.14, v: -0.04 },
  { state: 'Uttar Pradesh', fest: 'Ram Navami / Janmashtami', obj: 'Ayodhya, bow & arrow', color: '#f2c94c', u: 0.02, v: 0.22 },
  { state: 'Punjab', fest: 'Holi', obj: 'colour bursts', color: '#bb6bd9', u: -0.12, v: 0.38 },
  { state: 'Tamil Nadu', fest: 'Pongal', obj: 'pots, rice & sugarcane', color: '#6fcf97', u: 0.0, v: -0.4 },
  { state: 'Kerala', fest: 'Onam', obj: 'snake boat', color: '#27ae60', u: -0.08, v: -0.43 },
  { state: 'Karnataka', fest: 'Mysuru Dasara', obj: 'mini elephants', color: '#9b8cf2', u: -0.12, v: -0.27 },
  { state: 'Andhra Pradesh', fest: 'Ugadi', obj: 'mango leaves', color: '#56ccf2', u: 0.06, v: -0.22 },
  { state: 'Telangana', fest: 'Bathukamma', obj: 'flower stacks', color: '#f06292', u: 0.02, v: -0.12 },
];

export const FESTIVAL_POSTERS = [
  'More than a Celebration',
  'Diwali — Light over Darkness',
  'Navratri — Grace over Ego',
  'Durga Puja — Victory over Illusion',
  'Holi — Faith over Fear',
  'Onam — Unity over Pride',
  'Celebration Connects Us',
  'The Five Days of Diwali',
];

export const NODES = [
  { n: 1, title: 'Who is God?', sub: 'Parabrahman', exhibit: 'Layered diorama — Ekam Satyam' },
  { n: 2, title: 'Who am I?', sub: 'The Atma', exhibit: 'Illuminated mirrors' },
  { n: 3, title: 'Why do my actions matter?', sub: 'Karma', exhibit: 'Touch-screen ripple' },
  { n: 4, title: 'What happens after this life?', sub: 'Punarjanma', exhibit: 'TV — 8.4 million life forms' },
  { n: 5, title: 'How does God remain accessible?', sub: 'Murti Puja', exhibit: 'Fibre-optic murti tower' },
  { n: 6, title: 'Why is a Guru important?', sub: 'The Satpurush', exhibit: 'Ancient-map diorama' },
];

export const VALUES = [
  { v: 'Dharma', s: 'I will do what is right', c: '#e2574c' },
  { v: 'Ahimsa', s: 'I will choose kindness', c: '#f2994a' },
  { v: 'Satya', s: 'I will choose truth', c: '#f2c94c' },
  { v: 'Seva', s: 'I will serve others', c: '#6fcf97' },
  { v: 'Education', s: 'I will keep learning', c: '#2d9cdb' },
  { v: 'Respect & Gratitude', s: 'I will appreciate what I have', c: '#bb6bd9' },
  { v: 'Self Discipline', s: 'I will practice self-control', c: '#f06292' },
];

export const HOUSE_AREAS = ['I Entrance', 'II Living Room', 'III Ghar Mandir', 'IV Seva Corner', 'V Kitchen', 'VI Reading Corner', 'VII Exit Reflection'];
