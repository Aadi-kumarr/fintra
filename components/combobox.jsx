"use client";

import { useState } from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

// A dropdown of known values that also accepts a newly typed one.
export function Combobox({ id, value, onChange, options, placeholder, invalid }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const typed = query.trim();
  const isNew = typed && !options.some((option) => option.toLowerCase() === typed.toLowerCase());

  function select(next) {
    onChange(next);
    setOpen(false);
    setQuery("");
  }

  return (
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-invalid={invalid || undefined}
          className="w-full justify-between font-normal"
        >
          <span className={cn("truncate", !value && "text-muted-foreground")}>
            {value || placeholder}
          </span>
          <ChevronsUpDown className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
        <Command>
          <CommandInput placeholder="Search or type a new one" value={query} onValueChange={setQuery} />
          <CommandList>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem key={option} value={option} onSelect={() => select(option)}>
                  <Check className={cn(option === value ? "opacity-100" : "opacity-0")} />
                  {option}
                </CommandItem>
              ))}
              {isNew && (
                <CommandItem value={typed} onSelect={() => select(typed)}>
                  <Plus />
                  Use &quot;{typed}&quot;
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
