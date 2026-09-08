FROM node:20-alpine

WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile && yarn cache clean

COPY tsconfig.json ./
COPY drizzle.config.ts ./
COPY src ./src

EXPOSE 6040

# Apply pending migrations, then serve. drizzle-kit's migrator takes a postgres
# advisory lock so concurrent containers don't race; on failure it exits
# non-zero and the container restart-loops with the error. No-op when current.
CMD ["sh", "-c", "yarn db:migrate && npx tsx src/index.ts"]
