const cutouts = import.meta.glob<string>("../assets/matturo/*-cutout.png", { eager: true, import: "default" });

export function dishCutout(slug: string): string | undefined {
  return cutouts[`../assets/matturo/${slug}-cutout.png`];
}