-- Trial Statistics Query
-- Based on bot_users.state jsonb field (sceneData.verificationState)
-- States: awaiting_channel_subscription, channel_verified, trial_activated, trial_expired

-- General statistics (all bots)
SELECT
    COUNT(*) FILTER (WHERE state->'sceneData'->>'verificationState' = 'trial_activated') AS active_trials,
    COUNT(*) FILTER (WHERE state->'sceneData'->>'verificationState' = 'awaiting_channel_subscription') AS awaiting_trials,
    COUNT(*) FILTER (WHERE state->'sceneData'->>'verificationState' = 'trial_expired') AS expired_trials,
    COUNT(*) FILTER (WHERE state->'sceneData'->>'verificationState' = 'channel_verified') AS channel_verified,
    COUNT(*) FILTER (WHERE state->'sceneData'->>'verificationState' IS NOT NULL) AS total_trials
FROM bot_users;

-- Statistics by bot
SELECT
    b.id AS bot_id,
    b.name AS bot_name,
    COUNT(*) FILTER (WHERE bu.state->'sceneData'->>'verificationState' = 'trial_activated') AS active_trials,
    COUNT(*) FILTER (WHERE bu.state->'sceneData'->>'verificationState' = 'awaiting_channel_subscription') AS awaiting_trials,
    COUNT(*) FILTER (WHERE bu.state->'sceneData'->>'verificationState' = 'trial_expired') AS expired_trials,
    COUNT(*) FILTER (WHERE bu.state->'sceneData'->>'verificationState' = 'channel_verified') AS channel_verified,
    COUNT(*) FILTER (WHERE bu.state->'sceneData'->>'verificationState' IS NOT NULL) AS total_trials
FROM bot_users bu
INNER JOIN bots b ON b.id = bu.bot_id
GROUP BY b.id, b.name
ORDER BY b.name;
