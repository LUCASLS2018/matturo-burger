import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Converte coordenadas GPS do cliente numa morada portuguesa (geoapi.pt, dados oficiais).
export const reverseGeocode = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ lat: z.number().min(36).max(43), lng: z.number().min(-32).max(-6) }).parse(input))
  .handler(async ({ data }) => {
    const r = await fetch(`https://json.geoapi.pt/gps/${data.lat},${data.lng}`, { headers: { Accept: "application/json" } });
    if (!r.ok) throw new Error("Não foi possível obter a morada desta localização.");
    const j = (await r.json()) as { rua?: string; n_porta?: string; CP?: string; descr_postal?: string; freguesia?: string };
    if (!j.rua && !j.CP) throw new Error("Localização sem morada conhecida. Escreva a morada manualmente.");
    const street = [j.rua, j.n_porta].filter(Boolean).join(" ");
    const address = [street, j.descr_postal ?? j.freguesia].filter(Boolean).join(", ");
    return { address, postal: j.CP ?? "" };
  });
