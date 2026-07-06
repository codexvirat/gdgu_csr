"use client";

import { useState } from "react";
import { Button, Input } from "@/components/ui";

type Row = { id: number; city: string; target: string };

export function CityRows({ initial }: { initial?: Row[] }) {
  const [rows, setRows] = useState<Row[]>(initial ?? [{ id: 0, city: "", target: "" }]);
  const [nextId, setNextId] = useState(1);

  return (
    <div className="space-y-2">
      {rows.map((row) => (
        <div key={row.id} className="flex gap-2">
          <Input
            name="cityName"
            placeholder="City"
            value={row.city}
            onChange={(e) => setRows((r) => r.map((x) => (x.id === row.id ? { ...x, city: e.target.value } : x)))}
            required
          />
          <Input
            name="cityTarget"
            type="number"
            min={1}
            placeholder="Target headcount"
            value={row.target}
            onChange={(e) => setRows((r) => r.map((x) => (x.id === row.id ? { ...x, target: e.target.value } : x)))}
            required
            className="w-44"
          />
          <Button type="button" variant="ghost" onClick={() => setRows((r) => (r.length > 1 ? r.filter((x) => x.id !== row.id) : r))}>
            Remove
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="secondary"
        onClick={() => {
          setRows((r) => [...r, { id: nextId, city: "", target: "" }]);
          setNextId((n) => n + 1);
        }}
      >
        Add city
      </Button>
    </div>
  );
}
