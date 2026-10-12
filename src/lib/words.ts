import { localDateStr } from "@/lib/time";

// Daily word answers (common 5-letter words). Order is shuffled by the date formula below.
export const WORD_ANSWERS = (
  "about above actor acute admit adopt adult after again agent agree ahead alarm album alert alike alive allow alone along " +
  "alter amber amuse angel anger angle angry apart apple apply arena argue arise armor aroma arrow aside asset audio avoid " +
  "awake award aware bacon badge baker basic beach beard beast began begin being below bench berry birth black blade blame " +
  "blank blast blaze blend bless blind block bloom blush board boast bonus boost booth brain brave bread break brick bride " +
  "brief bring brisk broad brown brush buddy build bunch candy canoe cargo carry catch cause chain chair charm chart chase " +
  "cheap check cheek cheer chess chest chick chief child chill choir chose cider claim class clean clear clerk click cliff " +
  "climb clock close cloth cloud coach coast cocoa color comet coral couch count court cover craft crane crash crazy cream " +
  "crisp crowd crown crumb crust curve cycle daily dairy daisy dance dated dealt decor delay depth diary dizzy dough draft " +
  "drama dream dress drift drink drive eager early earth eaten elbow empty enjoy enter equal error essay event every exact " +
  "extra fable faint fairy faith false fancy feast fence ferry fever field fiery fifty final flame flash fleet float flock " +
  "flour fluff focus foggy force forge forth forum found frame fresh front frost fruit funny fuzzy giant giddy given glass " +
  "glide globe glory glove grace grade grain grand grape grass great green greet grill groan group grove guard guess guest " +
  "guide habit happy harsh heart heavy hedge hello hobby honey horse hotel house human humor hurry ideal image index inner " +
  "input irony ivory jelly jewel joint jolly juice jumpy kayak kebab knife knock known label laser laugh layer learn lemon " +
  "level light lilac limit linen liver llama lobby local lodge logic loose lover lucky lunar lunch magic major mango maple " +
  "march marry match mayor medal melon mercy merry metal minty mirth model money month moose motto mount mouse mouth movie " +
  "music nacho naive nerve never night noble noise north novel nurse ocean offer often olive onion opera orbit order otter " +
  "outer paint panda panel paper party pasta patch peace peach pearl pedal penny perky phone photo piano picky pilot pizza " +
  "place plain plane plant plate plaza plush poems point polar porch pouch pound power press pride prime print prize proud " +
  "punch puppy purse queen quest quick quiet quilt quirk quote radar radio rainy raise ranch range rapid raven reach ready " +
  "relax reply rhyme rider ridge right rival river roast robin robot rocky rouge round route royal rugby ruler rusty salad " +
  "sauce scarf scene scent scone scout serve seven shade shake shape share shark sharp sheep sheet shelf shell shine shiny " +
  "shirt shore short shout sight silly since skate skill skirt sleep slice slide smart smile smoke snack snail snake sneak " +
  "solid sorry sound south space spare spark speak spice spike spoon sport spray squad stack stage stair stamp stand stare " +
  "start state steak steam steel stick still stone storm story stove straw stray study style sugar sunny super surf swan " +
  "sweet swift swing table taste teach teddy tempo thank theme thick thing think thumb tiger toast today token tooth topic " +
  "torch total touch tower towel toxic track trade trail train treat trend trial tribe trick truly trust truth tulip tuner " +
  "uncle under unity until upper upset urban usual valid value vapor vault venue verse video vigor vinyl viola visit vital " +
  "vivid vocal voice waltz watch water waved weary whale wheat wheel while whirl whisk white whole witty woman world worry " +
  "worth wound woven wrist write yacht yearn yeast young youth zebra zesty"
)
  .split(/\s+/)
  .filter((w) => w.length === 5);

/** Same day for both of us: the UK calendar day. */
export const WORD_TZ = "Europe/London";
export const WORD_MAX_GUESSES = 6;

export function todayWDate(now = new Date()) {
  return localDateStr(now, WORD_TZ);
}

/** Deterministic but not obvious: steps through the list with a large stride. */
export function answerFor(wdate: string) {
  const [y, m, d] = wdate.split("-").map(Number);
  const day = Math.floor(Date.UTC(y, m - 1, d) / 86400000);
  const n = WORD_ANSWERS.length;
  let stride = 7919 % n;
  while (gcd(stride, n) !== 1) stride++;
  return WORD_ANSWERS[(day * stride + 17) % n];
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

export type LetterResult = "correct" | "present" | "absent";

/** Standard Wordle colouring, handling repeated letters properly. */
export function scoreGuess(guess: string, answer: string): LetterResult[] {
  const res: LetterResult[] = Array(5).fill("absent");
  const remaining: Record<string, number> = {};
  for (let i = 0; i < 5; i++) {
    if (guess[i] === answer[i]) res[i] = "correct";
    else remaining[answer[i]] = (remaining[answer[i]] ?? 0) + 1;
  }
  for (let i = 0; i < 5; i++) {
    if (res[i] === "correct") continue;
    const ch = guess[i];
    if (remaining[ch]) {
      res[i] = "present";
      remaining[ch]--;
    }
  }
  return res;
}

// ---------- Words for Draw & guess ----------
export const DRAW_WORDS = (
  "cat dog house tree sun moon star heart pizza banana apple car bicycle plane boat train rocket flower cake cupcake " +
  "icecream coffee teacup umbrella rainbow cloud snowman penguin elephant giraffe fish octopus spider butterfly bee " +
  "snail turtle rabbit owl frog dragon unicorn castle bridge lighthouse tent campfire mountain volcano island beach " +
  "guitar piano drum headphones phone laptop camera glasses hat crown shoe sock tshirt dress scissors key lock clock " +
  "candle lamp bed sofa chair toothbrush book pencil balloon kite gift ghost robot alien pirate mermaid sandwich burger " +
  "hotdog taco sushi egg carrot broccoli pineapple strawberry cherry watermelon popcorn donut cookie football tennis " +
  "trophy medal anchor compass map suitcase passport airport skateboard rollercoaster ferriswheel windmill igloo cactus " +
  "mushroom leaf sunflower bone skeleton witch wizard ninja kiss hug tired selfie"
).split(/\s+/);

export function randomDrawWord(exclude?: string) {
  let w = DRAW_WORDS[Math.floor(Math.random() * DRAW_WORDS.length)];
  if (w === exclude) w = DRAW_WORDS[(DRAW_WORDS.indexOf(w) + 1) % DRAW_WORDS.length];
  return w;
}
