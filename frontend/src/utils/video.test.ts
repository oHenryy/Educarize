import { describe, expect, it } from "vitest";
import { parseVideoUrl, resumePosition } from "./video";
import { WatchTracker } from "./watchTracker";

describe("parseVideoUrl", () => {
  it.each([
    ["https://www.youtube.com/watch?v=dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["https://youtu.be/dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["https://www.youtube.com/embed/dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["https://www.youtube.com/shorts/dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["https://www.youtube.com/watch?list=abc&v=dQw4w9WgXcQ&t=10", "dQw4w9WgXcQ"],
  ])("reconhece YouTube: %s", (url, id) => {
    expect(parseVideoUrl(url)).toEqual({ kind: "youtube", id });
  });

  it("reconhece Vimeo", () => {
    expect(parseVideoUrl("https://vimeo.com/76979871")).toEqual({ kind: "vimeo", id: "76979871" });
    expect(parseVideoUrl("https://player.vimeo.com/video/76979871")).toEqual({ kind: "vimeo", id: "76979871" });
  });

  it("aceita outros links http(s) e recusa protocolos perigosos", () => {
    expect(parseVideoUrl("https://exemplo.com/video")).toEqual({ kind: "embed", url: "https://exemplo.com/video" });
    expect(parseVideoUrl("javascript:alert(1)")).toBeNull();
    expect(parseVideoUrl("")).toBeNull();
  });
});

describe("resumePosition", () => {
  it("retoma de onde parou, mas recomeça perto do início ou do fim", () => {
    expect(resumePosition(120, 600)).toBe(120);
    expect(resumePosition(3, 600)).toBe(0);
    expect(resumePosition(595, 600)).toBe(0);
    expect(resumePosition(undefined, 600)).toBe(0);
  });
});

describe("WatchTracker", () => {
  const play = (tracker: WatchTracker, from: number, to: number) => {
    for (let t = from; t <= to; t++) tracker.sample(t, true);
  };

  it("conta o tempo tocando", () => {
    const tracker = new WatchTracker();
    play(tracker, 0, 30);
    expect(tracker.takeWatchedSeconds()).toBe(30);
    expect(tracker.takeWatchedSeconds()).toBe(0);
  });

  it("não conta saltos para frente nem para trás", () => {
    const tracker = new WatchTracker();
    play(tracker, 0, 10);
    tracker.sample(500, true); // pulou para o fim
    play(tracker, 501, 505);
    tracker.sample(100, true); // voltou
    expect(tracker.takeWatchedSeconds()).toBe(15);
  });

  it("não conta enquanto pausado e reinicia a referência ao voltar a tocar", () => {
    const tracker = new WatchTracker();
    play(tracker, 0, 10);
    tracker.sample(10, false);
    tracker.sample(10, false);
    tracker.sample(40, true); // retomou após avançar a barra pausado
    play(tracker, 41, 45);
    expect(tracker.takeWatchedSeconds()).toBe(15);
  });

  it("conta a reprodução acelerada (2x) e guarda frações para o próximo envio", () => {
    const tracker = new WatchTracker();
    for (let t = 0; t <= 20; t += 2) tracker.sample(t, true);
    tracker.sample(20.6, true);
    expect(tracker.takeWatchedSeconds()).toBe(20);
    expect(tracker.pendingSeconds).toBeCloseTo(0.6);
  });

  it("limita o envio e deixa o restante pendente", () => {
    const tracker = new WatchTracker();
    play(tracker, 0, 200);
    expect(tracker.takeWatchedSeconds(120)).toBe(120);
    expect(tracker.takeWatchedSeconds(120)).toBe(80);
  });
});
