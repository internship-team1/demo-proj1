-- insert-user.sql
INSERT INTO quiz_users (username, password, role, created_at, updated_at)
VALUES ('cli_user', '123456', 'audience', NOW(), NOW());