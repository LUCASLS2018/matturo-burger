import {expect,it} from 'vitest';
import {zoneMatches,zoneSchema,orderingAllowed} from './restaurant-settings';
it('pause prevents new ordering',()=>{expect(orderingAllowed(true)).toBe(false);expect(orderingAllowed(false)).toBe(true);});
it('zones use configured Portuguese postal prefixes',()=>{expect(zoneMatches('2600-001',['2600'])).toBe(true);expect(zoneMatches('2610-001',['2600'])).toBe(false);expect(zoneMatches('2600',['2600'])).toBe(false);});
it('fees require nonnegative integer cents',()=>{const zone={name:'Teste',postal_prefixes:['2600'],active:false};expect(zoneSchema.safeParse({...zone,fee_cents:250}).success).toBe(true);expect(zoneSchema.safeParse({...zone,fee_cents:-1}).success).toBe(false);expect(zoneSchema.safeParse({...zone,fee_cents:1.5}).success).toBe(false);});
