# FoundReach CRM

**FoundReach CRM** is the tool that FoundReach self-hosts and offers to its users as part of its workspace.

It is a fork of **[Twenty](https://github.com/twentyhq/twenty)**, distributed under the **GNU Affero General Public License v3.0 (AGPL-3.0)**.

## License & attribution
- Original project: **Twenty** — https://github.com/twentyhq/twenty
- License: **AGPL-3.0** — unchanged. See the `LICENSE` file in this repository.
- All original copyright and license notices are preserved in the source.

## AGPL-3.0 §13 — Corresponding Source offer
FoundReach runs this software as a network service. In accordance with AGPL-3.0
section 13, **this public repository is the Corresponding Source** of the version
we operate, available to every user who interacts with it over the network.

## Modifications
FoundReach's only customizations (removing the upstream branding and login
friction for embedding) are applied **externally, at a reverse-proxy layer** —
the tool's own source code here is the upstream source, unmodified. None of
FoundReach's own SaaS code, environment variables, API keys, secrets or
connection/orchestration system are part of, or required by, this repository.

Contact for source requests: legal@foundreach.io