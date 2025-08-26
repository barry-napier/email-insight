# Merge Email Insight Pull Request

## Introduction
Safely merge Email Insight pull requests after comprehensive validation and testing. This command ensures all quality gates, leadership approvals, and integration requirements are met before merging changes to main branch, followed by automatic cleanup and preparation for next development cycle.

## Prerequisites
- Pull request has been created and tested using `test-email-insight-pr.md`
- All required leadership approvals obtained
- CI/CD pipeline passing successfully
- No merge conflicts with main branch
- All acceptance criteria validated and documented

## PR Reference
<pr_reference> #$ARGUMENTS </pr_reference>

## Main Tasks

### 1. Pre-Merge Validation

**PR Status Verification:**
- [ ] Fetch PR status: `gh pr view [PR_NUMBER] --json state,mergeable,reviews,checks`
- [ ] Verify PR is in "OPEN" state and ready for merge
- [ ] Confirm no merge conflicts with main branch
- [ ] Validate all required reviews are approved
- [ ] Check all CI/CD checks are passing

**Quality Gates Final Validation:**
```bash
# Final validation before merge
echo "🔍 Performing final pre-merge validation..."

# Check PR status
PR_STATUS=$(gh pr view $PR_NUMBER --json state,mergeable,reviewDecision,statusCheckRollup --jq '{state: .state, mergeable: .mergeable, reviewDecision: .reviewDecision, checks: [.statusCheckRollup[]|select(.conclusion != "SUCCESS")]}')

# Validate all checks pass
if [ "$PR_STATUS" != '{"state":"OPEN","mergeable":"MERGEABLE","reviewDecision":"APPROVED","checks":[]}' ]; then
    echo "❌ PR not ready for merge. Status: $PR_STATUS"
    exit 1
fi

echo "✅ PR validation passed - ready for merge"
```

**Leadership Approvals Verification:**
- [ ] **Product Owner (@agent-product-owner)**: Business value and acceptance validation ✅
- [ ] **Technical Architect (@agent-technical-architect)**: Architecture compliance review ✅  
- [ ] **UI/UX Designer (@agent-ui-ux-designer)**: Design system compliance *(if applicable)* ✅
- [ ] **Testing QA Engineer (@agent-testing-qa-engineer)**: Quality assurance approval ✅

**Testing Results Verification:**
- [ ] All test suites passed (unit, integration, e2e)
- [ ] Code coverage maintained or improved (>80%)
- [ ] Performance benchmarks met or exceeded
- [ ] Security scan shows no critical vulnerabilities
- [ ] Cross-browser compatibility validated
- [ ] Accessibility compliance verified (WCAG 2.1 AA)

### 2. Branch Synchronization & Conflict Resolution

**Main Branch Synchronization:**
```bash
# Ensure main branch is up to date
echo "📥 Synchronizing with latest main branch..."
git checkout main
git pull origin main

# Check for any new conflicts with PR branch
git checkout [pr-branch-name]
git rebase origin/main

# If conflicts exist, they must be resolved before merge
if [ $? -ne 0 ]; then
    echo "❌ Merge conflicts detected. Please resolve conflicts and re-run."
    echo "Run: git rebase --continue after resolving conflicts"
    exit 1
fi

echo "✅ Branch successfully rebased on latest main"
```

**Final Build Validation on Rebased Branch:**
- [ ] Run complete quality gates after rebase: `npm run lint && npm run type-check && npm test && npm run build`
- [ ] Push rebased branch: `git push --force-with-lease origin [pr-branch-name]`
- [ ] Wait for CI/CD to re-validate after rebase
- [ ] Confirm all checks still pass after synchronization

### 3. Merge Execution & Validation

**Squash Merge with Detailed Commit Message:**
```bash
# Perform squash merge with comprehensive commit message
echo "🔄 Executing squash merge..."

gh pr merge $PR_NUMBER --squash --body "$(cat <<EOF
$(gh pr view $PR_NUMBER --json title --jq .title)

## Implementation Summary
$(gh pr view $PR_NUMBER --json body --jq .body | grep -A 20 "## 📋 Implementation Overview" | head -20)

## Quality Validation Results
- ✅ All unit tests pass ($(gh pr view $PR_NUMBER --json body --jq .body | grep -o '[0-9]*% coverage' | head -1))
- ✅ All integration tests pass
- ✅ All E2E tests pass across browsers
- ✅ Performance benchmarks met
- ✅ Security scan: No critical vulnerabilities
- ✅ Accessibility: WCAG 2.1 AA compliant

## Leadership Approvals
- ✅ Product Owner: Business value validated
- ✅ Technical Architect: Architecture approved
- ✅ Testing QA: Quality standards met
$(if [[ "$PR_BODY" == *"UI/UX Designer"* ]]; then echo "- ✅ UI/UX Designer: Design compliance verified"; fi)

## Phase Completion
Phase: $(gh pr view $PR_NUMBER --json labels --jq '.labels[] | select(.name | startswith("phase-")) | .name')
Components: $(gh pr view $PR_NUMBER --json labels --jq '.labels[] | select(.name | contains("-")) | select(.name | startswith("phase-") | not) | .name' | tr '\n' ', ')

Closes #$(gh pr view $PR_NUMBER --json body --jq .body | grep -o '#[0-9]*' | head -1 | sed 's/#//')

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"

echo "✅ Pull request merged successfully"
```

**Post-Merge Validation:**
- [ ] Verify merge commit appears in main branch: `git log main --oneline -1`
- [ ] Confirm associated issue was closed automatically
- [ ] Check that all branch protection rules were satisfied
- [ ] Validate that merged changes are present in main branch

### 4. Post-Merge Cleanup & Branch Management

**Feature Branch Cleanup:**
```bash
# Clean up merged feature branch
echo "🧹 Cleaning up merged feature branch..."

# Switch to main and pull latest changes
git checkout main
git pull origin main

# Delete local feature branch
git branch -d [pr-branch-name]

# Delete remote feature branch
git push origin --delete [pr-branch-name]

# Prune remote tracking branches
git remote prune origin

echo "✅ Branch cleanup completed"
```

**Repository Status Verification:**
- [ ] Confirm main branch includes merged changes
- [ ] Verify no orphaned branches remain
- [ ] Check that tags are updated if applicable
- [ ] Validate repository is in clean state for next development

### 5. Documentation & Artifact Updates

**Architecture Documentation Updates:**
- [ ] Update `/docs/architecture.md` if system design changed
- [ ] Update `/docs/api-spec.md` with new endpoints or schemas
- [ ] Update `/docs/database-schema.md` if database changes were made
- [ ] Update `/docs/roadmap.md` to reflect completed milestone

**Release Notes Preparation:**
```markdown
# Release Notes Entry
## [Feature/Fix]: [Brief Description]
**Phase**: [Phase X - Name]  
**Issue**: #[issue-number]
**PR**: #[pr-number]

### What's New
- [Feature 1 description]
- [Feature 2 description] 
- [Feature 3 description]

### Technical Improvements
- [Technical improvement 1]
- [Performance enhancement or optimization]
- [Security enhancement if applicable]

### Breaking Changes
- [None or list breaking changes]

### Migration Required
- [None or migration steps if needed]
```

**Changelog Generation:**
- [ ] Add entry to `CHANGELOG.md` with version, date, and changes
- [ ] Update version numbers if applicable (package.json, etc.)
- [ ] Generate API documentation if endpoints changed
- [ ] Update user documentation if UI/UX changes were made

### 6. Deployment Pipeline Preparation

**Production Readiness Validation:**
- [ ] Verify all environment variables and secrets are configured
- [ ] Check that database migrations are ready for production
- [ ] Confirm monitoring and alerting are configured for new features
- [ ] Validate rollback procedures are in place
- [ ] Test deployment scripts in staging environment

**Staging Deployment Trigger:**
```bash
# Trigger staging deployment if configured
echo "🚀 Triggering staging deployment..."

# Option 1: GitHub Actions workflow
gh workflow run deploy-staging.yml --ref main

# Option 2: Direct deployment command  
npm run deploy:staging

# Option 3: Docker deployment
docker-compose -f docker-compose.staging.yml up -d

echo "✅ Staging deployment initiated"
```

**Post-Deployment Validation:**
- [ ] Verify staging environment is running latest code
- [ ] Run smoke tests against staging environment
- [ ] Check monitoring dashboards for any issues
- [ ] Validate all integrated services are functioning
- [ ] Confirm database migrations applied successfully

### 7. Next Phase Preparation

**Roadmap Progress Update:**
- [ ] Mark completed issue/milestone in project roadmap
- [ ] Update phase completion status
- [ ] Identify next priority items for development
- [ ] Review dependencies for upcoming features
- [ ] Update timeline estimates based on actual completion

**Agent Handoff Documentation:**
```markdown
# Phase [X] Completion Handoff

## Completed Features
- ✅ [Feature 1]: Fully implemented and tested
- ✅ [Feature 2]: Fully implemented and tested
- ✅ [Feature 3]: Fully implemented and tested

## Delivered Artifacts
- **Code**: All implementation merged to main
- **Tests**: Comprehensive test suite with >80% coverage
- **Documentation**: Updated architecture and API documentation
- **Database**: Schema migrations applied and validated

## Next Phase Readiness
**Phase [X+1] Prerequisites:**
- ✅ [Prerequisite 1]: Available and validated
- ✅ [Prerequisite 2]: Available and validated
- ✅ [Prerequisite 3]: Available and validated

**Handoff to @agent-[next-lead]:**
- **Interface Contract**: [Specification of delivered functionality]
- **Integration Points**: [How next agent should integrate]
- **Validation Tests**: [Tests to verify integration]
- **Documentation**: [Links to relevant documentation]

## Quality Metrics Achieved
- Test Coverage: [X]% (target: >80%)
- Performance: API P95 < [X]ms (target: <100ms)
- Security: 0 critical vulnerabilities
- Accessibility: WCAG 2.1 AA compliant

## Risk Assessment for Next Phase
- **Low Risk**: [Items that should proceed smoothly]
- **Medium Risk**: [Items requiring attention or monitoring]
- **High Risk**: [Items requiring special planning or mitigation]
```

### 8. Team Communication & Status Updates

**Slack/Team Notification:**
```bash
# Send team notification about completed merge
curl -X POST -H 'Content-type: application/json' \
    --data "{\"text\":\"🎉 Email Insight PR #$PR_NUMBER merged successfully!\n\n**Phase**: [Phase X]\n**Features**: [Brief list]\n**Next**: Ready for Phase [X+1]\n\n**Quality**: All tests ✅ | Coverage: [X]% | Performance: ✅\"}" \
    $SLACK_WEBHOOK_URL
```

**GitHub Project Updates:**
- [ ] Move associated issues to "Done" column
- [ ] Update project milestone progress
- [ ] Close completed milestone if phase is finished
- [ ] Create/update issues for next phase if ready
- [ ] Update project roadmap and timeline

## Merge Report Template

```markdown
# Email Insight Merge Report

## 🎯 Merge Summary
**PR**: #[number] - [Title]
**Issue**: #[issue-number]
**Phase**: [Phase X - Name]
**Merge Time**: [timestamp]
**Merge Method**: Squash merge

## ✅ Pre-Merge Validation
- [✅] All quality gates passed
- [✅] Leadership approvals obtained
- [✅] Testing validation completed
- [✅] No merge conflicts
- [✅] CI/CD pipeline passing

## 📊 Quality Metrics
**Code Quality:**
- Test Coverage: [X]% (↑[Y]% from baseline)
- Build Status: ✅ Successful
- Linting: ✅ No errors
- Type Checking: ✅ No errors

**Performance:**
- API Response Time: P95 [X]ms (target: <100ms)
- Dashboard Load: [X]s (target: <3s) 
- Memory Usage: [X]MB (stable)

**Security:**
- Vulnerabilities: 0 critical, [X] total
- Authentication: ✅ Properly implemented
- Data Protection: ✅ GDPR compliant

## 🏗️ Technical Changes Merged
**Backend Changes:**
- [Change 1]: [Description]
- [Change 2]: [Description]

**Frontend Changes:**
- [Change 1]: [Description]
- [Change 2]: [Description]

**Database Changes:**
- [Migration 1]: [Description]
- [Schema update 2]: [Description]

## 🔄 Next Phase Status
**Phase [X] Completion**: [X]% complete
**Phase [X+1] Readiness**: Ready to begin / Blocked by [dependencies]

**Dependencies for Next Phase:**
- ✅ [Dependency 1]: Available
- ✅ [Dependency 2]: Available
- ⏳ [Dependency 3]: In progress

## 🚀 Deployment Status
**Staging**: [Deployed/Pending/Failed]
**Production**: [Scheduled for [date]/Not yet scheduled]

## 📚 Documentation Updates
- ✅ Architecture documentation updated
- ✅ API specification updated
- ✅ Database schema documented
- ✅ User documentation updated
- ✅ Changelog entry created

---

**Merge completed successfully** ✅  
**Environment ready for next development cycle** ✅  
**Phase [X+1] can begin** ✅

🤖 Generated with [Claude Code](https://claude.ai/code)
```

## Command Usage Examples

### Merge Current PR
```bash
merge-email-insight-pr $(gh pr view --json number --jq .number)
```

### Merge Specific PR Number
```bash
merge-email-insight-pr 42
```

### Merge with Custom Deployment Environment
```bash
merge-email-insight-pr 42 --deploy-to=staging
```

## Success Criteria
- Pull request successfully merged with squash commit
- All quality gates validated before merge
- Feature branch cleaned up locally and remotely
- Documentation updated to reflect changes
- Next development phase ready to begin
- Team notifications sent and project updated
- Staging deployment triggered and validated
- Complete audit trail maintained for compliance