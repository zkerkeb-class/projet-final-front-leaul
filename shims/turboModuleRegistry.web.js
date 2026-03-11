/**
 * Shim for TurboModuleRegistry on web - avoids "PlatformConstants could not be found".
 * Used by Metro resolveRequest when platform is web.
 */

const webPlatformConstants = {
  getConstants: () => ({
    isTesting: false,
    isDisableAnimations: false,
    reactNativeVersion: { major: 0, minor: 76, patch: 5, prerelease: null },
    forceTouchAvailable: false,
    osVersion: '',
    systemName: 'Web',
    interfaceIdiom: 'desktop',
    isMacCatalyst: false
  })
};

export function get(name) {
  if (name === 'PlatformConstants') return webPlatformConstants;
  return null;
}

export function getEnforcing(name) {
  const mod = get(name);
  if (mod != null) return mod;
  throw new Error(
    `TurboModuleRegistry.getEnforcing(...): '${name}' could not be found. Verify that a module by this name is registered in the native binary.`
  );
}
