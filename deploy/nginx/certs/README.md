Place your production TLS certificates here (do not commit them).

Expected filenames by default config:

- fullchain.pem
- privkey.pem

You can mount `/etc/letsencrypt/live/<domain>/` from the host instead, e.g.:

  - `/etc/letsencrypt/live/api.example.com/fullchain.pem -> deploy/nginx/certs/fullchain.pem`
  - `/etc/letsencrypt/live/api.example.com/privkey.pem -> deploy/nginx/certs/privkey.pem`

Never commit private keys to git. Keep this directory out of source control.

