/**
 * THE WHOLE JOURNEY, AGAINST A RUNNING SERVER.
 *
 * The unit tests prove the rules. This proves the product: one customer
 * signing in, picking a real service out of the catalogue, giving an
 * address, being matched with a real professional, and that professional
 * driving, arriving, quoting, being approved and finishing — every step
 * over HTTP against the API, the database and the dispatch engine
 * together.
 *
 * It exists because the parts were all green while the whole had never
 * run. The first time it was attempted end to end it failed at six
 * different steps, and five of those were defects nothing else had
 * caught: an offer that expired into a dead end, a professional stranded
 * out of the market, a Redis outage taking down `accept`, an error
 * handler that had never once executed, and a malformed body answered
 * with 500 and the validator's internals.
 *
 * Requires: the API on :4000, a seeded database, and demonstration
 * professionals (`npm run db:seed:dev`). Run: `npm run verify:journey`.
 */
const API = "http://127.0.0.1:4000";

let failures = 0;
const line = (s) => console.log(s);
const ok = (s, extra = "") => line(`  PASS  ${s}${extra ? "  " + extra : ""}`);
const bad = (s, extra = "") => {
  failures += 1;
  line(`  FAIL  ${s}${extra ? "  " + extra : ""}`);
};

async function call(method, path, { token, body, idem } = {}) {
  const headers = { "content-type": "application/json" };
  if (token) headers.authorization = `Bearer ${token}`;
  if (idem) headers["idempotency-key"] = idem;
  // Fastify refuses an application/json request with no body at all, and
  // several of these endpoints legitimately take none. Send an empty
  // object rather than nothing.
  const res = await fetch(API + path, {
    method,
    headers,
    body: method === "GET" ? undefined : JSON.stringify(body ?? {}),
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* non-JSON body is itself the finding */
  }
  return { status: res.status, json, text };
}

async function login(phone) {
  await call("POST", "/v1/auth/otp/request", { body: { phone } });
  const r = await call("POST", "/v1/auth/otp/verify", { body: { phone, code: "123456" } });
  return r.json?.token ?? null;
}

const run = async () => {
  line("\n== THE CUSTOMER ==");
  const custToken = await login("+972541234567");
  custToken ? ok("customer signs in") : bad("customer signs in");

  const cat = await call("GET", "/v1/catalog");
  const depts = cat.json?.departments ?? cat.json ?? [];
  Array.isArray(depts) && depts.length
    ? ok("catalogue loads", `${depts.length} departments`)
    : bad("catalogue loads", JSON.stringify(cat.json).slice(0, 120));

  // Find a VISIT_QUOTE service so the quote path is exercised too.
  const flat = JSON.stringify(cat.json);
  const svcId = (flat.match(/"id":"([^"]+)","code":"HOME_PLUMB_LEAK"/) ||
    flat.match(/"code":"HOME_PLUMB_LEAK"[^}]*?"id":"([^"]+)"/) || [])[1];
  svcId ? ok("service found in catalogue", "HOME_PLUMB_LEAK") : bad("service found in catalogue");

  const addr = await call("POST", "/v1/me/addresses", {
    token: custToken,
    body: { formatted: "פלורנטין 12, תל אביב", lat: 32.056, lng: 34.77, label: "בית" },
  });
  const addrId = addr.json?.address?.id ?? addr.json?.id;
  addrId ? ok("address saved") : bad("address saved", addr.text.slice(0, 120));

  const job = await call("POST", "/v1/jobs", {
    token: custToken,
    idem: "walk-" + Date.now(),
    body: {
      serviceId: svcId,
      addressId: addrId,
      description: "נזילה מתחת לכיור במטבח",
      structuredAnswers: { floor: "3", water_shut: "no" },
    },
  });
  const jobId = job.json?.job?.id;
  const dispatch = job.json?.dispatch;
  jobId ? ok("job created") : bad("job created", job.text.slice(0, 160));
  if (dispatch?.status !== "OFFER_SENT") {
    /*
     * Everything after this point is about a professional who was never
     * asked, so it stops here rather than reporting eight consequences of
     * one cause. The usual reason is that the demonstration cohort is
     * busy with the previous run — the fixture is reset by the npm
     * script, not by this file, so that running the walk never silently
     * drags somebody out of a live job.
     */
    bad("dispatch sent an offer", JSON.stringify(dispatch));
    line("\n  Nobody was available to ask. `npm run db:seed:dev` returns the");
    line("  demonstration professionals to AVAILABLE; `npm run dev:pulse` keeps");
    line("  their positions current, without which they age out in 90 seconds.\n");
    process.exit(1);
  }
  ok("dispatch sent an offer", `${dispatch.candidatesEligible}/${dispatch.candidatesConsidered} eligible`);

  line("\n== THE PROFESSIONAL ==");
  const proPhone = "+972500000101";
  const proToken = await login(proPhone);
  proToken ? ok("professional signs in") : bad("professional signs in");

  const offer = await call("GET", "/v1/pro/offers/current", { token: proToken });
  const offerId = offer.json?.offerId;
  offerId ? ok("offer is waiting", offer.json.serviceNameHe) : bad("offer is waiting", offer.text.slice(0, 160));

  offer.json?.customerAreaLabel && !offer.json?.addressHe
    ? ok("address withheld before accept", offer.json.customerAreaLabel)
    : bad("address withheld before accept");

  const accept = await call("POST", `/v1/offers/${offerId}/accept`, {
    token: proToken,
    idem: "acc-" + Date.now(),
  });
  accept.status === 200
    ? ok("professional accepts")
    : bad("professional accepts", `${accept.status} ${accept.text.slice(0, 200)}`);

  const proJob = await call("GET", `/v1/pro/jobs/${jobId}`, { token: proToken });
  proJob.status === 200
    ? ok("professional's job detail", `address=${proJob.json?.addressHe ?? "—"}`)
    : bad("professional's job detail", `${proJob.status} ${proJob.text.slice(0, 200)}`);

  proJob.json?.structuredAnswers
    ? ok("intake answers reached the professional", JSON.stringify(proJob.json.structuredAnswers))
    : bad("intake answers reached the professional");

  // Only now: useJobWatch asks for the match once assignedProfessionalId is set.
  const match = await call("GET", `/v1/jobs/${jobId}/match`, { token: custToken });
  match.status === 200
    ? ok("the customer learns who is coming", `${match.json?.professional?.displayName ?? "?"} · ETA ${match.json?.eta?.etaSeconds ?? "?"}s`)
    : bad("the customer learns who is coming", `${match.status} ${match.text.slice(0, 120)}`);

  line("\n== THE JOB RUNS ==");
  for (const [label, path] of [
    ["professional sets off", `/v1/jobs/${jobId}/en-route`],
    ["professional arrives", `/v1/jobs/${jobId}/arrive`],
    // For a VISIT_QUOTE service /start means DIAGNOSIS, not IN_PROGRESS —
    // the price is agreed before the work begins.
    ["professional starts looking", `/v1/jobs/${jobId}/start`],
  ]) {
    const r = await call("POST", path, { token: proToken, idem: label + Date.now() });
    r.status === 200 ? ok(label) : bad(label, `${r.status} ${r.text.slice(0, 160)}`);
  }

  line("\n== THE QUOTE ==");
  const quote = await call("POST", `/v1/jobs/${jobId}/quotes`, {
    token: proToken,
    body: {
      lineItems: [
        { description: "החלפת סיפון", quantity: 1, unitPriceMinorUnits: 22000, kind: "MATERIALS" },
        { description: "עבודה", quantity: 1, unitPriceMinorUnits: 15000, kind: "LABOR" },
      ],
      notes: "כולל אחריות שנה",
    },
  });
  const quoteId = quote.json?.quote?.id;
  const versionHash = quote.json?.quote?.versionHash;
  quoteId
    ? ok("professional sends a quote", `₪${(quote.json.quote.totalMinorUnits / 100).toFixed(2)}`)
    : bad("professional sends a quote", `${quote.status} ${quote.text.slice(0, 200)}`);

  // The bug fixed on the move: this used to be null forever.
  const proJob2 = await call("GET", `/v1/pro/jobs/${jobId}`, { token: proToken });
  proJob2.json?.pendingQuote?.id === quoteId
    ? ok("the pending quote is visible to the professional", `${proJob2.json.pendingQuote.lineItems?.length ?? 0} line items`)
    : bad("the pending quote is visible to the professional", JSON.stringify(proJob2.json?.pendingQuote));

  const approve = await call("POST", `/v1/quotes/${quoteId}/approve`, {
    token: custToken,
    idem: "appr-" + Date.now(),
    body: { quoteId, quoteVersionHash: versionHash },
  });
  approve.status === 200
    ? ok("customer approves the quote")
    : bad("customer approves the quote", `${approve.status} ${approve.text.slice(0, 200)}`);

  line("\n== THE END ==");
  // Approving the quote already moved the job to IN_PROGRESS — the work
  // begins because the price was agreed, not because of a second tap.
  const complete = await call("POST", `/v1/jobs/${jobId}/complete`, {
    token: proToken,
    idem: "done-" + Date.now(),
  });
  complete.status === 200 ? ok("job completes") : bad("job completes", `${complete.status} ${complete.text.slice(0, 160)}`);

  /*
   * And here the walk stops, honestly. COMPLETION_PENDING -> COMPLETED ->
   * PAYMENT_* -> REVIEW_PENDING is EPIC 10, and reviews.ts refuses anything
   * earlier. Nothing is broken; the ledger is not built, because the
   * payment marketplace provider is one of the decisions /CLAUDE.md §4
   * forbids this codebase from inventing.
   */
  const review = await call("POST", `/v1/jobs/${jobId}/reviews`, {
    token: custToken,
    idem: "rev-" + Date.now(),
    body: { overallRating: 5, comment: "הגיע מהר, פתר הכול" },
  });
  review.status === 409
    ? ok("review is correctly refused before payment", "EPIC 10 — payments, not yet built")
    : bad("review is correctly refused before payment", `${review.status} ${review.text.slice(0, 160)}`);

  const badBody = await call("POST", `/v1/jobs/${jobId}/reviews`, { token: custToken, idem: "bad-" + Date.now(), body: { nonsense: true } });
  badBody.status === 400 && badBody.json?.code === "VALIDATION_FAILED"
    ? ok("a malformed body is a 400, not a 500")
    : bad("a malformed body is a 400, not a 500", `${badBody.status} ${badBody.text.slice(0, 120)}`);

  const final = await call("GET", `/v1/jobs/${jobId}`, { token: custToken });
  line(`\n  final job status: ${final.json?.job?.status ?? "?"}`);
  line(`  events recorded:  ${final.json?.job?.events?.length ?? final.json?.events?.length ?? "?"}`);

  line(`\n${failures === 0 ? "ALL STEPS PASSED" : failures + " STEP(S) FAILED"}\n`);
  process.exit(failures === 0 ? 0 : 1);
};

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
