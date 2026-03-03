export const PASSWORD_REGEX =
  /((?=.*\d)(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/;

export const PASSWORD_REGEX_MESSAGE =
  'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character';
