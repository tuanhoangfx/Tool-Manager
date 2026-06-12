const KPI_TILES = 6;
const TABLE_ROWS = 8;

/** Inline cold-load skeleton — KPI band + route table (no portaled dim overlay). */
export function CookieDirectorySkeleton() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3" aria-busy="true" aria-label="Loading cookie routes">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: KPI_TILES }, (_, i) => (
          <div
            key={i}
            className="rounded-lg border border-white/5 bg-white/[.02] px-3 py-2.5"
          >
            <span className="skeleton mb-2 block h-3 w-16" />
            <span className="skeleton block h-5 w-10" />
          </div>
        ))}
      </div>

      <div className="grid gap-2 lg:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="rounded-lg border border-white/5 bg-white/[.02] px-3 py-3">
            <span className="skeleton mb-3 block h-3 w-24" />
            <span className="skeleton block h-16 w-full" />
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-lg border border-white/5 bg-white/[.02]">
        <table className="hub-users-table hub-users-table--cookie-routes min-w-[980px] w-full">
          <thead>
            <tr>
              {["Status", "Route", "URL / ID", "Vault", "Owner / Browser"].map((label) => (
                <th key={label} scope="col" className="px-3 py-2">
                  <span className="skeleton mx-auto block h-3.5 w-[70%] max-w-[4.5rem]" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: TABLE_ROWS }, (_, row) => (
              <tr key={row} className="border-b border-white/5 last:border-0">
                <td className="px-2 py-2">
                  <span className="skeleton block h-8 w-full max-w-[12rem]" />
                </td>
                <td className="px-3 py-2">
                  <span className="skeleton block h-3.5 w-[85%] max-w-[12rem]" />
                </td>
                <td className="px-3 py-2">
                  <span className="skeleton block h-3.5 w-32 font-mono" />
                </td>
                <td className="px-2 py-2">
                  <span className="skeleton mx-auto block h-5 w-14 rounded-full" />
                </td>
                <td className="px-2 py-2">
                  <span className="skeleton block h-3.5 w-20" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
