import { describe, expect, it } from "vitest";
import { matchesTodoTaskSearch } from "./useTaskFilter";
import type { Task } from "../types";

function task(id: number, title = "Task"): Task {
  return {
    id,
    title,
    description: null,
    status: "todo",
    priority: "medium",
    due_date: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    user_id: "u1",
    project_id: null,
    project_ids: [],
    created_by: "u1",
    assignees: [],
  } as Task;
}

describe("matchesTodoTaskSearch", () => {
  it("matches partial padded task ids", () => {
    const row = task(83, "A1");
    expect(matchesTodoTaskSearch(row, "00")).toBe(true);
    expect(matchesTodoTaskSearch(row, "83")).toBe(true);
    expect(matchesTodoTaskSearch(row, "0083")).toBe(true);
    expect(matchesTodoTaskSearch(row, "#83")).toBe(true);
  });

  it("does not match unrelated numeric fragments", () => {
    const row = task(83, "A1");
    expect(matchesTodoTaskSearch(row, "99")).toBe(false);
    expect(matchesTodoTaskSearch(row, "0099")).toBe(false);
  });

  it("still matches title text search", () => {
    const row = task(83, "Alpha task");
    expect(matchesTodoTaskSearch(row, "alpha")).toBe(true);
  });

  it("matches mixed id digits and title letters in one query", () => {
    const row = task(83, "A1");
    expect(matchesTodoTaskSearch(row, "00a")).toBe(true);
    expect(matchesTodoTaskSearch(row, "99a")).toBe(false);
  });
});
