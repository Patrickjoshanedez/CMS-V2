# Free hosting for CMS-V2

For a defense with up to three reviewers, the simplest setup is an existing Intel or AMD computer running Docker, with ngrok providing a shareable HTTPS address. For a class pilot, an always-on department computer and a school-managed Cloudflare hostname can avoid cloud rental fees. If the app must run independently of campus hardware, an eligible Azure for Students account can fund a temporary virtual machine.

The production configuration runs six services together: the website, the API, MongoDB, Redis, the document extraction service, and the plagiarism engine. Nginx serves the website and routes `/api/`, `/storage/`, and `/socket.io/` through the same hostname. [Production services](../../docker-compose.prod.yml) · [Website routing](../../docker/nginx.prod.conf)

## 1. Choose the computer

| Host | Setup | Cost and availability |
| --- | --- | --- |
| Your Windows PC | Start Docker Desktop in Linux container mode on an Intel or AMD PC. Keep it awake and connected during the demo. | No cloud compute bill. You supply electricity and internet. Check Docker Desktop licensing for institutional deployments. [Windows installation](https://docs.docker.com/desktop/setup/install/windows-install/) · [License terms](https://docs.docker.com/subscription-billing/desktop-license/) |
| A department Linux server | Use an available x86-64 machine, install Docker Engine and the Compose plugin, and clone the project. | An existing school machine can stay online after your laptop shuts down. [Docker on Ubuntu](https://docs.docker.com/engine/install/ubuntu/) |
| Azure for Students | Sign up using your university email. In the portal choose **Virtual machines → Create**, Ubuntu Server 24.04 LTS **x64**, SSH key login, and allow SSH only from your IP. Start with **2 vCPUs, 8 GB RAM and a 64 GB disk** as a pilot estimate. Review the region's price before creating it. SSH in, install Docker Engine with Compose, and clone your CMS-V2 repository. Run the remaining steps **on the VM**. | Eligible full-time university students receive **US$100 for 12 months** without a credit card. This VM size consumes credit. Keep the spending limit enabled. Between demos use **Stop** in the portal and confirm **Stopped (deallocated)**. Disks and some networking resources still consume credit. [Student offer](https://azure.microsoft.com/en-us/free/students/) · [Create a VM](https://learn.microsoft.com/en-us/azure/virtual-machines/linux/quick-create-portal) · [Billing states](https://learn.microsoft.com/en-us/azure/virtual-machines/states-billing) |

Use Docker Compose 2.24.4 or later for the local port setting below. Run `docker compose version` to check. [Compose overrides](https://docs.docker.com/reference/compose-file/merge/)

## 2. Choose the public address

- **Small demo without a domain.** Create a free ngrok account. Copy its assigned development hostname from the dashboard. Install the ngrok agent on the computer running Docker and connect it with the **add-authtoken** command from your account. Free includes one stable hostname, 20,000 HTTP requests and 1 GB outbound per month. The Google sign-in policy used below allows up to **three distinct OAuth users per month**, including you if you sign in. [Agent setup](https://ngrok.com/docs/gateway/endpoints/agent-cli-quickstart) · [Free limits](https://ngrok.com/docs/pricing-limits/free-plan-limits)
- **Class pilot with a school hostname.** Have the administrator of an existing Cloudflare-managed domain assign a hostname to the CMS. In Cloudflare One, add a **self-hosted Access application** for that hostname and an **Allow** policy for the pilot participants. Choose the Free plan, which supports up to 50 seats. This route assumes the school already controls the domain. [Access setup](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/self-hosted-public-app/) · [Free seats](https://blog.cloudflare.com/zero-trust-week-setting-up-cloudflare-one-as-a-small-business/)

## 3. Configure CMS-V2

Work in the repository root. If you already have a private `.env.prod`, edit that file in place and preserve its existing secrets. For a new installation, copy the example once. On Windows PowerShell:

```powershell
if (!(Test-Path .env.prod)) { Copy-Item .env.prod.example .env.prod }
notepad .env.prod
```

On Ubuntu:

```bash
cp -n .env.prod.example .env.prod
chmod 600 .env.prod
nano .env.prod
```

Enter these values in the private file. Replace `YOUR-HOSTNAME` in both lines with the hostname from step 2. Use the exact HTTPS origin without a trailing slash.

```dotenv
CLIENT_URL=https://YOUR-HOSTNAME
CORS_ALLOWED_ORIGINS=https://YOUR-HOSTNAME
VITE_API_URL=/api
TRUST_PROXY=true
COOKIE_SECURE=true
COOKIE_SAME_SITE=lax
PUBLIC_EXPOSURE_MODE=true
ALLOW_PRODUCTION_LOCALSTACK_TESTING=false
STORAGE_MODE=filesystem
STORAGE_LOCAL_PATH=/app/uploads
PLAGIARISM_TORCH_VARIANT=cpu
PLAGIARISM_EMBEDDING_DEVICE=cpu
```

For a new installation, generate **three independent random secrets** with a password manager, using at least 64 hexadecimal characters each. Assign one each to `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, and `REDIS_PASSWORD`. If filling `REDIS_PASSWORD_URLENC`, copy the same hexadecimal Redis password there. Keep the built-in MongoDB and Redis host settings for this single-host pilot. Clear example Google client IDs and origins if Google sign-in is unused.

**Set up email before inviting users.** CMS sends verification codes at registration and during password recovery. Use the university's SMTP relay or a verified sender on Brevo Free (300 sends per day). For Brevo, use `SMTP_HOST=smtp-relay.brevo.com`, `SMTP_PORT=587`, the dashboard's SMTP login for `SMTP_USER`, the generated SMTP key for `SMTP_PASS`, and the verified sender for `EMAIL_FROM`. [SMTP instructions](https://help.brevo.com/hc/en-us/articles/7924908994450-Send-transactional-emails-using-Brevo-SMTP) · [Brevo limits](https://help.brevo.com/hc/en-us/articles/208580669-FAQs-What-are-the-limits-of-the-Free-plan)

## 4. Start the app privately

For a **fresh** installation, create an empty directory named `cms-private-uploads` next to the repository directory for manuscripts. On Linux run `sudo install -d -o 1000 -g 1000 -m 750 ../cms-private-uploads`; the API writes as UID 1000. On Windows use `New-Item -ItemType Directory -Force ../cms-private-uploads`. For an existing installation, keep its current upload directory or migrate its files before changing the mount.

Create `scratch/cms-host.yml` with the following contents. This keeps port 8080 accessible only on the host and points uploads to your private directory. Paths in the override resolve relative to the production Compose file.

```yaml
services:
  client:
    ports: !override
      - "127.0.0.1:8080:80"
  server:
    volumes:
      - ../cms-private-uploads:/app/uploads
```

Run these commands from the repository root. The first build downloads the CPU model and container packages.

```sh
docker compose --env-file .env.prod -f docker-compose.prod.yml -f scratch/cms-host.yml config --quiet
docker compose --env-file .env.prod -f docker-compose.prod.yml -f scratch/cms-host.yml up -d --build
docker compose --env-file .env.prod -f docker-compose.prod.yml -f scratch/cms-host.yml ps
```

Open `http://127.0.0.1:8080/api/health` on the host, or use `curl -fsS http://127.0.0.1:8080/api/health` over SSH. Look for all six containers to be healthy, both `services.mongodb.healthy` and `services.redis.healthy` to be true, and check `integrations.smtp`. If one container fails, read its logs, for example `docker compose --env-file .env.prod -f docker-compose.prod.yml -f scratch/cms-host.yml logs --tail=60 plagiarism_api`. [Health endpoint](../../server/app.js) · [Public deployment checks](../DEPLOYMENT.md#public-internet-exposure-gate-docker--ngrok)

## 5. Share the HTTPS address

- **ngrok.** Save ngrok's **“Allow specific email addresses”** Google OAuth policy as `scratch/ngrok-review.yml`. Replace the example addresses with the Google accounts of your reviewers. Run `ngrok http http://127.0.0.1:8080 --traffic-policy-file scratch/ngrok-review.yml` and open the displayed HTTPS address. Keep the agent running while sharing the site. The first sign-in admits the reviewer to the tunnel. Their CMS account then determines which records they can access. [Email allowlist example](https://ngrok.com/docs/gateway/traffic-policy/examples/oauth-protection)
- **Cloudflare.** In **Networking → Tunnels**, create a Cloudflare Tunnel. Select the host OS and install the connector **on the host** using the dashboard's service command. Under **Routes → Add route → Published application**, select the hostname protected in step 2. Choose **HTTP** and enter `127.0.0.1:8080` as the service. Enable **Protect with Access** for the application. Share the HTTPS hostname. The connector runs as a service, including after you close your SSH session. [Tunnel setup](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/get-started/create-remote-tunnel/) · [Protect the origin](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/self-hosted-public-app/)

## 6. Verify the deployment

1. Open the public address on a phone using mobile data. Sign in using an allowed reviewer account. Check that an unlisted address is denied.
2. Register using an institutional test mailbox you control, receive a code, sign in, and refresh the page. On a fresh database, arrange for the authorized instructor account and academic records used by your pilot before testing team creation.
3. Submit a sample PDF with selectable text. Reopen it in the document viewer, run a similarity check, and confirm a second signed-in browser receives the expected live update. The current extraction service handles embedded text. Its scanned-page recognizer is incomplete. [Extraction implementation](../../ocr_engine/app.py)
4. Restart the app during the rehearsal and reopen the same submission. For the pilot, back up MongoDB, the private upload directory, and the persistent plagiarism index together. Verify a restore on a separate instance before collecting student work.

**Cloud platform limits checked November 16, 2026.** Oracle's Always Free A1 provides an ARM machine. This checkout pins an x86 Linux CPU build of PyTorch, so the plagiarism image needs an ARM-compatible dependency change and a successful build before using that host. A free Render web service sleeps after inactivity and loses local uploads across restarts. [Oracle compute limits](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm) · [PyTorch CPU wheels](https://download.pytorch.org/whl/cpu/torch/) · [Render free services](https://render.com/docs/free)
