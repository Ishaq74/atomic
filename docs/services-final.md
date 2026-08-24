# Services implementation note

The Services module is implemented as a first-class CMS module under `src/modules/services`. See `docs/services.md` for the complete architecture, routes, lifecycle, tenant model, engagement rules, validation and migration details.

The database migration is `src/database/migrations/0006_services_module.sql` and the migration journal is updated accordingly.