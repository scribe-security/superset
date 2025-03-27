# Create an empty file for conflict commits
touch conflict_commits.txt

# Get commits in reverse order using tail -r (macOS equivalent of tac)
git log --format="%H" 69c6807d8d14..90e62a30ed2c | tail -r > commits_to_cherry_pick.txt

# Loop through the commits
while read commit; do
  if git cherry-pick $commit &>/dev/null; then
    echo "Successfully cherry-picked: $commit"
  else
    # If cherry-pick failed, save commit to conflict list and abort
    echo $commit >> conflict_commits.txt
    echo "Conflict detected in commit: $commit (saved to conflict_commits.txt)"
    git cherry-pick --abort
  fi
done < commits_to_cherry_pick.txt

echo "Cherry-pick completed. Commits with conflicts are saved in conflict_commits.txt
