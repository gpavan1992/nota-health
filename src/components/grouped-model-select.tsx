import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MODEL_GROUPS, findModel } from "@/lib/model-catalog";
import { ProviderMark } from "@/components/provider-mark";
import { cn } from "@/lib/utils";

/**
 * A branded model picker grouped by provider (Anthropic / OpenAI / Google Gemini).
 * Renders a compact monogram in the trigger and per-group section headers in the
 * dropdown so the chat and settings surfaces share a single visual language.
 */
export function GroupedModelSelect({
  value,
  onValueChange,
  id,
  size = "default",
  className,
  showHint = false,
}: {
  value: string;
  onValueChange: (v: string) => void;
  id?: string;
  size?: "default" | "sm";
  className?: string;
  showHint?: boolean;
}) {
  const selected = findModel(value);
  const triggerCls =
    size === "sm"
      ? "h-8 min-w-[200px] text-xs [&>svg]:h-3.5 [&>svg]:w-3.5"
      : "";

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger id={id} className={cn(triggerCls, className)}>
        <SelectValue>
          {selected ? (
            <span className="flex items-center gap-2">
              <ProviderMark provider={selected.group} size={size === "sm" ? "xs" : "sm"} />
              <span className="truncate">{selected.model.label}</span>
            </span>
          ) : (
            "Select a model"
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="max-h-[420px]">
        {MODEL_GROUPS.map((group, i) => (
          <div key={group.id}>
            {i > 0 && <SelectSeparator />}
            <SelectGroup>
              <SelectLabel className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                <ProviderMark provider={group} size="xs" />
                {group.label}
              </SelectLabel>
              {group.models.map((m) => (
                <SelectItem key={m.value} value={m.value} className="pl-8">
                  <div className="flex flex-col">
                    <span className="text-sm">{m.label}</span>
                    {showHint && m.hint && (
                      <span className="text-[11px] text-muted-foreground">{m.hint}</span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectGroup>
          </div>
        ))}
      </SelectContent>
    </Select>
  );
}
