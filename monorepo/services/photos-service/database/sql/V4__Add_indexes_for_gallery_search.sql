-- Indexes to support gallery search by image name, description, and uploader nickname
CREATE INDEX IF NOT EXISTS idx_images_image_name ON images(image_name);
CREATE INDEX IF NOT EXISTS idx_images_image_description ON images(image_description);
CREATE INDEX IF NOT EXISTS idx_registered_user_nickname ON registered_user(nickname);
