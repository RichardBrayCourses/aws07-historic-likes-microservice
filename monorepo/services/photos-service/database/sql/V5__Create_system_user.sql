INSERT INTO registered_user (sub, email, nickname)
VALUES ('system', 'system@example.com', 'system')
ON CONFLICT (sub) DO UPDATE
SET email = EXCLUDED.email,
    nickname = EXCLUDED.nickname;
