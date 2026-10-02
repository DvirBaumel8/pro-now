import { inject } from "vitest";

// Before any test imports the server: point it at this run's database.
process.env.DATABASE_URL = inject("databaseUrl");
process.env.NODE_ENV = "test";
// Never the public geocoder from a test: the fixture answers instead.
process.env.GEOCODING_PROVIDER = "fixture";
