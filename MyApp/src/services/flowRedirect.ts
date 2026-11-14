export type RouteSegments = readonly string[];

export function getFlowRedirect(
  isLoggedIn: boolean,
  segments: RouteSegments,
  hasChosenLanguage = false,
): string | null {
  const group = segments[0];
  const isLoading = segments.length === 0 || segments[0] === 'index';

  if (!isLoggedIn && group === '(app)') {
    return hasChosenLanguage ? '/(auth)/login' : '/(auth)/language';
  }
  if (isLoggedIn && group === '(auth)') {
    return '/(app)/home';
  }
  if (!isLoggedIn && group === '(auth)') {
    if (!hasChosenLanguage && segments[1] !== 'language') return '/(auth)/language';
    if (hasChosenLanguage && segments[1] === 'language') return '/(auth)/login';
  }
  if (isLoggedIn && isLoading) return null;
  return null;
}
