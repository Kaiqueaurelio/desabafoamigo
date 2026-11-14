import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

type Props = {
  id?: string;
  name?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
  className?: string;
};

export function PasswordInput({
  id,
  name,
  value,
  onChange,
  placeholder,
  autoComplete = "current-password",
  required,
  className,
}: Props) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        id={id}
        name={name}
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        required={required}
        style={{
          WebkitTextFillColor: "hsl(var(--foreground))",
          WebkitBoxShadow: "0 0 0 1000px hsl(var(--background)) inset",
          caretColor: "hsl(var(--foreground))",
        }}
        className={
          className ??
          "w-full rounded-lg border border-border bg-background px-3 py-2 pr-10 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/40"
        }
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? "Ocultar senha" : "Mostrar senha"}
        aria-pressed={show}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground hover:text-primary focus:outline-none focus:ring-2 focus:ring-ring/40"
        tabIndex={0}
      >
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}
