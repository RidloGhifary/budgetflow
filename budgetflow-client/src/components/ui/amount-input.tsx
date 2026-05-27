import * as React from "react";

import { Input, type InputProps } from "@/components/ui/input";

type AmountInputProps = Omit<InputProps, "inputMode" | "onChange" | "pattern" | "type"> & {
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
};

export function normalizeAmountInputValue(value: string) {
  const digits = value.replace(/\D/g, "");

  if (!digits) {
    return "";
  }

  return digits.replace(/^0+(?=\d)/, "");
}

const AmountInput = React.forwardRef<HTMLInputElement, AmountInputProps>(({ onChange, ...props }, ref) => {
  const handleChange: React.ChangeEventHandler<HTMLInputElement> = (event) => {
    event.currentTarget.value = normalizeAmountInputValue(event.currentTarget.value);
    onChange?.(event);
  };

  return <Input inputMode="numeric" onChange={handleChange} pattern="[0-9]*" ref={ref} type="text" {...props} />;
});

AmountInput.displayName = "AmountInput";

export { AmountInput };
