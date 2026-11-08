import { expect,it } from "vitest";
import {trackingActive,validTrackingLink} from "./delivery";
it("only active deliveries share GPS",()=>{expect(trackingActive("confirmed")).toBe(false);expect(trackingActive("active")).toBe(true);expect(trackingActive("delivered")).toBe(false);});
it("rejects expired links",()=>expect(validTrackingLink("2026-01-01",null,Date.parse("2026-01-02"))).toBe(false));
it("rejects revoked links",()=>expect(validTrackingLink("2027-01-01","2026-01-01",Date.parse("2026-01-02"))).toBe(false));