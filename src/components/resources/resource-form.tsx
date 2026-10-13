"use client";

import Link from "next/link";
import { useState } from "react";
import type { OpeningHours } from "@/lib/booking-rules";
import { DISPLAY_WEEKDAY_ORDER, WEEKDAYS } from "@/lib/time";
import { saveResource } from "@/server/actions/resources";
import { Alert } from "../ui/alert";
import { buttonStyles } from "../ui/button";
import { Card, CardBody, CardHeader } from "../ui/card";
import { Checkbox, Field, Input, Select, Textarea } from "../ui/field";
import { SubmitButton } from "../ui/submit-button";
import { useFormAction } from "../ui/use-form-action";

type ResourceDefaults = {
  id?: string;
  name: string;
  categoryId: string;
  description: string | null;
  location: string | null;
  capacity: number | null;
  requiresApproval: boolean;
  hours: OpeningHours[];
};

const WORKING_HOURS: OpeningHours[] = [1, 2, 3, 4, 5].map((weekday) => ({
  weekday,
  opensAt: "08:00",
  closesAt: "18:00",
}));

export function ResourceForm({
  categories,
  resource,
}: {
  categories: { id: string; name: string }[];
  resource?: ResourceDefaults;
}) {
  const { state, pending, formProps } = useFormAction(saveResource, { resetOnSuccess: false });
  const initialHours = resource?.hours ?? WORKING_HOURS;
  const [openDays, setOpenDays] = useState(() => new Set(initialHours.map((h) => h.weekday)));

  function toggleDay(weekday: number, open: boolean) {
    setOpenDays((current) => {
      const next = new Set(current);
      if (open) next.add(weekday);
      else next.delete(weekday);
      return next;
    });
  }

  return (
    <form {...formProps} className="grid gap-6">
      {resource?.id && <input type="hidden" name="id" value={resource.id} />}
      {state.ok === false && state.message && <Alert tone="error">{state.message}</Alert>}

      <Card>
        <CardHeader title="Details" description="What people see when they browse and book." />
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" htmlFor="name" error={state.errors?.name}>
            <Input id="name" name="name" defaultValue={resource?.name} maxLength={120} required />
          </Field>
          <Field label="Category" htmlFor="categoryId" error={state.errors?.categoryId}>
            <Select id="categoryId" name="categoryId" defaultValue={resource?.categoryId ?? ""} required>
              <option value="" disabled>
                Choose a category
              </option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Location" htmlFor="location" error={state.errors?.location}>
            <Input
              id="location"
              name="location"
              defaultValue={resource?.location ?? ""}
              placeholder="e.g. Level 2, East wing"
              maxLength={160}
            />
          </Field>
          <Field
            label="Capacity"
            htmlFor="capacity"
            error={state.errors?.capacity}
            hint="Maximum people. Leave empty for equipment."
          >
            <Input
              id="capacity"
              name="capacity"
              type="number"
              min={1}
              defaultValue={resource?.capacity ?? ""}
              inputMode="numeric"
            />
          </Field>
          <Field label="Description" htmlFor="description" error={state.errors?.description} className="sm:col-span-2">
            <Textarea
              id="description"
              name="description"
              defaultValue={resource?.description ?? ""}
              rows={3}
              maxLength={1000}
            />
          </Field>
          <label className="flex items-start gap-3 rounded-lg border border-zinc-200 p-3 sm:col-span-2">
            <Checkbox name="requiresApproval" defaultChecked={resource?.requiresApproval} className="mt-0.5" />
            <span>
              <span className="block text-sm font-medium text-zinc-900">Requires admin approval</span>
              <span className="block text-xs text-zinc-500">
                Member bookings start as requests and hold the slot until an admin approves or rejects them.
              </span>
            </span>
          </label>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Opening hours" description="Bookings are only accepted inside these hours." />
        <CardBody className="grid gap-2">
          {DISPLAY_WEEKDAY_ORDER.map((weekday) => {
            const existing = initialHours.find((h) => h.weekday === weekday);
            const open = openDays.has(weekday);
            const error = state.errors?.[`hours.${weekday}`];
            return (
              <div key={weekday} className="grid gap-1">
                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex w-36 items-center gap-2.5 text-sm font-medium text-zinc-800">
                    <Checkbox
                      name={`open-${weekday}`}
                      checked={open}
                      onChange={(event) => toggleDay(weekday, event.target.checked)}
                    />
                    {WEEKDAYS[weekday]}
                  </label>
                  {open ? (
                    <div className="flex items-center gap-2">
                      <Input
                        type="time"
                        name={`opensAt-${weekday}`}
                        defaultValue={existing?.opensAt.slice(0, 5) ?? "08:00"}
                        step={900}
                        className="w-32"
                        aria-label={`${WEEKDAYS[weekday]} opening time`}
                      />
                      <span className="text-sm text-zinc-400">to</span>
                      <Input
                        type="time"
                        name={`closesAt-${weekday}`}
                        defaultValue={existing?.closesAt.slice(0, 5) ?? "18:00"}
                        step={900}
                        className="w-32"
                        aria-label={`${WEEKDAYS[weekday]} closing time`}
                      />
                    </div>
                  ) : (
                    <span className="text-sm text-zinc-400">Closed</span>
                  )}
                </div>
                {error && <p className="text-xs text-red-600 sm:pl-39">{error[0]}</p>}
              </div>
            );
          })}
        </CardBody>
      </Card>

      <div className="flex justify-end gap-2">
        <Link
          href={resource?.id ? `/resources/${resource.id}` : "/resources"}
          className={buttonStyles({ variant: "secondary" })}
        >
          Cancel
        </Link>
        <SubmitButton pending={pending} pendingText="Saving…">
          {resource?.id ? "Save changes" : "Create resource"}
        </SubmitButton>
      </div>
    </form>
  );
}
