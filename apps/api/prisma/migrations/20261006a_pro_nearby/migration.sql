-- docs/06 §Notifications: "he's near" goes to the customer once per job.
-- A PRO_NEARBY job event is written at most once for each job; a second
-- write is refused here, whoever tries (two location pings at once).
CREATE UNIQUE INDEX "job_events_one_pro_nearby" ON "job_events"("jobId") WHERE "type" = 'PRO_NEARBY';
