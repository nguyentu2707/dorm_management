export function requireTestDatabase(value, developmentValue) {
  try {
    const url = new URL(value ?? '');
    const database = decodeURIComponent(url.pathname.slice(1));
    if (
      !['postgres:', 'postgresql:'].includes(url.protocol) ||
      !database.endsWith('_test') ||
      database.length <= '_test'.length
    ) throw new Error();
    if (developmentValue) {
      const development = new URL(developmentValue);
      if (url.href === development.href) throw new Error();
    }
    return url;
  } catch {
    // Never include the invalid URL: it may contain a database password.
    throw new Error('Set TEST_DATABASE_URL to a dedicated database ending in _test');
  }
}
