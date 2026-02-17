type GuardWithFor<A> = { for: (actor: A) => Record<string, unknown> };
type Params<A> = Record<string, GuardWithFor<A>>;
type BoundGuards<A, P extends Params<A>> = {
  [K in keyof P]: P[K] extends { for: (actor: A) => infer R } ? R : never;
};

export function combineGuards<A>() {
  return <P extends Params<A>>(params: P) => {
    return {
      for: (actor: A): BoundGuards<A, P> => {
        return Object.fromEntries(
          Object.entries(params).map(([key, guard]) => [
            key,
            guard.for(actor),
          ]),
        ) as BoundGuards<A, P>;
      },
    };
  };
}
