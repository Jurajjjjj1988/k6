import http from 'k6/http';
import { check } from 'k6';

export const options = {
  vus: 1,
  iterations: 1,
};

export default function () {
  const res = http.get('https://api.example.com/health');

  check(res, {
    'service reachable': r => r.status === 200,
    'response has OK message': r => r.body.includes('ok')
  });
}
