import { Resource } from "../models/index.js";

async function seedDatabase() {
  if ((await Resource.countDocuments()) !== 0) return;

  await Resource.insertMany([
    {
      title: "Box Breathing for Exam Stress",
      type: "video",
      category: "Stress",
      language: "English",
      url: "https://www.youtube.com/watch?v=tEmt1Znux58",
      description: "A short guided breathing video for acute stress.",
      durationMin: 4,
      tags: ["breathing", "exam stress", "grounding"],
    },
    {
      title: "Sleep Hygiene Checklist",
      type: "article",
      category: "Sleep",
      language: "English",
      url: "https://www.sleepfoundation.org/sleep-hygiene",
      description: "Practical habits that support better sleep.",
      durationMin: 8,
      tags: ["sleep hygiene", "routine"],
    },
    {
      title: "Mindfulness Body Scan",
      type: "audio",
      category: "Anxiety",
      language: "English",
      url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
      description: "A calm audio placeholder for body-scan practice.",
      durationMin: 6,
      tags: ["mindfulness", "body scan"],
    },
    {
      title: "Burnout Recovery Plan",
      type: "article",
      category: "Burnout",
      language: "English",
      url: "https://example.com/burnout-recovery",
      description: "A structured reflection plan for workload recovery.",
      durationMin: 10,
      tags: ["burnout", "boundaries", "study"],
    },
  ]);
}

export { seedDatabase };
