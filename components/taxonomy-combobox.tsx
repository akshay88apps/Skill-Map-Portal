'use client';

import { useId, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { taxonomyGroups } from '@/lib/taxonomy';

export const OTHER_TAXONOMY_VALUE = '__other__';

export function filterTaxonomyGroups(
  query: string,
  excluded: string[] = [],
) {
  const normalized = query.trim().toLowerCase();
  const excludedNames = new Set(excluded);
  return taxonomyGroups
    .map((group) => ({
      category: group.category,
      skills: group.skills.filter(
        (skill) =>
          !excludedNames.has(skill) &&
          (!normalized || skill.toLowerCase().includes(normalized)),
      ),
    }))
    .filter((group) => group.skills.length);
}

export function TaxonomyCombobox({
  value = '',
  onSelect,
  excluded = [],
  label,
  clearAfterSelect = false,
  includeOther = true,
}: {
  value?: string;
  onSelect: (value: string) => void;
  excluded?: string[];
  label: string;
  clearAfterSelect?: boolean;
  includeOther?: boolean;
}) {
  const listId = useId();
  const [query, setQuery] = useState(
    value === OTHER_TAXONOMY_VALUE ? 'Other (specify)' : value,
  );
  const [open, setOpen] = useState(false);
  const groups = useMemo(
    () => filterTaxonomyGroups(query, excluded),
    [excluded, query],
  );
  const choose = (selection: string) => {
    onSelect(selection);
    setQuery(
      clearAfterSelect
        ? ''
        : selection === OTHER_TAXONOMY_VALUE
          ? 'Other (specify)'
          : selection,
    );
    setOpen(false);
  };

  return (
    <div className="relative">
      <div className="relative">
        <Search
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500"
          aria-hidden="true"
        />
        <input
          aria-label={label}
          aria-autocomplete="list"
          aria-controls={listId}
          aria-expanded={open}
          role="combobox"
          className="input pl-9"
          value={query}
          placeholder="Search the HR skills taxonomy"
          autoComplete="off"
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 150)}
          onChange={(event) => {
            setQuery(event.target.value);
            if (value) onSelect('');
            setOpen(true);
          }}
        />
      </div>
      {open && (
        <div
          id={listId}
          role="listbox"
          className="absolute z-30 mt-2 max-h-80 w-full overflow-y-auto rounded-overlay border border-neutral-300 bg-neutral-50 p-2 shadow-overlay"
        >
          {groups.map((group, index) => (
            <div
              role="group"
              aria-label={group.category}
              key={group.category}
              className={
                index ? 'mt-2 border-t border-neutral-200 pt-2' : undefined
              }
            >
              <p className="sticky top-0 z-10 bg-neutral-100 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-neutral-600">
                {group.category}
              </p>
              {group.skills.map((skill) => (
                <button
                  type="button"
                  role="option"
                  aria-selected={skill === value}
                  className={`mt-0.5 block w-full rounded-control px-3 py-2 text-left text-sm font-medium transition-colors focus:outline-none ${
                    skill === value
                      ? 'bg-primary-100 text-primary-900'
                      : 'text-neutral-800 hover:bg-neutral-100'
                  }`}
                  key={skill}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => choose(skill)}
                >
                  {skill}
                </button>
              ))}
            </div>
          ))}
          {!groups.length && (
            <p className="px-3 py-3 text-sm text-neutral-600">
              No taxonomy match found.
            </p>
          )}
          {includeOther && (
            <button
              type="button"
              role="option"
              aria-selected={value === OTHER_TAXONOMY_VALUE}
              className={`mt-2 block w-full rounded-control border border-dashed px-3 py-3 text-left text-sm font-semibold transition-colors focus:outline-none ${
                value === OTHER_TAXONOMY_VALUE
                  ? 'border-primary-300 bg-primary-100 text-primary-900'
                  : 'border-neutral-300 text-primary-700 hover:bg-primary-50'
              }`}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(OTHER_TAXONOMY_VALUE)}
            >
              Other (specify) — send for HR review
            </button>
          )}
        </div>
      )}
    </div>
  );
}
