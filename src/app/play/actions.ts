"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMeAndPartner } from "@/lib/people";
import { notify } from "@/lib/notify";
import {
  C4_COLS,
  DRAW_MAX_GUESSES,
  GAME_INFO,
  QUIZ_PASS,
  c4DropIndex,
  c4Winner,
  normaliseGuess,
  tttWinner,
  type C4State,
  type Cell,
  type DrawState,
  type GameType,
  type QuizQuestion,
  type QuizState,
  type TttState,
} from "@/lib/games";
import { WORD_MAX_GUESSES, answerFor, randomDrawWord, todayWDate } from "@/lib/words";

type Result = { ok: true; id?: string } | { ok: false; error: string };

function notifyLater(...args: Parameters<typeof notify>) {
  after(async () => {
    try {
      await notify(...args);
    } catch (e) {
      console.error("[notify]", e);
    }
  });
}

async function ctx() {
  const supabase = await createClient();
  const { me, partner } = await getMeAndPartner(supabase);
  if (!me) throw new Error("Not logged in");
  if (!partner) throw new Error("Your person hasn't joined yet.");
  return { supabase, me, partner, admin: createAdminClient() };
}

type GameRow = {
  id: string;
  type: GameType;
  created_by: string;
  opponent: string;
  turn: string | null;
  status: "active" | "finished";
  winner: string | null;
  state: Record<string, unknown>;
  updated_at: string;
};

async function loadGame(id: string, meId: string) {
  const admin = createAdminClient();
  const { data } = await admin.from("games").select("*").eq("id", id).single();
  const g = data as GameRow | null;
  if (!g || (g.created_by !== meId && g.opponent !== meId)) throw new Error("Game not found");
  return g;
}

/** Save only if nobody else changed the game since we loaded it. */
async function saveGame(g: GameRow, patch: Partial<GameRow>) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("games")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", g.id)
    .eq("updated_at", g.updated_at)
    .select("id");
  if (error) throw new Error(error.message);
  if (!data?.length) throw new Error("The game changed — refresh and try again.");
}

function wrap(fn: () => Promise<Result>): Promise<Result> {
  return fn().catch((e: unknown) => ({ ok: false as const, error: (e as Error).message }));
}

// ---------------- New games ----------------
export async function newBoardGame(type: "ttt" | "c4"): Promise<Result> {
  return wrap(async () => {
    const { me, partner, admin } = await ctx();
    const size = type === "ttt" ? 9 : 42;
    const state: TttState | C4State = { board: Array<Cell>(size).fill(null), marks: { [me.id]: "X", [partner.id]: "O" } };
    const { data, error } = await admin
      .from("games")
      .insert({ type, created_by: me.id, opponent: partner.id, turn: me.id, state })
      .select("id")
      .single();
    if (error) return { ok: false, error: error.message };
    revalidatePath("/play");
    return { ok: true, id: data.id as string };
  });
}

export async function newDrawGame(): Promise<Result> {
  return wrap(async () => {
    const { me, partner, admin } = await ctx();
    const state: DrawState = { phase: "drawing", guesses: [] };
    const { data, error } = await admin
      .from("games")
      .insert({ type: "draw", created_by: me.id, opponent: partner.id, turn: me.id, state })
      .select("id")
      .single();
    if (error) return { ok: false, error: error.message };
    await admin.from("game_secrets").insert({ game_id: data.id, secret: { word: randomDrawWord(), rerolls: 0 } });
    return { ok: true, id: data.id as string };
  });
}

export async function createQuiz(input: { q: string; options: string[]; correct: number }[]): Promise<Result> {
  return wrap(async () => {
    const { me, partner, admin } = await ctx();
    const qs = input
      .map((x) => ({
        q: x.q.trim().slice(0, 140),
        options: x.options.map((o) => o.trim().slice(0, 60)).filter(Boolean),
        correct: x.correct,
      }))
      .filter((x) => x.q && x.options.length >= 2 && x.correct >= 0 && x.correct < x.options.length);
    if (qs.length < 3) return { ok: false, error: "Add at least 3 complete questions (question, 2+ options, right answer ticked)." };
    if (qs.length > 15) return { ok: false, error: "Max 15 questions." };
    const state: QuizState = { questions: qs.map(({ q, options }): QuizQuestion => ({ q, options })) };
    const { data, error } = await admin
      .from("games")
      .insert({ type: "quiz", created_by: me.id, opponent: partner.id, turn: partner.id, state })
      .select("id")
      .single();
    if (error) return { ok: false, error: error.message };
    await admin.from("game_secrets").insert({ game_id: data.id, secret: { correct: qs.map((x) => x.correct) } });
    notifyLater(partner.id, {
      title: `🧠 ${me.display_name} made a quiz about themselves`,
      body: `${qs.length} questions — how well do you know them?`,
      url: `/play/${data.id}`,
      tag: `game-${data.id}`,
    });
    revalidatePath("/play");
    return { ok: true, id: data.id as string };
  });
}

// ---------------- Board moves ----------------
export async function playMove(gameId: string, index: number): Promise<Result> {
  return wrap(async () => {
    const { me, partner } = await ctx();
    const g = await loadGame(gameId, me.id);
    if (g.status !== "active") return { ok: false, error: "This game is over." };
    if (g.turn !== me.id) return { ok: false, error: "Not your turn yet." };
    if (g.type !== "ttt" && g.type !== "c4") return { ok: false, error: "Wrong game." };

    const st = g.state as unknown as TttState & C4State;
    const board = [...st.board];
    const mark = st.marks[me.id];
    let cell = index;
    if (g.type === "ttt") {
      if (index < 0 || index > 8 || board[index]) return { ok: false, error: "That square's taken." };
    } else {
      if (index < 0 || index >= C4_COLS) return { ok: false, error: "Pick a column." };
      cell = c4DropIndex(board, index);
      if (cell < 0) return { ok: false, error: "That column is full." };
    }
    board[cell] = mark;

    const win = g.type === "ttt" ? tttWinner(board) : c4Winner(board);
    const full = board.every(Boolean);
    const finished = !!win || full;
    await saveGame(g, {
      state: { ...st, board, last: cell } as unknown as Record<string, unknown>,
      turn: finished ? null : partner.id,
      status: finished ? "finished" : "active",
      winner: win ? me.id : null,
    });

    const name = GAME_INFO[g.type].name;
    notifyLater(partner.id, {
      title: win ? `😤 ${me.display_name} won ${name}` : full ? `🤝 ${name} ended in a draw` : `🎮 Your move in ${name}`,
      body: win ? "Rematch?" : full ? "Evenly matched, as always." : `${me.display_name} made their move.`,
      url: `/play/${g.id}`,
      tag: `game-${g.id}`,
    });
    revalidatePath(`/play/${g.id}`);
    revalidatePath("/play");
    return { ok: true };
  });
}

// ---------------- Draw & guess ----------------
export async function rerollDrawWord(gameId: string): Promise<Result> {
  return wrap(async () => {
    const { me, admin } = await ctx();
    const g = await loadGame(gameId, me.id);
    if (g.created_by !== me.id || (g.state as DrawState).phase !== "drawing") return { ok: false, error: "Too late to change." };
    const { data } = await admin.from("game_secrets").select("secret").eq("game_id", g.id).single();
    const secret = (data?.secret ?? {}) as { word?: string; rerolls?: number };
    if ((secret.rerolls ?? 0) >= 3) return { ok: false, error: "No more swaps — you've got this!" };
    await admin
      .from("game_secrets")
      .update({ secret: { word: randomDrawWord(secret.word), rerolls: (secret.rerolls ?? 0) + 1 } })
      .eq("game_id", g.id);
    revalidatePath(`/play/${g.id}`);
    return { ok: true };
  });
}

export async function submitDrawing(gameId: string, image: string): Promise<Result> {
  return wrap(async () => {
    const { me, partner } = await ctx();
    const g = await loadGame(gameId, me.id);
    const st = g.state as DrawState;
    if (g.created_by !== me.id || st.phase !== "drawing") return { ok: false, error: "Already sent." };
    if (!image.startsWith("data:image/") || image.length > 900_000) return { ok: false, error: "Drawing is too big — try clearing a bit." };
    await saveGame(g, { state: { ...st, phase: "guessing", image } as unknown as Record<string, unknown>, turn: partner.id });
    notifyLater(partner.id, {
      title: `✏️ ${me.display_name} drew something`,
      body: "Can you guess what it is?",
      url: `/play/${g.id}`,
      tag: `game-${g.id}`,
    });
    revalidatePath("/play");
    revalidatePath(`/play/${g.id}`);
    return { ok: true };
  });
}

export async function guessDrawing(gameId: string, guess: string): Promise<Result> {
  return wrap(async () => {
    const { me, partner, admin } = await ctx();
    const g = await loadGame(gameId, me.id);
    const st = g.state as DrawState;
    if (g.opponent !== me.id || st.phase !== "guessing" || g.status !== "active") return { ok: false, error: "Not your turn." };
    const clean = guess.trim().slice(0, 40);
    if (!normaliseGuess(clean)) return { ok: false, error: "Type a guess." };
    const { data } = await admin.from("game_secrets").select("secret").eq("game_id", g.id).single();
    const word = ((data?.secret ?? {}) as { word?: string }).word ?? "";
    const guesses = [...(st.guesses ?? []), clean];
    const right = normaliseGuess(clean) === normaliseGuess(word) || normaliseGuess(clean) === normaliseGuess(word) + "s";
    const out = right || guesses.length >= DRAW_MAX_GUESSES;
    await saveGame(g, {
      state: { ...st, guesses, ...(out ? { word } : {}) } as unknown as Record<string, unknown>,
      status: out ? "finished" : "active",
      turn: out ? null : me.id,
      winner: right ? me.id : null,
    });
    if (out) {
      notifyLater(partner.id, {
        title: right ? `🎉 ${me.display_name} guessed your drawing!` : `🙈 ${me.display_name} couldn't guess it`,
        body: right ? `It was “${word}”.` : `Their guesses: ${guesses.join(", ")}`,
        url: `/play/${g.id}`,
        tag: `game-${g.id}`,
      });
    }
    revalidatePath(`/play/${g.id}`);
    revalidatePath("/play");
    return { ok: true };
  });
}

// ---------------- Quiz ----------------
export async function answerQuiz(gameId: string, answers: number[]): Promise<Result> {
  return wrap(async () => {
    const { me, partner, admin } = await ctx();
    const g = await loadGame(gameId, me.id);
    const st = g.state as unknown as QuizState;
    if (g.opponent !== me.id || g.status !== "active") return { ok: false, error: "Not your quiz to answer." };
    if (answers.length !== st.questions.length || answers.some((a) => a == null || a < 0)) {
      return { ok: false, error: "Answer every question first." };
    }
    const { data } = await admin.from("game_secrets").select("secret").eq("game_id", g.id).single();
    const correct = ((data?.secret ?? {}) as { correct?: number[] }).correct ?? [];
    const score = answers.reduce((n, a, i) => n + (a === correct[i] ? 1 : 0), 0);
    const passed = score / st.questions.length >= QUIZ_PASS;
    await saveGame(g, {
      state: { ...st, answers, correct, score } as unknown as Record<string, unknown>,
      status: "finished",
      turn: null,
      winner: passed ? me.id : partner.id,
    });
    notifyLater(partner.id, {
      title: `🧠 ${me.display_name} took your quiz`,
      body: `They got ${score}/${st.questions.length}${passed ? " — they know you well 💗" : " — you stumped them 😏"}`,
      url: `/play/${g.id}`,
      tag: `game-${g.id}`,
    });
    revalidatePath(`/play/${g.id}`);
    revalidatePath("/play");
    return { ok: true };
  });
}

// ---------------- Daily word ----------------
export async function guessWord(guess: string): Promise<Result> {
  return wrap(async () => {
    const { me, partner, admin } = await ctx();
    const word = guess.trim().toLowerCase();
    if (!/^[a-z]{5}$/.test(word)) return { ok: false, error: "Five letters, please." };
    const wdate = todayWDate();
    const answer = answerFor(wdate);
    const { data: row } = await admin
      .from("word_results")
      .select("guesses, done")
      .eq("user_id", me.id)
      .eq("wdate", wdate)
      .maybeSingle();
    if (row?.done) return { ok: false, error: "You've finished today's word." };
    const guesses = [...((row?.guesses as string[]) ?? []), word];
    const solved = word === answer;
    const done = solved || guesses.length >= WORD_MAX_GUESSES;
    const { error } = await admin
      .from("word_results")
      .upsert({ user_id: me.id, wdate, guesses, solved, done, updated_at: new Date().toISOString() });
    if (error) return { ok: false, error: error.message };
    if (done) {
      const { data: theirs } = await admin
        .from("word_results")
        .select("done, solved, guesses")
        .eq("user_id", partner.id)
        .eq("wdate", wdate)
        .maybeSingle();
      notifyLater(partner.id, {
        title: theirs?.done ? "🟩 Daily word results are in!" : `🟩 ${me.display_name} finished today's word`,
        body: theirs?.done
          ? "Tap to see who won today."
          : `${solved ? `Got it in ${guesses.length}` : "Didn't get it"} — your turn!`,
        url: "/play/word",
        tag: "word",
      });
    }
    revalidatePath("/play/word");
    revalidatePath("/play");
    return { ok: true };
  });
}
