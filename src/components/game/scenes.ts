// Where a player can be: outside in the town, or in one of the palace rooms.
// "home" is the Great Hall (the room you walk into from the castle door).
export type RoomId = "home" | "kitchen" | "living" | "bedroom" | "study";
export type Scene = "out" | RoomId;

// Numbers sent over the network (0 = outside).
export const SCENE_ORDER: Scene[] = ["out", "home", "kitchen", "living", "bedroom", "study"];
export const sceneCode = (s: Scene) => Math.max(0, SCENE_ORDER.indexOf(s));
export const sceneFromCode = (n: unknown): Scene =>
  typeof n === "number" && SCENE_ORDER[n] ? SCENE_ORDER[n] : "out";
