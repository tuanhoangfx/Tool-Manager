import { createContext, useContext, type ReactNode } from "react";
import type { Profile } from "./types";

type Ctx = {
  allUsers: Profile[];
};

const TodoUsersContext = createContext<Ctx>({ allUsers: [] });

export function TodoUsersProvider({
  allUsers,
  children,
}: {
  allUsers: Profile[];
  children: ReactNode;
}) {
  return <TodoUsersContext.Provider value={{ allUsers }}>{children}</TodoUsersContext.Provider>;
}

export function useTodoUsers() {
  return useContext(TodoUsersContext).allUsers;
}
