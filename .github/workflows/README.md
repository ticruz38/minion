# GitHub Actions Docker Build

This workflow automatically builds and pushes the Docker image to Docker Hub on every push to the main branch.

## Setup Required

You need to add two secrets to your GitHub repository:

### 1. Go to Repository Settings
Navigate to: `Settings` → `Secrets and variables` → `Actions`

### 2. Add Docker Hub Secrets

Click **"New repository secret"** and add:

| Secret Name | Value |
|-------------|-------|
| `DOCKER_USERNAME` | Your Docker Hub username (e.g., `ticruz38`) |
| `DOCKER_PASSWORD` | Your Docker Hub password or **Access Token** (recommended) |

### Creating a Docker Hub Access Token (Recommended)

Instead of using your password, create an access token:

1. Go to [Docker Hub](https://hub.docker.com)
2. Click your profile → `Account Settings`
3. Go to `Security` → `New Access Token`
4. Name it "GitHub Actions" (or anything)
5. Copy the token and paste it as `DOCKER_PASSWORD`

## What This Workflow Does

- **Triggers on:** Push to `main`/`master` branch or new tags
- **Builds for:** Both AMD64 (Linux servers) and ARM64 (Apple Silicon/Macs)
- **Pushes to:** `docker.io/ticruz38/minion`
- **Tags created:**
  - `latest` (on main branch push)
  - `amd64`, `arm64` (architecture-specific)
  - `v1.0.0` (if you push a tag)
  - Short SHA commit hash

## Manual Trigger

You can also trigger manually from GitHub:
1. Go to `Actions` tab
2. Select `Build and Push Docker Image`
3. Click `Run workflow`

## Testing Locally

To test the build locally before pushing:

```bash
# Build for AMD64 only (fast)
docker build --platform linux/amd64 -t ticruz38/minion:test .

# Build multi-arch (requires buildx)
docker buildx build --platform linux/amd64,linux/arm64 -t ticruz38/minion:test .
```
