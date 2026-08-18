// Runs every suite in one process. Each file asserts as it goes and throws on
// the first failure, so a non-zero exit means something regressed.
import "./sm2.test.mjs";
import "./parser.test.mjs";
import "./pricing.test.mjs";
import "./features.test.mjs";
import "./preferences.test.mjs";
