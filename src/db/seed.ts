import { inArray } from "drizzle-orm";
import { db, queryClient } from "./client.js";
import { users, posts } from "./schema.js";

const POST_COUNT = 100;
const TARGET_USER_EMAILS = ["user@example.com"];

const ADJECTIVES = ["Quick", "Lazy", "Brave", "Curious", "Silent", "Bold", "Gentle", "Wild", "Ancient", "Modern"];
const NOUNS = ["Fox", "Mountain", "Ocean", "Robot", "Garden", "Comet", "Library", "Bridge", "Forest", "Engine"];
const TOPICS = [
  "testing",
  "deployment",
  "React hooks",
  "database indexing",
  "TypeScript generics",
  "API design",
  "caching",
  "authentication",
  "CSS grid",
  "Node.js streams",
];

function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function randomTitle(index: number) {
  return `${pick(ADJECTIVES)} ${pick(NOUNS)}: notes on ${pick(TOPICS)} #${index}`;
}

function randomContent(topic: string) {
  return (
    `This is a seeded test post about ${topic}. It exists to have realistic-looking data for ` +
    `pagination, search and manual testing. Lorem ipsum dolor sit amet, consectetur adipiscing elit, ` +
    `sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.`
  );
}

async function main() {
  const existingUsers = await db.select().from(users).where(inArray(users.email, TARGET_USER_EMAILS));

  if (existingUsers.length !== TARGET_USER_EMAILS.length) {
    const foundEmails = existingUsers.map((u) => u.email);
    const missing = TARGET_USER_EMAILS.filter((email) => !foundEmails.includes(email));
    console.error(`Could not find user(s): ${missing.join(", ")}`);
    process.exit(1);
  }

  console.log(`Found ${existingUsers.length} user(s): ${existingUsers.map((u) => u.email).join(", ")}`);

  const rows = Array.from({ length: POST_COUNT }, (_, i) => {
    const author = existingUsers[i % existingUsers.length];
    const topic = pick(TOPICS);
    return {
      title: randomTitle(i + 1),
      content: randomContent(topic),
      published: Math.random() < 0.7,
      authorId: author.id,
    };
  });

  await db.insert(posts).values(rows);

  console.log(`Inserted ${rows.length} posts across ${existingUsers.length} user(s).`);
  await queryClient.end();
}

main().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
