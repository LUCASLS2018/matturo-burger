// Native background GPS for the courier Android app (Capacitor). Falls back to web GPS elsewhere.
type Loc = { latitude: number; longitude: number; accuracy: number };
type Plugin = {
  addWatcher(o: Record<string, unknown>, cb: (l?: Loc, e?: { code?: string }) => void): Promise<string>;
  removeWatcher(o: { id: string }): Promise<void>;
  openSettings(): Promise<void>;
};
let plugin: Plugin | null = null;

export function isNativeApp(): boolean {
  const cap = (globalThis as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  return typeof window !== "undefined" && !!cap?.isNativePlatform?.();
}

async function getPlugin(): Promise<Plugin> {
  if (!plugin) {
    const { registerPlugin } = await import("@capacitor/core");
    plugin = registerPlugin<Plugin>("BackgroundGeolocation");
  }
  return plugin;
}

export async function startNativeWatch(onLocation: (l: Loc) => void, onError: (msg: string) => void): Promise<string> {
  const p = await getPlugin();
  return p.addWatcher({
    backgroundMessage: "A partilhar a sua localização com o cliente.",
    backgroundTitle: "Matturo — entrega em curso",
    requestPermissions: true,
    stale: false,
    distanceFilter: 0,
  }, (location, error) => {
    if (error) {
      if (error.code === "NOT_AUTHORIZED") { onError("Autorize a localização «Permitir sempre» nas definições."); void p.openSettings(); }
      return;
    }
    if (location) onLocation(location);
  });
}

export async function stopNativeWatch(id: string): Promise<void> {
  await (await getPlugin()).removeWatcher({ id }).catch(() => undefined);
}
