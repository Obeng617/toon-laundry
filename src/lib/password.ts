export interface PasswordStrength {
  score: 0 | 1 | 2 | 3 | 4;
  label: "Too short" | "Weak" | "Fair" | "Good" | "Strong";
  color: string;
  isAcceptable: boolean;
  hints: string[];
}

export function evaluatePasswordStrength(password: string): PasswordStrength {
  const hints: string[] = [];
  if (password.length < 8) {
    hints.push("At least 8 characters");
  }
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);

  if (!hasUpper) hints.push("Add an uppercase letter");
  if (!hasNumber) hints.push("Add a number");
  if (!hasSymbol) hints.push("Add a symbol (e.g. !@#)");

  if (password.length < 8) {
    return {
      score: 0,
      label: "Too short",
      color: "#FF4D4D",
      isAcceptable: false,
      hints,
    };
  }

  let points = 0;
  if (password.length >= 8) points++;
  if (hasLower && hasUpper) points++;
  if (hasNumber) points++;
  if (hasSymbol || password.length >= 12) points++;

  if (points <= 1) {
    return {
      score: 1,
      label: "Weak",
      color: "#FF4D4D",
      isAcceptable: false,
      hints,
    };
  }
  if (points === 2) {
    return {
      score: 2,
      label: "Fair",
      color: "#F59E0B",
      isAcceptable: true,
      hints,
    };
  }
  if (points === 3) {
    return {
      score: 3,
      label: "Good",
      color: "#02A1DB",
      isAcceptable: true,
      hints,
    };
  }
  return {
    score: 4,
    label: "Strong",
    color: "#10B981",
    isAcceptable: true,
    hints: [],
  };
}
