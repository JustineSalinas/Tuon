// Runs every suite in one process. Each file asserts as it goes and throws on
// the first failure, so a non-zero exit means something regressed.
import "./sm2.test.mjs";
import "./parser.test.mjs";
import "./pricing.test.mjs";
import "./features.test.mjs";
import "./preferences.test.mjs";
import "./billing.test.mjs";
import "./merge.test.mjs";
import "./reminders.test.mjs";
import "./readiness.test.mjs";
import "./plan.test.mjs";
import "./email.test.mjs";
import "./sample-set.test.mjs";
