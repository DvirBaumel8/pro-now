#!/usr/bin/env bash
# Protects master so that nothing reaches it except a pull request whose CI
# is green (docs/22-WORKING-MODEL.md §2). Run once, by a repository ADMIN:
#
#   gh auth login            # as the repository owner
#   bash scripts/setup-branch-protection.sh
#
# Safe to re-run: it updates the ruleset instead of adding a second one.
set -euo pipefail

REPO="${REPO:-$(gh repo view --json nameWithOwner --jq .nameWithOwner)}"
RULESET_NAME="master: PR + green CI"
# GitHub Actions' app id: the check must come from our workflow, not from
# anything else that posts a status with the same name.
GITHUB_ACTIONS_APP_ID=15368

echo "Repository: $REPO"

# Squash merges keep master one commit per change; branches are deleted on
# merge; auto-merge lets an agent queue its PR to merge the moment CI passes.
gh api -X PATCH "repos/$REPO" \
  -F allow_auto_merge=true \
  -F delete_branch_on_merge=true \
  -F allow_squash_merge=true \
  -F allow_merge_commit=false \
  -F allow_rebase_merge=false \
  -F allow_update_branch=true \
  --silent
echo "Repository merge settings updated."

read -r -d '' RULESET <<JSON || true
{
  "name": "$RULESET_NAME",
  "target": "branch",
  "enforcement": "active",
  "conditions": { "ref_name": { "include": ["~DEFAULT_BRANCH"], "exclude": [] } },
  "bypass_actors": [],
  "rules": [
    { "type": "deletion" },
    { "type": "non_fast_forward" },
    {
      "type": "pull_request",
      "parameters": {
        "required_approving_review_count": 0,
        "dismiss_stale_reviews_on_push": false,
        "require_code_owner_review": false,
        "require_last_push_approval": false,
        "required_review_thread_resolution": false
      }
    },
    {
      "type": "required_status_checks",
      "parameters": {
        "strict_required_status_checks_policy": true,
        "required_status_checks": [
          { "context": "CI passed", "integration_id": $GITHUB_ACTIONS_APP_ID }
        ]
      }
    }
  ]
}
JSON

EXISTING_ID="$(gh api "repos/$REPO/rulesets" --jq ".[] | select(.name == \"$RULESET_NAME\") | .id")"
if [ -n "$EXISTING_ID" ]; then
  echo "$RULESET" | gh api -X PUT "repos/$REPO/rulesets/$EXISTING_ID" --input - --silent
  echo "Ruleset $EXISTING_ID updated."
else
  echo "$RULESET" | gh api -X POST "repos/$REPO/rulesets" --input - --silent
  echo "Ruleset created."
fi

gh api "repos/$REPO/rules/branches/master" --jq '.[].type' | sort -u | sed 's/^/  active rule: /'
