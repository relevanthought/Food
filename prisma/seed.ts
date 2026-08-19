import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, ReviewSource, SocialPlatform, Sentiment } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

// --- deterministic PRNG so the seed produces the same "random" dataset every run ---
let seed = 42;
function rand(): number {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return seed / 0x7fffffff;
}
function randInt(min: number, max: number): number {
  return Math.floor(rand() * (max - min + 1)) + min;
}
function pick<T>(arr: T[]): T {
  return arr[randInt(0, arr.length - 1)];
}
function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

const REVIEW_SOURCES: ReviewSource[] = ["GOOGLE", "YELP", "OPENTABLE", "TRIPADVISOR"];
const PLATFORMS: SocialPlatform[] = ["X", "INSTAGRAM", "TIKTOK"];

const POSITIVE_LINES = [
  "Honestly the best {dish} I've had in years.",
  "{dish} blew me away — perfectly balanced and generous portion.",
  "Came just for the {dish} and it did not disappoint.",
  "My table fought over the last bite of {dish}.",
  "Will drive across town for this {dish} again.",
  "Chef nailed the {dish}. Ten out of ten.",
];
const NEUTRAL_LINES = [
  "{dish} was fine, nothing special but solid.",
  "Decent {dish}, a bit pricey for the portion.",
  "{dish} is good but I've had better elsewhere.",
  "Service was slow but the {dish} arrived warm at least.",
];
const NEGATIVE_LINES = [
  "{dish} was way too salty for my taste.",
  "Expected more from the {dish} given the price.",
  "{dish} arrived cold and underseasoned.",
  "Not going back for the {dish}, honestly disappointing.",
];
const AUTHOR_FIRST = ["Alex", "Jordan", "Priya", "Marcus", "Elena", "Sam", "Nina", "Devon", "Casey", "Yuki", "Omar", "Grace"];
const AUTHOR_LAST = ["T.", "R.", "M.", "K.", "L.", "S.", "B.", "W.", "D.", "C."];

function reviewLine(dishName: string, tier: "positive" | "neutral" | "negative"): string {
  const bank = tier === "positive" ? POSITIVE_LINES : tier === "neutral" ? NEUTRAL_LINES : NEGATIVE_LINES;
  return pick(bank).replace("{dish}", dishName);
}

interface ReviewProfile {
  count: number;
  avgRating: number; // 1-5, center of distribution
  spreadDays: number; // reviews spread over the last N days
}

function generateReviews(dishName: string, profile: ReviewProfile) {
  const reviews = [];
  for (let i = 0; i < profile.count; i++) {
    const wobble = randInt(-8, 8) / 10;
    const rating = Math.min(5, Math.max(1, Math.round(profile.avgRating + wobble)));
    const tier = rating >= 4 ? "positive" : rating === 3 ? "neutral" : "negative";
    reviews.push({
      source: pick(REVIEW_SOURCES),
      authorName: `${pick(AUTHOR_FIRST)} ${pick(AUTHOR_LAST)}`,
      rating,
      text: reviewLine(dishName, tier),
      publishedAt: daysAgo(randInt(0, profile.spreadDays)),
    });
  }
  return reviews;
}

type BuzzTier = "none" | "low" | "moderate" | "viral";

interface BuzzProfile {
  tier: BuzzTier;
  count: number;
  spreadDays: number; // how far back the mentions go
  sentimentMix: [number, number, number]; // weights for [positive, neutral, negative]
}

const CAPTION_TEMPLATES = [
  "okay this {dish} lives in my head rent free 😭",
  "POV: you finally tried the {dish} everyone's been posting",
  "{dish} run with the girlies tonight",
  "rating every {dish} in the city, this one's a 9/10",
  "no because the {dish} here??",
  "add this to your must-try list: {dish}",
];

function engagementForTier(tier: BuzzTier) {
  switch (tier) {
    case "viral":
      return { likes: randInt(15000, 120000), comments: randInt(400, 5000), shares: randInt(800, 9000), views: randInt(200000, 2000000) };
    case "moderate":
      return { likes: randInt(500, 4000), comments: randInt(20, 250), shares: randInt(30, 400), views: randInt(8000, 60000) };
    case "low":
      return { likes: randInt(10, 300), comments: randInt(0, 20), shares: randInt(0, 25), views: randInt(200, 4000) };
    default:
      return { likes: 0, comments: 0, shares: 0, views: 0 };
  }
}

function pickSentiment(mix: [number, number, number]): Sentiment {
  const r = rand();
  const [p, n] = mix;
  if (r < p) return "POSITIVE";
  if (r < p + n) return "NEUTRAL";
  return "NEGATIVE";
}

function generateMentions(dishName: string, profile: BuzzProfile) {
  if (profile.tier === "none" || profile.count === 0) return [];
  const mentions = [];
  for (let i = 0; i < profile.count; i++) {
    const platform = pick(PLATFORMS);
    const eng = engagementForTier(profile.tier);
    // scale down engagement a bit per-post so `count` viral posts don't all hit the ceiling
    const scale = 0.4 + rand() * 0.6;
    mentions.push({
      platform,
      authorHandle: `@${pick(AUTHOR_FIRST).toLowerCase()}${randInt(10, 999)}`,
      caption: pick(CAPTION_TEMPLATES).replace("{dish}", dishName),
      url: `https://example.com/${platform.toLowerCase()}/${randInt(100000, 999999)}`,
      likeCount: Math.round(eng.likes * scale),
      commentCount: Math.round(eng.comments * scale),
      shareCount: Math.round(eng.shares * scale),
      viewCount: Math.round(eng.views * scale),
      sentiment: pickSentiment(profile.sentimentMix),
      postedAt: daysAgo(randInt(0, profile.spreadDays)),
    });
  }
  return mentions;
}

// --- profiles used to give the dataset realistic variety ---
const PROFILES: Record<string, { reviews: ReviewProfile; buzz: BuzzProfile }> = {
  viralFavorite: {
    reviews: { count: 45, avgRating: 4.7, spreadDays: 240 },
    buzz: { tier: "viral", count: 10, spreadDays: 25, sentimentMix: [0.85, 0.12, 0.03] },
  },
  hiddenGem: {
    reviews: { count: 9, avgRating: 4.8, spreadDays: 300 },
    buzz: { tier: "low", count: 2, spreadDays: 120, sentimentMix: [0.8, 0.15, 0.05] },
  },
  popularAverage: {
    reviews: { count: 30, avgRating: 4.0, spreadDays: 365 },
    buzz: { tier: "moderate", count: 5, spreadDays: 90, sentimentMix: [0.65, 0.25, 0.1] },
  },
  overhyped: {
    reviews: { count: 22, avgRating: 3.3, spreadDays: 200 },
    buzz: { tier: "viral", count: 6, spreadDays: 20, sentimentMix: [0.55, 0.25, 0.2] },
  },
  quietClassic: {
    reviews: { count: 60, avgRating: 4.4, spreadDays: 365 },
    buzz: { tier: "none", count: 0, spreadDays: 0, sentimentMix: [1, 0, 0] },
  },
  newAndRising: {
    reviews: { count: 6, avgRating: 4.6, spreadDays: 30 },
    buzz: { tier: "moderate", count: 7, spreadDays: 14, sentimentMix: [0.9, 0.1, 0] },
  },
};

const profileCycle = Object.keys(PROFILES) as (keyof typeof PROFILES)[];

interface DishSeed {
  name: string;
  description: string;
  category: string;
  price: number;
  emoji: string;
}

interface RestaurantSeed {
  name: string;
  cuisine: string;
  city: string;
  address: string;
  priceTier: number;
  emoji: string;
  dishes: DishSeed[];
}

const RESTAURANTS: RestaurantSeed[] = [
  {
    name: "Luigi's Trattoria",
    cuisine: "Italian",
    city: "Boston, MA",
    address: "142 Hanover St, Boston, MA",
    priceTier: 3,
    emoji: "🇮🇹",
    dishes: [
      { name: "Spaghetti Carbonara", description: "Guanciale, pecorino, black pepper, egg yolk.", category: "Entree", price: 22, emoji: "🍝" },
      { name: "Margherita Pizza", description: "San Marzano tomato, fior di latte, basil.", category: "Entree", price: 18, emoji: "🍕" },
      { name: "Tiramisu", description: "Espresso-soaked ladyfingers, mascarpone.", category: "Dessert", price: 10, emoji: "🍰" },
      { name: "Osso Buco", description: "Braised veal shank, saffron risotto.", category: "Entree", price: 34, emoji: "🍖" },
    ],
  },
  {
    name: "Sakura Sushi House",
    cuisine: "Japanese",
    city: "San Francisco, CA",
    address: "88 Fillmore St, San Francisco, CA",
    priceTier: 4,
    emoji: "🇯🇵",
    dishes: [
      { name: "Toro Nigiri", description: "Fatty bluefin tuna over seasoned rice.", category: "Entree", price: 14, emoji: "🍣" },
      { name: "Dragon Roll", description: "Eel, cucumber, avocado, unagi glaze.", category: "Entree", price: 16, emoji: "🐉" },
      { name: "Chicken Katsu", description: "Panko-fried chicken thigh, tonkatsu sauce.", category: "Entree", price: 19, emoji: "🍗" },
      { name: "Matcha Cheesecake", description: "Ceremonial-grade matcha, graham crust.", category: "Dessert", price: 9, emoji: "🍵" },
    ],
  },
  {
    name: "El Fuego Taqueria",
    cuisine: "Mexican",
    city: "Austin, TX",
    address: "501 E 6th St, Austin, TX",
    priceTier: 2,
    emoji: "🇲🇽",
    dishes: [
      { name: "Al Pastor Tacos", description: "Marinated pork, pineapple, cilantro, onion.", category: "Entree", price: 12, emoji: "🌮" },
      { name: "Birria Ramen Tacos", description: "Braised beef birria, consommé, noodles.", category: "Entree", price: 15, emoji: "🍜" },
      { name: "Elote", description: "Grilled corn, cotija, chili-lime crema.", category: "Appetizer", price: 7, emoji: "🌽" },
      { name: "Churros", description: "Cinnamon sugar, chocolate dipping sauce.", category: "Dessert", price: 8, emoji: "🥨" },
    ],
  },
  {
    name: "Spice Route",
    cuisine: "Indian",
    city: "Chicago, IL",
    address: "2211 W Devon Ave, Chicago, IL",
    priceTier: 2,
    emoji: "🇮🇳",
    dishes: [
      { name: "Butter Chicken", description: "Tomato-cream curry, tandoori chicken.", category: "Entree", price: 17, emoji: "🍛" },
      { name: "Lamb Vindaloo", description: "Fiery Goan curry, potatoes.", category: "Entree", price: 19, emoji: "🌶️" },
      { name: "Garlic Naan", description: "Tandoor-baked flatbread, roasted garlic.", category: "Appetizer", price: 5, emoji: "🫓" },
      { name: "Gulab Jamun", description: "Fried milk dumplings in rose syrup.", category: "Dessert", price: 6, emoji: "🍮" },
    ],
  },
  {
    name: "The Green Fork",
    cuisine: "Vegan / Modern American",
    city: "Portland, OR",
    address: "3355 SE Belmont St, Portland, OR",
    priceTier: 3,
    emoji: "🌱",
    dishes: [
      { name: "Jackfruit Sliders", description: "Smoked jackfruit, slaw, brioche.", category: "Entree", price: 16, emoji: "🍔" },
      { name: "Cauliflower Wings", description: "Buffalo-glazed, vegan ranch.", category: "Appetizer", price: 12, emoji: "🍗" },
      { name: "Beet Tartare", description: "Roasted beets, capers, cashew crème.", category: "Appetizer", price: 13, emoji: "🥗" },
      { name: "Cashew Cheesecake", description: "Raw cashew base, berry compote.", category: "Dessert", price: 9, emoji: "🍰" },
    ],
  },
  {
    name: "Golden Wok",
    cuisine: "Chinese",
    city: "New York, NY",
    address: "42 Mott St, New York, NY",
    priceTier: 2,
    emoji: "🇨🇳",
    dishes: [
      { name: "Soup Dumplings", description: "Xiaolongbao, pork and ginger broth.", category: "Appetizer", price: 11, emoji: "🥟" },
      { name: "Kung Pao Chicken", description: "Peanuts, dried chili, Sichuan peppercorn.", category: "Entree", price: 18, emoji: "🥡" },
      { name: "Peking Duck", description: "Crispy skin, scallion pancakes, hoisin.", category: "Entree", price: 42, emoji: "🦆" },
      { name: "Mapo Tofu", description: "Silken tofu, fermented bean paste, pork.", category: "Entree", price: 15, emoji: "🌶️" },
    ],
  },
];

async function main() {
  console.log("Clearing existing data...");
  await db.socialMention.deleteMany();
  await db.review.deleteMany();
  await db.dish.deleteMany();
  await db.restaurant.deleteMany();

  let profileIndex = 0;
  for (const r of RESTAURANTS) {
    const restaurant = await db.restaurant.create({
      data: {
        name: r.name,
        cuisine: r.cuisine,
        city: r.city,
        address: r.address,
        priceTier: r.priceTier,
        imageUrl: r.emoji,
      },
    });

    for (const d of r.dishes) {
      const profileKey = profileCycle[profileIndex % profileCycle.length];
      profileIndex += 1;
      const profile = PROFILES[profileKey];

      const dish = await db.dish.create({
        data: {
          name: d.name,
          description: d.description,
          category: d.category,
          price: d.price,
          imageUrl: d.emoji,
          restaurantId: restaurant.id,
        },
      });

      const reviews = generateReviews(d.name, profile.reviews);
      const mentions = generateMentions(d.name, profile.buzz);

      if (reviews.length) {
        await db.review.createMany({ data: reviews.map((rv) => ({ ...rv, dishId: dish.id })) });
      }
      if (mentions.length) {
        await db.socialMention.createMany({ data: mentions.map((m) => ({ ...m, dishId: dish.id })) });
      }

      console.log(`  seeded ${d.name} (${profileKey}): ${reviews.length} reviews, ${mentions.length} mentions`);
    }
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
