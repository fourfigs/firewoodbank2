/**
 * Maps technical error messages to user-friendly, actionable messages
 */
export function getUserFriendlyError(error: unknown): string {
  if (typeof error === "string") {
    // Database errors
    if (error.includes("unable to open database file")) {
      return "Database connection error. Please restart the application.";
    }
    if (error.includes("UNIQUE constraint failed")) {
      return "This record already exists. Please check for duplicates.";
    }
    if (error.includes("FOREIGN KEY constraint failed")) {
      return "Invalid reference. The selected item may have been deleted.";
    }
    if (error.includes("NOT NULL constraint failed")) {
      return "A required field is missing. Please fill in all required fields.";
    }
    if (error.includes("CHECK constraint failed")) {
      return "Invalid value entered. Please check your input.";
    }

    // Business logic errors
    if (error.includes("Only staff") || error.includes("Only admin")) {
      return "You don't have permission to perform this action. Contact an administrator if you need access.";
    }
    if (error.includes("required")) {
      return error; // Already user-friendly
    }
    if (error.includes("Invalid") || error.includes("invalid")) {
      return error; // Already user-friendly
    }
    if (error.includes("Failed to")) {
      return error; // Already user-friendly
    }

    // Generic technical errors
    if (error.includes("error returned from database")) {
      return "A database error occurred. Please try again or contact support if the problem persists.";
    }
    if (error.includes("network") || error.includes("connection")) {
      return "Connection error. Please check your internet connection and try again.";
    }

    // Return original if no mapping found
    return error;
  }

  if (error instanceof Error) {
    return getUserFriendlyError(error.message);
  }

  return "An unexpected error occurred. Please try again.";
}
