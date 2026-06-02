import {
  useCallback,
  useEffect,
  useRef,
  type ClipboardEvent,
  type KeyboardEvent,
} from "react";

type OtpInputProps = {
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  disabled?: boolean;
  id?: string;
};

const OTP_LENGTH = 6;

export function OtpInput({
  value,
  onChange,
  onComplete,
  disabled = false,
  id = "otp",
}: OtpInputProps) {
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = value.padEnd(OTP_LENGTH, " ").slice(0, OTP_LENGTH).split("");

  const focusIndex = useCallback((index: number) => {
    const target = inputRefs.current[index];
    if (target) {
      target.focus();
      target.select();
    }
  }, []);

  const applyDigits = useCallback(
    (nextDigits: string[]) => {
      const sanitized = nextDigits
        .map((digit) => digit.replace(/\D/g, "").slice(-1))
        .join("")
        .slice(0, OTP_LENGTH);
      onChange(sanitized);
      if (sanitized.length === OTP_LENGTH) {
        onComplete?.(sanitized);
      }
      return sanitized;
    },
    [onChange, onComplete],
  );

  useEffect(() => {
    if (value.length === 0) {
      focusIndex(0);
    }
  }, [focusIndex, value.length]);

  function handleDigitChange(index: number, digit: string) {
    const cleaned = digit.replace(/\D/g, "");
    const nextDigits = [...digits.map((d) => (d === " " ? "" : d))];

    if (cleaned.length > 1) {
      const pasted = cleaned.slice(0, OTP_LENGTH - index);
      for (let offset = 0; offset < pasted.length; offset += 1) {
        nextDigits[index + offset] = pasted[offset] ?? "";
      }
      const sanitized = applyDigits(nextDigits);
      focusIndex(Math.min(sanitized.length, OTP_LENGTH - 1));
      return;
    }

    nextDigits[index] = cleaned;
    const sanitized = applyDigits(nextDigits);
    if (cleaned && index < OTP_LENGTH - 1) {
      focusIndex(index + 1);
    } else if (sanitized.length === OTP_LENGTH) {
      inputRefs.current[OTP_LENGTH - 1]?.blur();
    }
  }

  function handleKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace") {
      const nextDigits = [...digits.map((d) => (d === " " ? "" : d))];
      if (nextDigits[index]) {
        nextDigits[index] = "";
        applyDigits(nextDigits);
        return;
      }
      if (index > 0) {
        nextDigits[index - 1] = "";
        applyDigits(nextDigits);
        focusIndex(index - 1);
      }
      return;
    }

    if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      focusIndex(index - 1);
      return;
    }

    if (event.key === "ArrowRight" && index < OTP_LENGTH - 1) {
      event.preventDefault();
      focusIndex(index + 1);
    }
  }

  function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
    event.preventDefault();
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (!pasted) return;
    applyDigits(pasted.split(""));
    focusIndex(Math.min(pasted.length, OTP_LENGTH - 1));
  }

  return (
    <div
      className="flex justify-center gap-2 sm:gap-2.5"
      role="group"
      aria-labelledby={`${id}-label`}
    >
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(element) => {
            inputRefs.current[index] = element;
          }}
          id={index === 0 ? id : undefined}
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          pattern="[0-9]*"
          maxLength={1}
          value={digit === " " ? "" : digit}
          disabled={disabled}
          aria-label={`Digit ${index + 1} of ${OTP_LENGTH}`}
          className="h-12 w-11 rounded-xl border border-slate-300 bg-white text-center text-lg font-black text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:bg-slate-100 sm:h-14 sm:w-12 sm:text-xl"
          onChange={(event) => handleDigitChange(index, event.target.value)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          onPaste={handlePaste}
          onFocus={(event) => event.target.select()}
        />
      ))}
    </div>
  );
}
