/** Placeholder while Route detail People & access loads — same shell as CookieRouteAccessTable. */
export function CookieRouteAccessTableSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div
      className="hub-users-table-wrap rounded-2xl border border-white/5"
      aria-busy="true"
      aria-label="Loading access table"
    >
      <table className="hub-users-table hub-users-table--route-access">
        <colgroup>
          <col className="hub-users-col--select" />
          <col className="hub-route-access-col--user" />
          <col className="hub-route-access-col--role" />
          <col className="hub-route-access-col--sync-at" />
          <col className="hub-route-access-col--load-at" />
          <col className="hub-route-access-col--perm" />
          <col className="hub-route-access-col--perm" />
          <col className="hub-route-access-col--route" />
          <col className="hub-route-access-col--expires" />
        </colgroup>
        <thead>
          <tr>
            {Array.from({ length: 9 }, (_, i) => (
              <th key={i} scope="col">
                <span className="skeleton mx-auto block h-3.5 w-[70%] max-w-[4.5rem]" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }, (_, row) => (
            <tr key={row} className="hub-users-row hub-users-row--static">
              <td className="hub-users-col--select">
                <span className="skeleton mx-auto block h-4 w-4 rounded" />
              </td>
              <td className="hub-route-access-col--user">
                <span className="skeleton block h-3.5 w-[85%] max-w-[12rem]" />
              </td>
              <td className="hub-route-access-col--role">
                <span className="skeleton mx-auto block h-5 w-14 rounded-full" />
              </td>
              <td className="hub-route-access-col--sync-at">
                <span className="skeleton mx-auto block h-3.5 w-12" />
              </td>
              <td className="hub-route-access-col--load-at">
                <span className="skeleton mx-auto block h-3.5 w-12" />
              </td>
              <td className="hub-route-access-col--perm">
                <span className="skeleton mx-auto block h-4 w-4 rounded-full" />
              </td>
              <td className="hub-route-access-col--perm">
                <span className="skeleton mx-auto block h-4 w-4 rounded-full" />
              </td>
              <td className="hub-route-access-col--route">
                <span className="skeleton mx-auto block h-5 w-16 rounded-full" />
              </td>
              <td className="hub-route-access-col--expires">
                <span className="skeleton mx-auto block h-3.5 w-14" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
