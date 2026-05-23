/**
 * Wraps a Prisma call (or any async fetcher) with build-time safety.
 * If the database is unreachable during the build process (ECONNREFUSED),
 * it returns a fallback value instead of crashing the build.
 */
export async function withBuildSafety<T>(fetcher: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fetcher();
  } catch (error) {
    // Detect Prisma connection errors (P1001) or raw ECONNREFUSED
    const errorMsg = error instanceof Error ? error.message : String(error);
    const errorCode = (error as { code?: string })?.code;

    const isConnError = 
      errorMsg.includes('ECONNREFUSED') || 
      errorMsg.includes('Can\'t reach database') ||
      errorMsg.includes('Connection terminated') ||
      errorMsg.includes('timeout') ||
      errorMsg.includes('unexpectedly') ||
      errorCode === 'ECONNREFUSED' ||
      errorCode === 'P1001' ||
      errorCode === 'P2024' || // Connection pool timeout
      errorCode === 'P1017' || // Server has closed the connection
      errorCode === 'P2021'    // Table does not exist in the current database
    ;

    if (isConnError) {
      const logType = errorCode === 'P2021' ? 'Schema' : 'Connection';
      console.warn(`⚠️ Database ${logType} error during build: ${errorMsg}. Using fallback data.`);
      return fallback;
    }
    
    // Re-throw other types of errors (syntax, logic, etc.)
    throw error;
  }
}
