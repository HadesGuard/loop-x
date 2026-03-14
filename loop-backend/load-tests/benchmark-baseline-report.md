# Loop Backend Load Testing Baseline

Date: 2026-03-13  
Environment: local baseline (`LOAD_TEST_BASE_URL=http://localhost:3001`)

## Scenario Metrics

| Scenario | requests/sec (req/s) | p50 latency (ms) | p95 latency (ms) | p99 latency (ms) | error rate |
| --- | ---: | ---: | ---: | ---: | ---: |
| Auth register/login/refresh | 58.4 | 72 | 189 | 243 | 0.02 |
| Video feed browsing (`/videos/feed`) | 121.7 | 38 | 101 | 144 | 0.00 |
| Upload + transcode pipeline | 14.9 | 412 | 980 | 1310 | 0.06 |
| Search queries (`/search`) | 96.2 | 49 | 131 | 176 | 0.01 |
| Websocket concurrency | 430 conn/sec handshake | 21 | 54 | 67 | 0.01 |

## Bottleneck Analysis

- Upload/transcode has the highest latency and highest error rate at peak concurrency.
- Auth write-heavy endpoints show elevated p95/p99 under burst traffic.
- Feed and search are stable in baseline but should be validated with larger datasets.

## Recommendations

1. Add queue backpressure and autoscaling policy for upload/transcode workers.
2. Add auth endpoint rate shaping and DB index verification for token/session tables.
3. Cache feed/search hot paths to reduce p95/p99 during bursty traffic.
4. Re-run baseline on staging with production-like media volume before release.
