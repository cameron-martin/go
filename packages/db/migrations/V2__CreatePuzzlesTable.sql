CREATE TABLE puzzles (
    id SERIAL PRIMARY KEY,
    puzzle JSONB NOT NULL UNIQUE
);