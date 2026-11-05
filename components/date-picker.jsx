"use client";

import { useState } from "react";
import { CalendarIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatDate, fromDateKey, toDateKey } from "@/lib/format";
import { cn } from "@/lib/utils";

const FIRST_MONTH = new Date(2000, 0);
const LAST_MONTH = new Date(new Date().getFullYear() + 10, 11);

// value is a YYYY-MM-DD calendar day.
export function DatePicker({ value, onChange, disabledDays, className, ...props }) {
  const [open, setOpen] = useState(false);
  const selected = value ? fromDateKey(value) : undefined;

  return (
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn("justify-start font-normal", className)}
          {...props}
        >
          <CalendarIcon />
          {value ? formatDate(value) : "Pick a date"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          required
          selected={selected}
          defaultMonth={selected}
          captionLayout="dropdown"
          startMonth={FIRST_MONTH}
          endMonth={LAST_MONTH}
          disabled={disabledDays}
          onSelect={(date) => {
            onChange(toDateKey(date));
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
