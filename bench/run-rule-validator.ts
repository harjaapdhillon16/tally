/**
 * Run rule validator and generate conflict report
 */

import { validateAllRules, generateConflictReport } from '../packages/categorizer/src/rules/validator.js';
import * as fs from 'fs';
import * as path from 'path';

// Run validation
const report = validateAllRules();

// Generate text report
const textReport = generateConflictReport(report);

// Save JSON report
const jsonPath = path.join(process.cwd(), 'bench', 'rule-validation-report.json');
fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
console.log(`✅ JSON report saved to: ${jsonPath}`);

// Save text report
const textPath = path.join(process.cwd(), 'bench', 'RULE_CONFLICTS.md');
fs.writeFileSync(textPath, textReport);
console.log(`✅ Markdown report saved to: ${textPath}`);

// Print summary to console
console.log('\n' + '='.repeat(80));
console.log('RULE VALIDATION SUMMARY');
console.log('='.repeat(80));
console.log(`Total Rules: ${report.summary.totalRules}`);
console.log(`Conflicts Found: ${report.summary.conflictCount}`);
console.log(`  - Critical: ${report.summary.criticalConflicts}`);
console.log(`  - High: ${report.summary.highConflicts}`);
console.log(`Regex Safety Issues: ${report.summary.regexIssues}`);
console.log(`Dead Rules: ${report.summary.deadRules}`);
console.log('='.repeat(80));

if (report.summary.criticalConflicts > 0 || report.summary.regexIssues > 0) {
  console.log('\n⚠️  CRITICAL ISSUES FOUND - Review RULE_CONFLICTS.md for details');
  process.exit(1);
} else if (report.summary.highConflicts > 0) {
  console.log('\n⚠️  High priority conflicts found - Review recommended');
  process.exit(0);
} else {
  console.log('\n✅ No critical issues found');
  process.exit(0);
}
