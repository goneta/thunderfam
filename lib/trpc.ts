type QueryResult<T> = {
  data: T;
  isLoading: boolean;
  isError: boolean;
  error: null;
  refetch: () => Promise<{ data: T }>;
};

const emptyDataFor = (path: string): unknown => {
  if (path.endsWith("unreadCount")) return 0;
  if (path.endsWith("stats")) {
    return {
      users: 0,
      projects: 0,
      pendingProjects: 0,
      totalRevenue: "0",
      openTickets: 0,
    };
  }
  return [];
};

const makeMutation = () => ({
  mutate: (_input?: unknown) => undefined,
  mutateAsync: async (_input?: unknown) => ({ success: true }),
  isPending: false,
  isLoading: false,
});

const makeQuery = (path: string) => {
  const data = emptyDataFor(path);
  return {
    data,
    isLoading: false,
    isError: false,
    error: null,
    refetch: async () => ({ data }),
  } satisfies QueryResult<unknown>;
};

const makeNode = (path: string): object =>
  new Proxy(
    {},
    {
      get(target, prop) {
        if (prop in target) {
          return (target as Record<PropertyKey, unknown>)[prop];
        }
        if (prop === "useQuery") return () => makeQuery(path);
        if (prop === "useMutation") return () => makeMutation();
        return makeNode(path ? `${path}.${String(prop)}` : String(prop));
      },
    }
  );

export const trpc = Object.assign(makeNode(""), {
  createClient: () => ({}),
  Provider: ({ children }: { children: React.ReactNode }) => children,
}) as any;
