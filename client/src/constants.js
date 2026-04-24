export const META_KEY = "sv4-meta";
export const PH_PREFIX = "sv4-ph-";

export const LEAGUES = [
  "Premier League", "La Liga", "Bundesliga", "Serie A", "Ligue 1",
  "Primeira Liga", "Eredivisie", "Süper Lig", "Scottish Premiership",
  "Champions League", "Europa League", "Conference League",
  "World Cup", "Euro", "Copa América", "Nations League",
  "FA Cup", "Taça de Portugal", "Copa del Rey", "DFB-Pokal",
  "Other / Unknown",
];

export const TYPES = [
  "Club Colors", "Special Colors", "Match Scarf", "National Team",
  "Retro / Vintage", "Supporter Group", "Player", "Other",
];

export const CONDITIONS = ["Mint", "Good", "Worn", "Poor"];

export const ACQUIRED = [
  "Matchday", "In Person", "Club Store", "Gift", "Traded", "Online", "Other",
];

export const FLAGS = {
  Portugal: "🇵🇹", Spain: "🇪🇸", England: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", Germany: "🇩🇪",
  France: "🇫🇷", Italy: "🇮🇹", Netherlands: "🇳🇱", Brazil: "🇧🇷",
  Argentina: "🇦🇷", Turkey: "🇹🇷", Scotland: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", Belgium: "🇧🇪",
  USA: "🇺🇸", Mexico: "🇲🇽", Japan: "🇯🇵", "South Korea": "🇰🇷",
  Morocco: "🇲🇦", Senegal: "🇸🇳", Australia: "🇦🇺", Greece: "🇬🇷",
  Croatia: "🇭🇷", Denmark: "🇩🇰", Sweden: "🇸🇪", Norway: "🇳🇴",
  Switzerland: "🇨🇭", Austria: "🇦🇹", Poland: "🇵🇱", Ukraine: "🇺🇦",
  International: "🌍", Other: "🏳️",
};

export const COND_COLORS = {
  Mint: "#00e070",
  Good: "#7ec850",
  Worn: "#e0a040",
  Poor: "#e04040",
};

export const TYPE_ICONS = {
  "Club Colors": "🎨",
  "Special Colors": "✨",
  "Match Scarf": "🏟️",
  "National Team": "🌍",
  "Retro / Vintage": "📼",
  "Supporter Group": "✊",
  "Player": "👤",
  "Other": "🏳️",
};

export const TAG_SUGGESTIONS = [
  "signed", "limited", "away day", "gift from dad", "gift from mum",
  "first scarf", "double-sided", "framed", "worn", "game-worn",
  "anniversary", "champions", "promotion", "derby", "cup final",
  "away end", "rare", "handmade", "official", "bootleg",
];

export const BLANK_FORM = {
  club: "", country: "", league: "", type: "Club Colors",
  year: "", notes: "", color1: "#c8102e", color2: "#ffffff",
  condition: "Good", acquired: "", playerName: "", fixture: "",
  tags: [], favorite: false,
};
