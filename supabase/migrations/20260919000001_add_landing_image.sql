-- Add landing_image_path column for AI-styled images on public landing page
-- Staff/Admin portals continue using image_path (real product photo)
ALTER TABLE suits ADD COLUMN IF NOT EXISTS landing_image_path TEXT;
