ALTER TABLE public.matturo_restaurant_settings
  ADD COLUMN store_address text NOT NULL DEFAULT 'R. Alm. Cândido dos Reis, Vila Franca de Xira, Portugal',
  ADD COLUMN store_latitude double precision,
  ADD COLUMN store_longitude double precision,
  ADD COLUMN delivery_mode text NOT NULL DEFAULT 'postal' CHECK (delivery_mode IN ('postal','radius')),
  ADD CONSTRAINT matturo_store_latitude_valid CHECK (store_latitude IS NULL OR store_latitude BETWEEN -90 AND 90),
  ADD CONSTRAINT matturo_store_longitude_valid CHECK (store_longitude IS NULL OR store_longitude BETWEEN -180 AND 180);

ALTER TABLE public.matturo_delivery_zones
  ADD COLUMN max_distance_km numeric(6,2),
  ADD CONSTRAINT matturo_delivery_zone_rule_valid CHECK (
    (max_distance_km IS NULL AND cardinality(postal_prefixes) > 0)
    OR
    (max_distance_km IS NOT NULL AND max_distance_km > 0 AND max_distance_km <= 100 AND cardinality(postal_prefixes) = 0)
  );