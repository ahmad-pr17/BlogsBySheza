import { prisma } from "@/lib/db";

export type PlayableSong = {
  id: string;
  title: string;
  artist: string;
  url: string;
};

// The committed default track (public/songs). Always offered first.
export const DEFAULT_SONG: PlayableSong = {
  id: "default",
  title: "Magical Fantasy",
  artist: "Dmitriy",
  url: "/songs/magical-fantasy.mp3",
};

export function getSongs() {
  return prisma.song.findMany({
    orderBy: { createdAt: "desc" },
  });
}

// Default track followed by every uploaded song — the full playable library.
export async function getAllSongs(): Promise<PlayableSong[]> {
  const uploaded = await getSongs();
  return [
    DEFAULT_SONG,
    ...uploaded.map((s) => ({
      id: s.id,
      title: s.title,
      artist: s.artist,
      url: s.url,
    })),
  ];
}
