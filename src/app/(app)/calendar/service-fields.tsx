"use client";

import { useState } from "react";

type ServiceCode = {
  id: string;
  code: string;
  description: string;
  default_rate_cents: number;
  default_for_type: string | null;
};

const CUSTOM = "custom";

function formatRate(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export function ServiceFields({
  serviceCodes,
  defaultType,
}: {
  serviceCodes: ServiceCode[];
  defaultType: string;
}) {
  const defaultMatch = serviceCodes.find((sc) => sc.default_for_type === defaultType);
  const [serviceCodeId, setServiceCodeId] = useState(defaultMatch?.id ?? serviceCodes[0]?.id ?? CUSTOM);
  const isCustom = serviceCodeId === CUSTOM;

  return (
    <div>
      <label className="block text-[12.5px] font-semibold text-text-2">Service</label>
      <select
        name="serviceCodeId"
        required
        value={serviceCodeId}
        onChange={(e) => setServiceCodeId(e.target.value)}
        className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-[13.6px] outline-none focus:border-brand focus:ring-1 focus:ring-brand"
      >
        {serviceCodes.map((sc) => (
          <option key={sc.id} value={sc.id}>
            {sc.code} — {sc.description} — {formatRate(sc.default_rate_cents)}
          </option>
        ))}
        <option value={CUSTOM}>Custom line item…</option>
      </select>

      {isCustom && (
        <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_120px]">
          <div>
            <label className="block text-[12px] font-semibold text-text-2">Description</label>
            <input
              name="customDescription"
              type="text"
              required={isCustom}
              placeholder="e.g. Extended session"
              className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-[13.6px] outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            />
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-text-2">Rate</label>
            <input
              name="customRate"
              type="number"
              step="0.01"
              min="0"
              required={isCustom}
              placeholder="0.00"
              className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-[13.6px] outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            />
          </div>
        </div>
      )}
    </div>
  );
}
