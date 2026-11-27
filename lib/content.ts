// Section list for Diwali 2027 ("Welcome to India"). The 2026 content (samskaras, festivals, nodes, values) is kept below for the
// 2026 exhibit types; the 2026 sections themselves are on the archive/diwali-2026 branch.
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
  // Diwali 2027 · "Welcome to India" (planning notes, Nov 13). Content and interactives are still to come.
  {
    id: 'entry',
    num: 1,
    title: 'Welcome to India',
    sub: 'Festive entrance and introduction',
    color: '#d9b45b',
    core: 'Introduce the exhibition: a pilgrimage across India through its tirths, and the feelings and values each one carries.',
    medium: 'Drape walls guide visitors in from the south doors; two 8′ × 8′ L-shaped intro poster walls in the corner; festive and thematic (toran, diyas, rangoli).',
    build: ['Two 8′ × 8′ intro panels forming an L in the corner', 'Additional 8′ walls can carry more intro content', 'Marigold toran and diya strings along the entry walls'],
    lightingIntent: ['Warm, festive and welcoming; to be planned'],
  },
  {
    id: 's1',
    num: 2,
    title: 'Ayodhya',
    sub: 'The Multi Room · Shri Ram, the origin of Diwali, Nilkanth Varni',
    color: '#e9a43f',
    core: 'Diwali begins in Ayodhya: the return of Shri Ram, and the home Ghanshyam left at 11 to become Nilkanth Varni.',
    medium: 'Poster walls on both sides (Shri Ram’s life, the origins of Diwali, Nilkanth Varni in Ayodhya); one beautiful circle of diyas in the middle; an annakut display is an option.',
    build: ['10′ three-step diya circle', 'Posters on both long walls', 'Optional annakut display'],
    lightingIntent: ['To be planned'],
  },
  {
    id: 's2',
    num: 3,
    title: 'Rameswaram → Kanyakumari',
    sub: 'The coastal walk · the boat',
    color: '#5fa8dc',
    core: 'Seva (Nilkanth carrying Sevakram’s bundle) and perseverance (reaching the tip of India and walking on).',
    medium: 'A walled room; the main exhibit is the boat on a projected sea, with the three-seas horizon ahead.',
    build: ['Boat deck on stage decks (~8″) with plywood hull sides and a cloth canopy', 'Poster walls at both ends, sea projection between'],
    lightingIntent: ['To be planned'],
  },
  {
    id: 's3',
    num: 4,
    title: 'Jagannath Puri',
    sub: 'Three raths',
    color: '#b23a48',
    core: 'Forgiveness: Nilkanth stayed ten months in Puri to help even those who plotted against him.',
    medium: 'A room-like structure with the three raths along the south wall and minimal content on the walls; exit near the east wall into Kashi.',
    build: ['Three printed raths with foam wheels and cloth canopies'],
    lightingIntent: ['To be planned'],
  },
  {
    id: 's4',
    num: 5,
    title: 'Kashi + Triveni Sangam',
    sub: 'The ghats, the Ganga and the meeting of three rivers',
    color: '#8fa3c0',
    core: 'Wisdom shared with humility; many lights, one river.',
    medium: 'As in the renders: bleachers, a walkway and the Ganga flowing into the three Sangam pools; projection on both sides.',
    build: ['Sandstone bleachers', 'Six 12′ ghat flats', 'Real-water channel and three raised pools'],
    lightingIntent: ['Projection on both sides; to be planned'],
  },
  {
    id: 's5',
    num: 6,
    title: 'Himalaya + Nilkanth Varni',
    sub: 'Char Dham and the abhishek',
    color: '#c9d8e8',
    core: 'Resolve and tapas: Nilkanth barefoot in the Himalayan snow.',
    medium: 'Snowy and cold as you enter; four projection-mapped mountains, each with its own small item; the Nilkanth abhishek stage beside them.',
    build: ['Four 8′-wide layered mountains', 'Snow floor', '15′ × 15′ abhishek stage with queue'],
    lightingIntent: ['Cold, snowy; projection on the mountains; to be planned'],
  },
  {
    id: 's6',
    num: 7,
    title: 'BAPS & Satsang',
    sub: 'The middle area · Akshardham',
    color: '#c9b3a5',
    core: 'Where the journey leads: BAPS and satsang today.',
    medium: 'Open middle area with the Akshardham model, the guru parampara panel and key messages.',
    build: ['Akshardham model', 'Guru parampara panel', 'Key-message panels'],
    lightingIntent: ['To be planned'],
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
