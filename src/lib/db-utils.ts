/**
 * Recursively inspects an error object to determine if it is a database connection or timeout error.
 */
function isConnectionError(error: unknown): boolean {
  if (!error) return false;

  const messages: string[] = [];
  const errObj = error as Record<string, unknown>;

  if (errObj.message) messages.push(String(errObj.message));
  if (errObj.code) messages.push(String(errObj.code));
  if (errObj.errorCode) messages.push(String(errObj.errorCode));
  if (errObj.clientVersion) messages.push(String(errObj.clientVersion));

  // Prisma error code
  const prismaCode = errObj.code;
  if (typeof prismaCode === "string") {
    const isPrismaConnCode =
      prismaCode.startsWith("P10") || // P1001, P1002, P1003, P1008, P1017, etc. (Common connection errors)
      prismaCode === "P2024" ||       // Connection pool timeout
      prismaCode === "P2021" ||       // Table does not exist
      prismaCode === "ETIMEDOUT" ||
      prismaCode === "ECONNREFUSED"
    ;
    if (isPrismaConnCode) return true;
  }

  // Check cause or inner error recursively
  if (errObj.cause && isConnectionError(errObj.cause)) {
    return true;
  }

  // Fallback to serialization check
  try {
    const errorString = String(error) + " " + JSON.stringify(error);
    messages.push(errorString);
  } catch {
    messages.push(String(error));
  }

  const connKeywords = [
    "econnrefused",
    "etimedout",
    "can't reach database",
    "connection terminated",
    "timeout",
    "unexpectedly",
    "connection error",
    "database unreachable",
    "network error",
    "pool timeout",
  ];

  return connKeywords.some((keyword) =>
    messages.some((msg) => msg.toLowerCase().includes(keyword))
  );
}

/**
 * Wraps a Prisma call (or any async fetcher) with build-time safety.
 * If the database is unreachable during the build process,
 * it returns a fallback value instead of crashing the build.
 */
export async function withBuildSafety<T>(fetcher: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fetcher();
  } catch (error) {
    if (isConnectionError(error)) {
      const errorCode = (error as { code?: string })?.code;
      const errorMsg = error instanceof Error ? error.message : String(error);
      const logType = errorCode === "P2021" ? "Schema" : "Connection";
      console.warn(`⚠️ Database ${logType} error during build: ${errorMsg}. Using fallback data.`);
      return fallback;
    }
    
    // Re-throw other types of errors (syntax, logic, etc.)
    throw error;
  }
}
