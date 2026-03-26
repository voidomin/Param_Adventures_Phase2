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
    const isConnError = 
      error instanceof Error && (
        error.message.includes('ECONNREFUSED') || 
        error.message.includes('Can\'t reach database') ||
        ('code' in error && (error as { code: string }).code === 'ECONNREFUSED') ||
        ('code' in error && (error as { code: string }).code === 'P1001')
      );

    if (isConnError) {
      // We only want to swallow this during build-time static generation
      // In development or actual runtime, we might want to see the error,
      // but for industrial build resilience, we warn and use the fallback.
      console.warn("⚠️ Database connection failed. Using fallback data for static generation.");
      return fallback;
    }
    
    // Re-throw other types of errors (syntax, logic, etc.)
    throw error;
  }
}
