"use client";

import { useState } from "react";

type Client = { id: string; full_name: string; assigned_staff_id: string | null };
type Clinician = { id: string; full_name: string };

export function ClientClinicianFields({
  clients,
  clinicians,
  defaultClientId,
  defaultStaffId,
}: {
  clients: Client[];
  clinicians: Clinician[] | null;
  defaultClientId?: string;
  defaultStaffId?: string;
}) {
  const [clientId, setClientId] = useState(defaultClientId ?? "");
  // Defaults to the selected client's own assigned clinician -- the common
  // case (no explicit staffId passed in, e.g. opening "New Appointment" from
  // a specific client's page) should land on the right pairing without the
  // admin having to think about it, while still allowing an intentional
  // override (e.g. a colleague covering a session).
  const initialClient = clients.find((c) => c.id === defaultClientId);
  const [staffId, setStaffId] = useState(defaultStaffId ?? initialClient?.assigned_staff_id ?? "");

  const selectedClient = clients.find((c) => c.id === clientId);
  const assignedClinician = selectedClient?.assigned_staff_id
    ? clinicians?.find((c) => c.id === selectedClient.assigned_staff_id)
    : null;
  const mismatch = !!assignedClinician && staffId !== assignedClinician.id;

  return (
    <>
      <div>
        <label className="block text-[12.5px] font-semibold text-text-2">Client</label>
        <select
          name="clientId"
          required
          value={clientId}
          onChange={(e) => {
            const nextClientId = e.target.value;
            setClientId(nextClientId);
            const next = clients.find((c) => c.id === nextClientId);
            if (clinicians && next?.assigned_staff_id) {
              setStaffId(next.assigned_staff_id);
            }
          }}
          className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-[13.6px] outline-none focus:border-brand focus:ring-1 focus:ring-brand"
        >
          <option value="" disabled>
            Select a client
          </option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.full_name}
            </option>
          ))}
        </select>
      </div>

      {clinicians && (
        <div>
          <label className="block text-[12.5px] font-semibold text-text-2">Clinician</label>
          <select
            name="staffId"
            required
            value={staffId}
            onChange={(e) => setStaffId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-[13.6px] outline-none focus:border-brand focus:ring-1 focus:ring-brand"
          >
            <option value="" disabled>
              Select a clinician
            </option>
            {clinicians.map((c) => (
              <option key={c.id} value={c.id}>
                {c.full_name}
              </option>
            ))}
          </select>
          {mismatch && (
            <p className="mt-1.5 text-[11.5px] text-warn">
              {selectedClient?.full_name} is usually seen by {assignedClinician.full_name}.
            </p>
          )}
        </div>
      )}
    </>
  );
}
