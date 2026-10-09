/* ==========================================================================
   ♡  EVERYTHING PERSONAL LIVES IN THIS ONE FILE  ♡
   --------------------------------------------------------------------------
   1. name / from ........ her name and your name
   2. photos ............. 10 photos + captions (put files in assets/photos/)
   3. music .............. path to the song (assets/music/birthday.mp3)
   4. letter / chapter texts below
   Use {name} and {from} anywhere in a text — they are replaced automatically.
   ========================================================================== */

export const birthdayConfig = {
  name: "AARU",          // ← her name (shown in the birthday headlines)
  from: "Abhayyy....",         // ← your name (signature at the very end)

  music: "assets/music/birthday.mp3",   // ← replace the file or change the path
  musicVolume: 0.55,                    // 0 – 1

  /* ---- PHOTOS ---------------------------------------------------------
     Replace assets/photos/photo1.jpg … photo10.jpg with your own pictures
     (same file names)  — or change `src`. Portrait or square both work.
     `caption` appears when you hover a photo in the galaxy / crystal heart.
     `alt` is read by screen readers.                                      */
  photos: [
    { src: "assets/photos/photo1.jpg",  caption: "One of my favorite memories ♡",   alt: "A favorite memory" },
    { src: "assets/photos/photo2.jpeg",  caption: "That beautiful day",              alt: "A beautiful day" },
    { src: "assets/photos/photo3.jpg",  caption: "You, laughing — my favorite sound", alt: "Laughing together" },
    { src: "assets/photos/photo4.jpeg",  caption: "Where it all felt easy",          alt: "A calm moment" },
    { src: "assets/photos/photo5.jpeg",  caption: "I still smile at this one",       alt: "A smiling memory" },
    { src: "assets/photos/photo6.jpeg",  caption: "Us, being us",                    alt: "Us together" },
    { src: "assets/photos/photo7.jpeg",  caption: "A small moment that meant everything", alt: "A small moment" },
    { src: "assets/photos/photo8.jpg",  caption: "Golden hour, golden you",         alt: "Golden hour" },
    { src: "assets/photos/photo9.jpeg",  caption: "I'd relive this day forever",     alt: "A day to relive" },
    { src: "assets/photos/photo10.jpg", caption: "Always you ♡",                    alt: "Always you" }
  ],

  /* ---- INTRO (shown only if the browser blocks autoplay) ---- */
  intro: {
    eyebrow: "a little world, made for",
    tap: "Tap anywhere to begin the music ♡"
  },

  /* ---- CHAPTER 1 · THE LETTER ---- */
  letter: {
    hint: "Hold to draw the bow — release to shoot ♡",
    missHints: ["So close — try again ♡", "Aim for the heart ♡", "Cupid never misses twice ♡"],
    envelopeLabel: "A Little Surprise",
    greeting: "Hey you...",
    paragraphs: [
      "Today isn't just another birthday.",
      "It's a reminder of how lucky I feel to know someone like you.",
      "So I made this little world...",
      "just for you.",
      "I have been preaping for this for 3 months.",
      "Enjoy your little world my Love"
    ],
    yesLabel: "Open the next surprise ♡",
    noLabel: "Not yet…",
    happy: "Yayyy! Come with me ♡"
  },

  /* ---- CHAPTER 2 · THE GARDEN ---- */
  blossom: {
    message: "Every beautiful memory with you feels like another flower in my little world."
  },

  /* ---- CHAPTER 3 · THE GALAXY ---- */
  galaxy: {
    title: "You are like a star to me.",
    subtitle: "MY home where I can come back when I want."
  },

  /* ---- CHAPTER 4 · THE BIRTHDAY TREE ---- */
  birthday: {
    seedHint: "touch the seed ♡",
    headline: "Happy Birthday, My love♡",
    sub: [
    "May this year grow into something as beautiful as you are, I wanted to make this your best birthday, I hope You are enjoying it till now, I Love you more than you can ImagineI want to clelbrate each of your birthday with you, I want to be with you till eternity"
    ]
  },

  /* ---- CHAPTER 5 · THE CRYSTAL HEART ---- */
  crystal: {
    line1: "All my favorite memories somehow lead back to you.",
    line2: "This heart is for you."
  },

  /* ---- CHAPTER 6 · THE GIFT ---- */
  gift: {
    lead: "One last thing...",
    tapHint: "tap the gift ♡",
    headline: "Happy Birthday, {name} ♡",
    message: [
      "I hope this year gives you more reasons to smile,",
      "more moments worth remembering,",
      "and more happiness than you know what to do with.",
      "I hope this year make you fall in love with me more",
      "than ever and I love you more than you."
    ],
    thanks: "Thank you for being you.",
    closing: "Happy Birthday, beautiful. ♡",
    signature: "— {from}",
    replayLabel: "Replay the story ♡"
  }
};

/** Replace {name} / {from} in a string. */
export const t = (s) =>
  String(s).replaceAll("{name}", birthdayConfig.name).replaceAll("{from}", birthdayConfig.from);
