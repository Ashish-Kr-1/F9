# Contributing Guidelines

To ensure a 100% professional workflow and prevent merge conflicts in this fast-paced hackathon, we follow a strict branching and commit strategy.

## Branching Strategy
Never commit directly to `main`. Always create a specific branch for your task.

### Branch Naming Conventions
- **Feature Branches:** `feature/<team>/<issue-name>`
  - UI Team: `feature/ui/start-menu`
  - Logic Team: `feature/logic/minesweeper`
  - DB Team: `feature/db/user-auth`
- **Bug Fixes:** `bugfix/<issue-name>`

## Workflow
1. **Pull the latest changes:**
   ```bash
   git pull origin main --rebase
   ```
2. **Create a new branch:**
   ```bash
   git checkout -b feature/ui/your-feature
   ```
3. **Commit your changes frequently** with descriptive messages.
4. **Push your branch:**
   ```bash
   git push origin feature/ui/your-feature
   ```
5. **Open a Pull Request (PR)** against `main`.

## Pull Request Guidelines
- Always link the PR to the specific issue/feature you are building.
- Wait for at least ONE approval from another team member before merging.
- **Merge Conflicts:** If there are conflicts, communicate with the person whose changes conflict with yours. Resolve conflicts locally by merging `main` into your feature branch before updating the PR.
