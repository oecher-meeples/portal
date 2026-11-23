import { BoardGameTraitTone, type BoardGameTrait } from "@prisma/client";
import { StatusPill, type StatusTone } from "@/components/ui/status-pill";
import { Tooltip } from "@/components/ui/tooltip";
import {
  resolveBoardGameTraits,
  type BoardGameTraitTextData,
} from "@/lib/ludothek/board-game-traits";

const TONE_MAP: Record<BoardGameTraitTone, StatusTone> = {
  [BoardGameTraitTone.INFO]: "info",
  [BoardGameTraitTone.WARNING]: "warning",
  [BoardGameTraitTone.DANGER]: "negative",
};

/**
 * Generischer Pill/Icon-Loop über `game.traits` (#487-Konzept) — merged pro
 * Trait `TRAIT_RENDER_CONFIG` (Darstellungsform, Code) mit der geladenen
 * `BoardGameTraitText`-Zeile (Wortlaut/Ton, DB) über `resolveBoardGameTraits()`.
 * Kein `if (trait === "DIGITAL_HYBRID")`-Sonderfall hier — die eine
 * Icon-Ausnahme steckt vollständig in `TRAIT_RENDER_CONFIG`.
 */
export function BoardGameTraitsDisplay({
  traits,
  textsByTrait,
  className,
}: {
  traits: BoardGameTrait[];
  textsByTrait: Partial<Record<BoardGameTrait, BoardGameTraitTextData>>;
  className?: string;
}) {
  if (traits.length === 0) return null;
  const resolved = resolveBoardGameTraits(traits, textsByTrait);

  return (
    <div
      className={className ? className : "flex flex-wrap items-center gap-1.5"}
    >
      {resolved.map((trait) => {
        if (trait.variant === "pill") {
          return (
            <StatusPill
              key={trait.trait}
              label={trait.label}
              tone={TONE_MAP[trait.tone]}
            />
          );
        }

        const Icon = trait.icon!;
        const icon = (
          <span
            key={trait.trait}
            className="text-muted-foreground inline-flex items-center"
          >
            <Icon className="size-4" aria-label={trait.label} />
          </span>
        );
        return trait.tooltip ? (
          <Tooltip key={trait.trait} content={trait.tooltip}>
            {icon}
          </Tooltip>
        ) : (
          icon
        );
      })}
    </div>
  );
}
