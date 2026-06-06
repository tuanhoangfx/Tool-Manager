import { useEffect, useState } from "react";
import { Check, Copy, Eye, EyeOff } from "lucide-react";

type Props = {
  id: string;
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  optional?: boolean;
  required?: boolean;
  mono?: boolean;
  readOnly?: boolean;
  hint?: string;
};

export function TwofaRevealField({
  id,
  label,
  name,
  value,
  onChange,
  placeholder,
  optional,
  required,
  mono,
  readOnly,
  hint,
}: Props) {
  const [visible, setVisible] = useState(Boolean(mono));
  const [copied, setCopied] = useState(false);
  const canCopy = Boolean(value.trim());

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1400);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const masked = !visible && Boolean(value.trim());

  return (
    <label className="twofa-reveal-field" htmlFor={id}>
      <span className="twofa-reveal-field__label">
        {label}
        {optional ? <span className="twofa-reveal-field__optional">optional</span> : null}
        {required ? <span className="twofa-reveal-field__required">required</span> : null}
      </span>
      <div className="twofa-reveal-field__row">
        <input
          id={id}
          className={`field auth-gate-field twofa-reveal-field__input w-full${mono ? " twofa-reveal-field__input--mono" : ""}${masked ? " twofa-reveal-field__input--masked" : ""}`}
          name={name}
          type={masked ? "password" : "text"}
          autoComplete="off"
          data-lpignore="true"
          data-1p-ignore
          placeholder={placeholder}
          value={value}
          readOnly={readOnly}
          onFocus={(e) => {
            if (readOnly) e.currentTarget.readOnly = false;
          }}
          onChange={(e) => onChange(e.target.value)}
        />
        <button
          type="button"
          className="twofa-reveal-field__icon-btn"
          aria-label={visible ? "Hide value" : "Show value"}
          disabled={!value.trim()}
          onClick={() => setVisible((v) => !v)}
        >
          {visible ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
        <button
          type="button"
          className="twofa-reveal-field__icon-btn"
          aria-label="Copy value"
          disabled={!canCopy}
          onClick={() => {
            void navigator.clipboard?.writeText(value.trim()).then(() => setCopied(true));
          }}
        >
          {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
        </button>
      </div>
      {hint ? <p className="twofa-reveal-field__hint">{hint}</p> : null}
    </label>
  );
}
