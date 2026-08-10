'use client';

import { manualCapabilityOptions } from '@/lib/capabilities';

export function CapabilityTagMultiSelect({
  value,
  onChange,
  disabled = false,
}: {
  value: string[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
}) {
  return (
    <fieldset className="space-y-2" disabled={disabled}>
      <legend className="sr-only">Additional Capability Tags</legend>
      {manualCapabilityOptions.map((option) => {
        const checked = value.includes(option.value);
        return (
          <label
            key={option.value}
            className={`flex cursor-pointer items-start gap-2 rounded-control border px-3 py-2 text-xs font-medium transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary-500 has-[:focus-visible]:ring-offset-2 ${
              checked
                ? 'border-primary-500 bg-primary-100 text-primary-900'
                : 'border-neutral-200 bg-neutral-50 text-neutral-700 hover:border-primary-300 hover:bg-primary-50'
            }`}
          >
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 accent-primary-700"
              checked={checked}
              onChange={() =>
                onChange(
                  checked
                    ? value.filter((tag) => tag !== option.value)
                    : [...value, option.value],
                )
              }
            />
            <span>{option.label}</span>
          </label>
        );
      })}
    </fieldset>
  );
}
