interface ReelProps {
  index: number;
  value: number | null;
  tone: "primary" | "special";
  label: string;
  spinning: boolean;
  revealed: boolean;
}

const STRIP_VALUES = [
  "03",
  "17",
  "29",
  "08",
  "34",
  "11",
  "26",
  "05",
  "31",
  "14",
  "22",
  "09",
];

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

export function Reel({
  index,
  value,
  tone,
  label,
  spinning,
  revealed,
}: ReelProps) {
  const display = revealed && value !== null ? pad(value) : "--";
  const accessibleValue = revealed && value !== null ? pad(value) : "待揭晓";

  return (
    <div
      className={[
        "reel",
        `reel--${tone}`,
        spinning ? "reel--spinning" : "",
        revealed ? "reel--revealed" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      data-testid="number-reel"
      data-tone={tone}
      data-reel-index={index}
      role="img"
      aria-label={`${label} ${index + 1}：${accessibleValue}`}
    >
      <div className="reel__glass" aria-hidden="true">
        <div
          className="reel__strip"
          style={{ animationDelay: `${index * -23}ms` }}
        >
          {[...STRIP_VALUES, ...STRIP_VALUES].map((symbol, symbolIndex) => (
            <span key={`${symbol}-${symbolIndex}`}>{symbol}</span>
          ))}
        </div>
      </div>
      <span className="reel__value" aria-hidden="true">
        {display}
      </span>
    </div>
  );
}
