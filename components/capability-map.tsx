import { ChevronDown } from 'lucide-react';
import {
  buildCapabilityReferenceRows,
  capabilityMappingConfig,
  type CapabilityMappingConfig,
} from '@/lib/capabilities';

export function CapabilityMap({
  config = capabilityMappingConfig,
  defaultOpen = true,
}: {
  config?: CapabilityMappingConfig;
  defaultOpen?: boolean;
}) {
  const rows = buildCapabilityReferenceRows(config);
  const categoryCount = Object.keys(config.categoryToCapability).length;

  return (
    <section id="capability-map" className="card scroll-mt-6 overflow-hidden">
      <details className="group" open={defaultOpen}>
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-5 marker:hidden hover:bg-primary-50 [&::-webkit-details-marker]:hidden">
          <div>
            <p className="eyebrow">Organisation model</p>
            <h2 className="mt-1 text-xl font-semibold text-neutral-900">
              Capability map
            </h2>
            <p className="mt-1 text-sm text-neutral-600">
              {rows.length} capabilities, {categoryCount} skill categories — see
              how departments, practice areas, and selected skills connect.
            </p>
          </div>
          <span className="inline-flex shrink-0 items-center gap-2 text-sm font-semibold text-primary-700">
            View the map
            <ChevronDown
              className="transition-transform group-open:rotate-180"
              size={18}
              aria-hidden="true"
            />
          </span>
        </summary>
        <div className="overflow-x-auto border-t border-neutral-200">
          <table className="data-table min-w-[780px]">
            <thead>
              <tr>
                <th scope="col">Capability</th>
                <th scope="col">Practice Areas / Skill Categories</th>
                <th scope="col">How it&apos;s assigned</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.name}>
                  <th
                    scope="row"
                    className="h-12 border-b border-neutral-200 px-4 py-3 text-left text-sm font-semibold normal-case tracking-normal text-neutral-900"
                  >
                    {row.name}
                  </th>
                  <td>
                    {row.categories.length
                      ? row.categories.join('; ')
                      : '— (role-based, not skill-based)'}
                  </td>
                  <td>{row.assignment}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}
