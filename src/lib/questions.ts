import { localDateStr } from "@/lib/time";

export type QuestionKind = "deep" | "funny" | "wyr";
export type Question = { kind: QuestionKind; text: string };

// Interleaved so consecutive days mix it up. Add more any time — just append to the end
// (changing the order would change which question past days point to, but answers keep their own index).
const RAW: [QuestionKind, string][] = [
  ["deep", "What's a moment with me you replay in your head when you miss me?"],
  ["funny", "If our relationship had a theme song, what would it be?"],
  ["wyr", "Would you rather have a cosy night in or a fancy night out on our next visit?"],
  ["deep", "What's something small I do that makes you feel loved?"],
  ["funny", "What's the most embarrassing song you secretly love?"],
  ["wyr", "Would you rather live by the sea or in the mountains together one day?"],
  ["deep", "What's one thing you're proud of yourself for this month?"],
  ["funny", "If you were a kitchen utensil, which one would you be and why?"],
  ["wyr", "Would you rather only be able to whisper or only be able to shout for a week?"],
  ["deep", "When did you first realise you really liked me?"],
  ["funny", "What's the weirdest food combination you actually enjoy?"],
  ["wyr", "Would you rather explore Japan or road-trip across the USA with me?"],
  ["deep", "What does a perfect lazy Sunday together look like to you?"],
  ["funny", "What animal do you think I'd be, and why?"],
  ["wyr", "Would you rather have breakfast in bed or a surprise picnic?"],
  ["deep", "What's a dream you haven't told many people about?"],
  ["funny", "What's your most useless talent?"],
  ["wyr", "Would you rather be able to teleport or read minds (just mine, obviously)?"],
  ["deep", "What's something you'd like us to get better at together?"],
  ["funny", "If you could rename yourself, what name would you pick?"],
  ["wyr", "Would you rather never have to sleep or never have to eat?"],
  ["deep", "Which memory of us makes you laugh the most?"],
  ["funny", "What would your villain origin story be?"],
  ["wyr", "Would you rather have a dog or a cat with me first?"],
  ["deep", "What helps you most when you've had a rough day?"],
  ["funny", "What's the silliest thing you've ever cried at?"],
  ["wyr", "Would you rather relive our first date or skip ahead to our next one?"],
  ["deep", "What's a tradition you'd love for us to start?"],
  ["funny", "If you had to eat one meal for the rest of your life, what would it be?"],
  ["wyr", "Would you rather be famous for something embarrassing or unknown for something amazing?"],
  ["deep", "What's something you've learned from me?"],
  ["funny", "What's the worst fashion phase you've ever been through?"],
  ["wyr", "Would you rather go to a festival or a cabin in the woods with me?"],
  ["deep", "How do you like to be comforted when you're sad?"],
  ["funny", "What's the most ridiculous thing you believed as a kid?"],
  ["wyr", "Would you rather have unlimited flights or unlimited takeaways?"],
  ["deep", "What's a place that feels like home to you, apart from your actual home?"],
  ["funny", "Which fictional character would you most want to go for a pint with?"],
  ["wyr", "Would you rather always be 10 minutes early or 10 minutes late?"],
  ["deep", "What's something about the future that excites you?"],
  ["funny", "What would you do if you were invisible for a day?"],
  ["wyr", "Would you rather cook together or take turns surprising each other with dinner?"],
  ["deep", "What's one thing you wish more people knew about you?"],
  ["funny", "What's your go-to karaoke song?"],
  ["wyr", "Would you rather have a house with a big garden or a flat in the city centre?"],
  ["deep", "When do you feel most like yourself?"],
  ["funny", "If you could only use three emojis forever, which three?"],
  ["wyr", "Would you rather be stuck in a lift with your favourite celebrity or your least favourite teacher?"],
  ["deep", "What's a small win from today?"],
  ["funny", "What's the strangest dream you can remember?"],
  ["wyr", "Would you rather time travel to the past or the future?"],
  ["deep", "What do you think makes us a good team?"],
  ["funny", "What's a word you always spell wrong?"],
  ["wyr", "Would you rather give up chocolate or cheese forever?"],
  ["deep", "What's something you're looking forward to doing together next time we meet?"],
  ["funny", "What's your secret guilty-pleasure TV show?"],
  ["wyr", "Would you rather have a snow day or a beach day together?"],
  ["deep", "What's the best piece of advice you've ever been given?"],
  ["funny", "What would your autobiography be called?"],
  ["wyr", "Would you rather speak every language or play every instrument?"],
  ["deep", "What's a song that reminds you of us?"],
  ["funny", "What's the most random thing in your bag or pockets right now?"],
  ["wyr", "Would you rather have a surprise trip planned for you or plan one for me?"],
  ["deep", "What does love feel like to you, in one sentence?"],
  ["funny", "If you opened a café, what would it be called?"],
  ["wyr", "Would you rather sleep under the stars or in a fancy hotel?"],
  ["deep", "What's something you'd like to tell your younger self?"],
  ["funny", "What's the worst present you've ever received?"],
  ["wyr", "Would you rather lose your phone or your keys for a week?"],
  ["deep", "What made you smile today?"],
  ["funny", "Which of us would survive longer in a zombie apocalypse, honestly?"],
  ["wyr", "Would you rather watch the sunrise or the sunset with me?"],
  ["deep", "What's a habit of mine you secretly find cute?"],
  ["funny", "What's the most overrated food?"],
  ["wyr", "Would you rather have a joint bucket list of 10 big things or 100 tiny things?"],
  ["deep", "What's one thing that would make long distance easier this week?"],
  ["funny", "What's your most-used phrase, according to your friends?"],
  ["wyr", "Would you rather be a famous chef or a famous musician?"],
  ["deep", "What's a fear you've overcome?"],
  ["funny", "Describe your day so far using only film titles."],
  ["wyr", "Would you rather spend a day at a theme park or a spa?"],
  ["deep", "Where do you see us in five years?"],
  ["funny", "What's the most chaotic thing you've done on a night out?"],
  ["wyr", "Would you rather always know the weather or always know the time without a phone?"],
  ["deep", "What's something you appreciate about how we talk to each other?"],
  ["funny", "If your pet (or dream pet) could talk, what would it complain about?"],
  ["wyr", "Would you rather do a cooking class or a dance class together?"],
  ["deep", "What's a book, film or show that changed how you think?"],
  ["funny", "What's the pettiest thing that annoys you?"],
  ["wyr", "Would you rather wake up early together or stay up late together?"],
  ["deep", "What does your ideal home with me look like?"],
  ["funny", "What's the most British (or Danish) thing about you?"],
  ["wyr", "Would you rather have matching tattoos or matching pyjamas?"],
  ["deep", "What's something you want to do more of this year?"],
  ["funny", "If you were a crisp flavour, what would you be?"],
  ["wyr", "Would you rather never use social media again or never watch TV again?"],
  ["deep", "What do you miss most about me right now?"],
  ["funny", "What's a conspiracy theory you half believe?"],
  ["wyr", "Would you rather go on a road trip with no plan or a perfectly planned holiday?"],
  ["deep", "What's a compliment you've received that you still think about?"],
  ["funny", "What's the most useless thing you own but refuse to throw away?"],
  ["wyr", "Would you rather have a talking cat or a flying dog?"],
  ["deep", "What would you want our wedding (or big celebration) to feel like?"],
  ["funny", "Rate my cooking out of 10. Be honest."],
  ["wyr", "Would you rather see the Northern Lights or swim with dolphins?"],
  ["deep", "What's something that's been on your mind lately?"],
  ["funny", "What job would you be terrible at?"],
  ["wyr", "Would you rather share one big dessert or get two small ones each?"],
];

export const QUESTIONS: Question[] = RAW.map(([kind, text]) => ({ kind, text }));

export const KIND_LABEL: Record<QuestionKind, string> = {
  deep: "💭 Deep one",
  funny: "😂 Silly one",
  wyr: "🤔 Would you rather",
};

/** Both of us get the same question each day — "today" is the UK calendar day. */
export const QUESTION_TZ = "Europe/London";

export function todayQDate(now = new Date()) {
  return localDateStr(now, QUESTION_TZ);
}

export function questionIndexFor(qdate: string) {
  const [y, m, d] = qdate.split("-").map(Number);
  const day = Math.floor(Date.UTC(y, m - 1, d) / 86400000);
  return day % QUESTIONS.length;
}

export function questionFor(qdate: string) {
  const index = questionIndexFor(qdate);
  return { index, ...QUESTIONS[index] };
}
