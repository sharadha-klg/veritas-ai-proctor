
ALTER TABLE public.tests 
ADD COLUMN IF NOT EXISTS scheduled_start timestamp with time zone,
ADD COLUMN IF NOT EXISTS scheduled_end timestamp with time zone;
