// Sheza's shelf. All text is original shelf-talker writing: no passages from the books.

export type BookPage = { heading: string; text: string };

export type Book = {
  id: string;
  title: string;
  author: string;
  series: string;
  /** spine / cover colour */
  color: string;
  /** text colour on that colour */
  ink: string;
  emoji: string;
  /** spine height in px (variety on the shelf) */
  height: number;
  /** which shelf (0-based) */
  shelf: number;
  pages: BookPage[];
};

export const BOOKS: Book[] = [
  {
    id: "goosebumps",
    title: "Goosebumps",
    author: "R.L. Stine",
    series: "Goosebumps",
    color: "#3f9b3a",
    ink: "#f4ffe0",
    emoji: "👻",
    height: 112,
    shelf: 0,
    pages: [
      {
        heading: "The premise",
        text: "Kids on the edge of a very strange week: a haunted mask, a creepy camp, a basement that should have stayed locked. Each book is its own short, sneaky scare with a twist waiting at the end.",
      },
      {
        heading: "The feel",
        text: "Ordinary suburbs, then something slightly off. The fun is in the cliffhanger chapter endings that make you whisper just one more page under the covers.",
      },
      {
        heading: "Order & scare level",
        text: "Almost every book stands alone, so start with any cover that makes you shiver. A little spooky, never grim. Perfect first horror for brave beginners.",
      },
      {
        heading: "From Sheza's shelf",
        text: "Read this if you like campfire stories and surprise endings. Best with a torch, a blanket and a friend nearby to squeal at.",
      },
    ],
  },
  {
    id: "matilda",
    title: "Matilda",
    author: "Roald Dahl",
    series: "Roald Dahl favourites",
    color: "#d9467a",
    ink: "#fff0f5",
    emoji: "📚",
    height: 100,
    shelf: 0,
    pages: [
      {
        heading: "The premise",
        text: "A small girl who devours books lives with a family that has no time for them. Clever, stubborn and quietly extraordinary, she decides things must change.",
      },
      {
        heading: "Who's inside",
        text: "Matilda herself, a gentle teacher with a kind heart, and some truly dreadful grown-ups. Dahl loves a villain you can enjoy disliking.",
      },
      {
        heading: "Scare level",
        text: "Funny first, a little frightening in places. A great read-aloud at bedtime and a great first chapter book for solo readers.",
      },
      {
        heading: "From Sheza's shelf",
        text: "Read this if you like clever kids and cheeky justice. It is basically a hug for anyone who ever got lost in a library.",
      },
    ],
  },
  {
    id: "charlie",
    title: "Charlie and the Chocolate Factory",
    author: "Roald Dahl",
    series: "Roald Dahl favourites",
    color: "#7a4a22",
    ink: "#ffe9c4",
    emoji: "🍫",
    height: 108,
    shelf: 0,
    pages: [
      {
        heading: "The premise",
        text: "A kind boy from a very poor family wins a rare chance to see inside the most secret sweet factory in the world. Not every visitor behaves well.",
      },
      {
        heading: "The world",
        text: "Rooms that taste like dreams, machines that defy sense, and a host who is delightfully hard to read. Pure invention from page one.",
      },
      {
        heading: "Reading order",
        text: "Start here. There is a sequel about a glass elevator if you want more, but the first book is perfectly whole by itself.",
      },
      {
        heading: "From Sheza's shelf",
        text: "Read this if you like sweet treats with a pinch of mischief. Keep a snack nearby, because you will get hungry.",
      },
    ],
  },
  {
    id: "bfg",
    title: "The BFG",
    author: "Roald Dahl",
    series: "Roald Dahl favourites",
    color: "#4a8fc9",
    ink: "#eaf6ff",
    emoji: "🌙",
    height: 118,
    shelf: 0,
    pages: [
      {
        heading: "The premise",
        text: "A girl awake in the night meets a giant who is very different from the giants she has heard about. An unlikely friendship begins under the moon.",
      },
      {
        heading: "The language",
        text: "The giant speaks in wonderfully muddled words, and half the joy is figuring out what he means. It is playful, silly and warm.",
      },
      {
        heading: "Scare level",
        text: "A little spooky early on, then mostly gentle adventure. Great for sleepy-time reading and for kids who like friendly monsters.",
      },
      {
        heading: "From Sheza's shelf",
        text: "Read this if you like dreams, big hearts and wordplay. Say the funny words out loud, it is much better that way.",
      },
    ],
  },
  {
    id: "witches",
    title: "The Witches",
    author: "Roald Dahl",
    series: "Roald Dahl favourites",
    color: "#5b2d86",
    ink: "#f1e0ff",
    emoji: "🧙",
    height: 104,
    shelf: 0,
    pages: [
      {
        heading: "The premise",
        text: "A boy and his grandmother learn that witches are real, and they look just like ordinary people. Spotting them might be the only way to stay safe.",
      },
      {
        heading: "The mood",
        text: "Cosy grandmother storytelling mixed with proper spooky dread. Dahl is at his darkest and funniest here.",
      },
      {
        heading: "Scare level",
        text: "Gets properly creepy in a few scenes, so it suits slightly older kids or brave read-aloud sessions.",
      },
      {
        heading: "From Sheza's shelf",
        text: "Read this if you like spooky stories with a sense of humour. Not one for the nervous, but a cracker for the curious.",
      },
    ],
  },
  {
    id: "junie",
    title: "Junie B. Jones",
    author: "Barbara Park",
    series: "Junie B. Jones",
    color: "#e8662c",
    ink: "#fff3e6",
    emoji: "🚌",
    height: 96,
    shelf: 1,
    pages: [
      {
        heading: "The premise",
        text: "Junie B. is a kindergartner with big opinions, big feelings and a talent for getting into trouble. Each short book follows one funny school adventure.",
      },
      {
        heading: "The voice",
        text: "Told in Junie's own chatty way, grammar mix-ups and all. It reads like a friend telling you the best story at lunch.",
      },
      {
        heading: "Order & level",
        text: "The series follows her school years, so reading in order is nicest, though any book works. Very gentle, no scares, ideal for early readers.",
      },
      {
        heading: "From Sheza's shelf",
        text: "Read this if you like funny kid narrators and giggles on every page. A tiny book with a very big personality.",
      },
    ],
  },
  {
    id: "wimpy",
    title: "Diary of a Wimpy Kid",
    author: "Jeff Kinney",
    series: "Diary of a Wimpy Kid",
    color: "#f0c43c",
    ink: "#3a2a18",
    emoji: "✏️",
    height: 110,
    shelf: 1,
    pages: [
      {
        heading: "The premise",
        text: "Greg Heffley starts middle school and records his schemes for becoming popular in a journal. Things rarely go the way he plans.",
      },
      {
        heading: "The style",
        text: "Cartoon drawings on nearly every page and short diary entries make it one of the fastest, funniest reads on the shelf.",
      },
      {
        heading: "Order & level",
        text: "Each book is a new school year of mishaps, best read in order. No scares, just awkward moments and big laughs. Great for reluctant readers.",
      },
      {
        heading: "From Sheza's shelf",
        text: "Read this if you like cringey comedy and doodles. Perfect for sneaking a few pages between everything else.",
      },
    ],
  },
  {
    id: "hp",
    title: "Harry Potter",
    author: "J.K. Rowling",
    series: "Harry Potter",
    color: "#8c1d2f",
    ink: "#ffe9a8",
    emoji: "⚡",
    height: 120,
    shelf: 1,
    pages: [
      {
        heading: "The premise",
        text: "A boy discovers he belongs to a hidden magical world and starts at a school of wizardry, where friendship, mystery and a looming danger await.",
      },
      {
        heading: "The world",
        text: "Moving staircases, odd sweets, flying lessons and secrets in every corridor. The details are what make it feel so lived in.",
      },
      {
        heading: "Reading order",
        text: "Seven books, best in publication order, and they grow darker as the characters grow up. Start young, and the later books suit older readers.",
      },
      {
        heading: "From Sheza's shelf",
        text: "Read this if you like found family, big mysteries and cosy school life. A rainy weekend is the best time to begin.",
      },
    ],
  },
  {
    id: "darren",
    title: "The Saga of Darren Shan",
    author: "Darren Shan",
    series: "The Saga of Darren Shan",
    color: "#a11d1d",
    ink: "#ffe3e0",
    emoji: "🦇",
    height: 106,
    shelf: 1,
    pages: [
      {
        heading: "The premise",
        text: "A schoolboy visits a mysterious travelling show and gets pulled into a hidden world of vampires, where one choice changes his life.",
      },
      {
        heading: "The mood",
        text: "Fast, shadowy and surprisingly emotional. It is a horror series that cares a lot about loyalty and what friends owe each other.",
      },
      {
        heading: "Order & scare level",
        text: "A long series, best read in order. Gets dark and a bit gory as it goes, so it suits confident teen readers.",
      },
      {
        heading: "From Sheza's shelf",
        text: "Read this if you like vampire tales with heart. Keep the lights on, and a friend to talk about it with.",
      },
    ],
  },
  {
    id: "fear",
    title: "Fear Street",
    author: "R.L. Stine",
    series: "Fear Street",
    color: "#1f2a44",
    ink: "#ff6a5c",
    emoji: "🔪",
    height: 114,
    shelf: 2,
    pages: [
      {
        heading: "The premise",
        text: "Teen horror set around a notorious street in a town that seems to attract trouble. Each story brings a new group of friends and a fresh scare.",
      },
      {
        heading: "The mood",
        text: "Goosebumps all grown up: higher stakes, older characters, and mysteries where you cannot be sure who to trust.",
      },
      {
        heading: "Order & scare level",
        text: "Mostly standalone, so jump in anywhere. Gets properly dark, so it is best for teens and older readers.",
      },
      {
        heading: "From Sheza's shelf",
        text: "Read this if you grew out of Goosebumps and miss the thrill. A great slumber-party shiver.",
      },
    ],
  },
  {
    id: "inheritance",
    title: "The Inheritance Cycle",
    author: "Christopher Paolini",
    series: "The Inheritance Cycle",
    color: "#2e7d6b",
    ink: "#e4fff6",
    emoji: "🐉",
    height: 116,
    shelf: 2,
    pages: [
      {
        heading: "The premise",
        text: "A farm boy finds a strange stone that turns out to be a dragon egg, and his quiet life is swept into a war against a tyrant king.",
      },
      {
        heading: "The world",
        text: "Elves, dwarves, ancient oaths and an old magic with its own rules. A classic dragon-rider quest at heart.",
      },
      {
        heading: "Reading order",
        text: "Four books, to be read in order starting with Eragon. Epic and sometimes sad, best for middle-grade readers and up.",
      },
      {
        heading: "From Sheza's shelf",
        text: "Read this if you like dragons, maps and long adventures. The bond between rider and dragon is the best part.",
      },
    ],
  },
  {
    id: "lotr",
    title: "The Lord of the Rings",
    author: "J.R.R. Tolkien",
    series: "Middle-earth",
    color: "#c79a2b",
    ink: "#2a1c08",
    emoji: "💍",
    height: 122,
    shelf: 2,
    pages: [
      {
        heading: "The premise",
        text: "A small, ordinary traveller is handed a dangerous ring and a journey far from home. A fellowship forms to carry it where it can be undone.",
      },
      {
        heading: "The world",
        text: "Deep history, many peoples and languages, and landscapes that feel real. It slows down to enjoy a good meal or a good view.",
      },
      {
        heading: "Reading order",
        text: "The Hobbit is a lighter lead-in, then the three main volumes in order. Leisurely and grand, best for patient, older readers.",
      },
      {
        heading: "From Sheza's shelf",
        text: "Read this if you love big quests and cosy hobbit comforts. Keep a pot of tea close and take your time.",
      },
    ],
  },
  {
    id: "empress",
    title: "The Remarried Empress",
    author: "Alphatart",
    series: "Web novel and webtoon",
    color: "#b0457f",
    ink: "#fff0f8",
    emoji: "👑",
    height: 108,
    shelf: 2,
    pages: [
      {
        heading: "The premise",
        text: "A story about an empress who reshapes her own fate. It is a romance fantasy set in a royal court, where she refuses to let others write her future.",
      },
      {
        heading: "The feel",
        text: "Court intrigue, difficult choices and a heroine finding her own strength. Spoiler-light here, because the twists are worth discovering.",
      },
      {
        heading: "How to read",
        text: "It began as a web novel by Alphatart and is also adapted as a webtoon. Mature themes, so best suited to older teens and adults.",
      },
      {
        heading: "From Sheza's shelf",
        text: "Read this if you like royal drama and comeback stories. Please enjoy it through the official release to support the author and artists.",
      },
    ],
  },
];
