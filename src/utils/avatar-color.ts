// Cycles through the app's existing hue tokens -- these already match the
// mockup's exact avatar palette (#6e93c9, #9e8fd6, #d98baa, #5fa97b,
// #d9ad5c, #db9179), so no new colors needed. Derived from a hash of the
// client's id rather than list position, so a client's color stays stable
// regardless of how the list is sorted or who else is added.
const AVATAR_COLORS = [
  { bg: "bg-hue-cal", text: "text-white" },
  { bg: "bg-hue-notes", text: "text-white" },
  { bg: "bg-hue-msg", text: "text-white" },
  { bg: "bg-hue-bill", text: "text-white" },
  { bg: "bg-hue-consent", text: "text-white" },
  { bg: "bg-hue-clients", text: "text-white" },
];

export function avatarColorFor(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

export function initialsOf(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
