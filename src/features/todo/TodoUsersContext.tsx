import { createContext, useContext, useEffect, type ReactNode } from "react";
import type { Profile } from "./types";
import { syncTodoFilterProfileUsers } from "./todo-filter-icons";

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
  useEffect(() => {
    syncTodoFilterProfileUsers(allUsers);
  }, [allUsers]);

  return <TodoUsersContext.Provider value={{ allUsers }}>{children}</TodoUsersContext.Provider>;
}

export function useTodoUsers() {
  return useContext(TodoUsersContext).allUsers;
}
