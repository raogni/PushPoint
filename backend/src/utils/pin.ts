const WEAK_PINS = [
  '0000', '1111', '2222', '3333', '4444', '5555', '6666', '7777', '8888', '9999',
  '1234', '4321', '0123', '9876', '1122', '2233', '3344', '4455', '5566', '6677', '7788', '8899'
];

export const validatePIN = (pin: string): { valid: boolean; error?: string } => {
  // Check length
  if (pin.length < 4 || pin.length > 6) {
    return { valid: false, error: 'PIN must be 4-6 digits' };
  }

  // Check if only digits
  if (!/^\d+$/.test(pin)) {
    return { valid: false, error: 'PIN must contain only numbers' };
  }

  // Check for weak PINs
  if (WEAK_PINS.includes(pin)) {
    return { valid: false, error: 'PIN is too weak. Please choose a different PIN' };
  }

  // Check for sequential numbers (e.g., 12345, 54321)
  const isSequential = (str: string): boolean => {
    for (let i = 0; i < str.length - 1; i++) {
      const diff = parseInt(str[i + 1]) - parseInt(str[i]);
      if (Math.abs(diff) !== 1) return false;
      if (i > 0) {
        const prevDiff = parseInt(str[i]) - parseInt(str[i - 1]);
        if (diff !== prevDiff) return false;
      }
    }
    return true;
  };

  if (isSequential(pin)) {
    return { valid: false, error: 'PIN cannot be sequential (e.g., 12345)' };
  }

  return { valid: true };
};

export const hashPIN = (pin: string): string => {
  // For PINs, we'll store them hashed using bcrypt
  // This will be handled by bcryptjs in the controller
  return pin;
};
