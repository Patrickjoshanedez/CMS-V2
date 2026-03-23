const BASE = 'http://localhost:5001';
const STUDENT = {
  email: 'bennettchristiangeofferdon15@gmail.com',
  password: 'Password123!',
};

const DOCUMENT_TYPES = ['chapter_1', 'chapter_2', 'chapter_3', 'proposal'];

function cookieHeaderFrom(response) {
  const setCookie = typeof response.headers.getSetCookie === 'function'
    ? response.headers.getSetCookie()
    : [response.headers.get('set-cookie')].filter(Boolean);
  return setCookie.map((c) => c.split(';')[0]).join('; ');
}

async function login(credentials) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  });

  const bodyText = await res.text();
  let body = null;
  try { body = JSON.parse(bodyText); } catch (_e) {}

  if (!res.ok) {
    throw new Error(`Login failed (${res.status}): ${bodyText}`);
  }

  return {
    cookie: cookieHeaderFrom(res),
    user: body?.data?.user,
  };
}

async function getMyProject(cookie) {
  const res = await fetch(`${BASE}/api/projects/me`, {
    headers: { Cookie: cookie },
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch (_e) {}

  return {
    ok: res.ok,
    status: res.status,
    project: json?.data?.project || null,
    raw: json,
  };
}

async function listManuscripts(cookie, projectId) {
  const res = await fetch(`${BASE}/api/documents/projects/${projectId}/manuscripts`, {
    headers: { Cookie: cookie },
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch (_e) {}

  return {
    ok: res.ok,
    status: res.status,
    manuscripts: json?.data?.manuscripts || [],
    raw: json,
  };
}

async function uploadManuscript(cookie, projectId, payload) {
  const res = await fetch(`${BASE}/api/documents/projects/${projectId}/manuscripts`, {
    method: 'POST',
    headers: {
      Cookie: cookie,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch (_e) {}

  return {
    ok: res.ok,
    status: res.status,
    json,
    text,
  };
}

async function getOpenLink(cookie, projectId, documentType) {
  const res = await fetch(`${BASE}/api/documents/projects/${projectId}/manuscripts/${documentType}/open-link`, {
    headers: { Cookie: cookie },
  });

  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch (_e) {}

  return {
    ok: res.ok,
    status: res.status,
    json,
  };
}

function printResult(name, pass, detail) {
  console.log(`${pass ? 'PASS' : 'FAIL'} | ${name} | ${detail}`);
}

(async () => {
  const results = [];

  const auth = await login(STUDENT);
  results.push(['A1 Student login', Boolean(auth.cookie), `user=${auth.user?.email || 'n/a'}`]);

  const me = await getMyProject(auth.cookie);
  const projectId = me.project?._id;
  results.push(['A2 Resolve student project', me.ok && Boolean(projectId), `status=${me.status} projectId=${projectId || 'none'}`]);

  if (!projectId) {
    results.push(['A3 Abort tests (no project)', false, 'Cannot continue without project']);
    for (const [name, pass, detail] of results) printResult(name, pass, detail);
    process.exit(2);
  }

  const existing = await listManuscripts(auth.cookie, projectId);
  results.push(['A3 List manuscripts', existing.ok, `status=${existing.status} count=${existing.manuscripts.length}`]);

  const usedTypes = new Set(existing.manuscripts.map((m) => m.documentType));
  const availableType = DOCUMENT_TYPES.find((t) => !usedTypes.has(t));

  if (!availableType) {
    results.push(['A4 Find available document type', false, 'No available documentType (chapter_1/2/3/proposal)']);
    for (const [name, pass, detail] of results) printResult(name, pass, detail);
    process.exit(2);
  }

  results.push(['A4 Find available document type', true, `documentType=${availableType}`]);

  const validPayload = {
    documentType: availableType,
    title: `E2E Link Test ${new Date().toISOString()}`,
    externalDocUrl: 'https://docs.google.com/document/d/1WK8zm0XFVvYCq4VWBfGzq82Y_nPUZ58ufXnPYsWVat4/edit',
    externalDocProvider: 'google_docs',
  };

  const validUpload = await uploadManuscript(auth.cookie, projectId, validPayload);
  const created = validUpload.json?.data?.manuscript;

  results.push(['B1 Upload valid Google Docs link', validUpload.status === 201 && Boolean(created), `status=${validUpload.status}`]);
  results.push([
    'B2 Store externalDocUrl',
    created?.externalDocUrl === validPayload.externalDocUrl,
    `stored=${created?.externalDocUrl || 'none'}`,
  ]);
  results.push([
    'B3 Store externalDocProvider',
    created?.externalDocProvider === 'google_docs',
    `provider=${created?.externalDocProvider || 'none'}`,
  ]);

  const invalidPayload = {
    documentType: availableType,
    title: 'Invalid URL should fail',
    externalDocUrl: 'not-a-valid-url',
    externalDocProvider: 'google_docs',
  };

  const invalidUpload = await uploadManuscript(auth.cookie, projectId, invalidPayload);
  results.push(['C1 Reject invalid URL payload', invalidUpload.status === 400, `status=${invalidUpload.status}`]);

  const otherType = DOCUMENT_TYPES.find((t) => !usedTypes.has(t) && t !== availableType);
  if (otherType) {
    const otherUpload = await uploadManuscript(auth.cookie, projectId, {
      documentType: otherType,
      title: `E2E Other Provider ${new Date().toISOString()}`,
      externalDocUrl: 'https://example.com/cms-e2e-document',
      externalDocProvider: 'other',
    });

    results.push(['D1 Upload with provider=other', otherUpload.status === 201, `status=${otherUpload.status}`]);
    results.push([
      'D2 Provider persisted as other',
      otherUpload.json?.data?.manuscript?.externalDocProvider === 'other',
      `provider=${otherUpload.json?.data?.manuscript?.externalDocProvider || 'none'}`,
    ]);
  } else {
    results.push(['D1 Upload with provider=other', false, 'Skipped: no second available documentType']);
    results.push(['D2 Provider persisted as other', false, 'Skipped: no second available documentType']);
  }

  const openRes = await getOpenLink(auth.cookie, projectId, availableType);
  results.push(['E1 Open-link endpoint', openRes.ok, `status=${openRes.status}`]);
  results.push([
    'E2 Open-link contains URL',
    Boolean(openRes.json?.data?.openLink),
    `openLink=${openRes.json?.data?.openLink || 'none'}`,
  ]);

  console.log('=== DOCUMENT LINK E2E TEST MATRIX ===');
  for (const [name, pass, detail] of results) printResult(name, pass, detail);

  const passCount = results.filter(([, pass]) => pass).length;
  const failCount = results.length - passCount;
  console.log(`SUMMARY pass=${passCount} fail=${failCount} total=${results.length}`);

  process.exit(failCount > 0 ? 2 : 0);
})().catch((error) => {
  console.error('HARNESS_ERROR', error.message);
  process.exit(1);
});
