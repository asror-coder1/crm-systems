-- Restrict public listing: only allow direct path access via signed/unsigned URL
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Org logos are publicly accessible" ON storage.objects;

-- For public buckets, files are still served via /object/public/<bucket>/<path>
-- without needing a SELECT policy. Keeping no SELECT policy prevents listing.