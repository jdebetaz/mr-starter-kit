/*
|--------------------------------------------------------------------------
| Scheduler
|--------------------------------------------------------------------------
|
| Recurring jobs are registered here. This file is preloaded in the `web`
| environment, so registration happens when the HTTP server starts; the worker
| process is what actually executes a due run.
|
| A schedule is awaited directly — there is no `.run()`:
|
|   import ReconcileSubscriptions from '#billing/jobs/reconcile_subscriptions'
|
|   await ReconcileSubscriptions.schedule({})
|     .cron('0 3 * * *')
|     .timezone('Europe/Zurich')
|
| Or on an interval:
|
|   await SweepExpiringTrials.schedule({}).every('15m')
|
| A schedule's id defaults to the job class name, so re-registering updates it
| in place and keeps its run count and next run. `node ace queue:scheduler:list`
| shows what is registered.
|
*/

export {};
