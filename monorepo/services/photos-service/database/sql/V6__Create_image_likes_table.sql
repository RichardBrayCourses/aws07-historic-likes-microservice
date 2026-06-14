CREATE TABLE IF NOT EXISTS image_likes (
    user_sub VARCHAR(255) NOT NULL,
    image_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_sub, image_id),
    CONSTRAINT fk_image_likes_user_sub
        FOREIGN KEY (user_sub)
        REFERENCES registered_user(sub)
        ON DELETE CASCADE,
    CONSTRAINT fk_image_likes_image_id
        FOREIGN KEY (image_id)
        REFERENCES images(id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_image_likes_image_id ON image_likes(image_id);
