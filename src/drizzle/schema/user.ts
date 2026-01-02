// model User {
//   id        String   @id @default(cuid())
//   email     String   @unique
//   password  String
//   name      String?
//   role      Role     @default(USER)
//   points    Int      @default(0)
//   createdAt DateTime @default(now())
//   updatedAt DateTime @updatedAt
//   progress  MemorizationProgress[]
//   tasks     Task[]
// }
import { pgTable, varchar } from "drizzle-orm/pg-core";

export const UsersTable = pgTable("users", {
    name: varchar("name", { length: 255 }).notNull(),
});
