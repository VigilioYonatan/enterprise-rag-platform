#!/usr/bin/env node
/**
 * ATLAS Showcase Headless Playwright Pipeline
 * Captures 2x Retina screenshots, WebM videos, and sequential PNG frames for animated GIFs.
 */
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const { chromium } = require(
  path.resolve(
    __dirname,
    '../apps/enterprise-rag-web/node_modules/@playwright/test',
  ),
);

const PORT = 4173;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const REPO_ROOT = path.resolve(__dirname, '..');
const DIST_DIR = path.join(REPO_ROOT, 'apps/enterprise-rag-web/dist');
const SCREENSHOTS_DIR = path.join(REPO_ROOT, 'docs/assets/screenshots');
const DEMOS_DIR = path.join(REPO_ROOT, 'docs/assets/demos');
const VIDEOS_DIR = path.join(REPO_ROOT, 'docs/assets/videos');
const FRAMES_ROOT = path.join(REPO_ROOT, 'test-results/showcase-frames');

function resetDirectory(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
}

// 1. Static Web Server
function startStaticServer() {
  const mimeTypes = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.json': 'application/json',
    '.png': 'image/png',
    '.ico': 'image/x-icon',
  };

  const server = http.createServer((req, res) => {
    let reqPath = req.url.split('?')[0];
    if (reqPath === '/' || reqPath.startsWith('/app') || reqPath.startsWith('/auth')) {
      reqPath = '/index.html';
    }
    let filePath = path.join(DIST_DIR, reqPath);
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = path.join(DIST_DIR, 'index.html');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] || 'application/octet-stream';

    try {
      const content = fs.readFileSync(filePath);
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    } catch {
      res.writeHead(404);
      res.end('Not found');
    }
  });

  return new Promise((resolve) => {
    server.listen(PORT, '127.0.0.1', () => {
      console.log(`[Static Server] Serving frontend dist at ${BASE_URL}`);
      resolve(server);
    });
  });
}

// 2. Super Seeder Mock Data
const MOCK_DATA = {
  me: {
    id: 'u1',
    sub: 'admin-sub-001',
    email: 'admin@acme-enterprise.com',
    name: 'Alexander Wright',
    role: 'admin',
    tenant_id: 't1',
  },
  tenants: {
    count: 2,
    next: null,
    previous: null,
    results: [
      { id: 't1', name: 'Acme Global Enterprise', slug: 'acme-enterprise' },
      { id: 't2', name: 'Acme FinTech EMEA', slug: 'acme-fintech' },
    ],
  },
  knowledgeBases: [
    {
      id: 'kb1',
      tenant_id: 't1',
      name: 'Enterprise Security & Compliance',
      description: 'ISO 27001 policies, Zero Trust architecture, CSIRT runbooks and threat models.',
      documents_count: 8,
      chunks_count: 142,
      created_at: '2026-10-15T08:00:00Z',
    },
    {
      id: 'kb2',
      tenant_id: 't1',
      name: 'Cloud FinOps & Infrastructure',
      description: 'Kubernetes right-sizing, Spot allocations, cost tracking and monthly limits.',
      documents_count: 5,
      chunks_count: 86,
      created_at: '2026-10-20T10:00:00Z',
    },
  ],
  documentsKb1: {
    count: 2,
    next: null,
    previous: null,
    results: [
      {
        id: 'doc1',
        tenant_id: 't1',
        knowledge_base_id: 'kb1',
        title: 'Zero Trust Architecture Playbook',
        status: 'ready',
        mime_type: 'application/pdf',
        sha256: '9f8a2c1b84e3d7a0c5f1e2d3b4a59687c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3',
        size_bytes: 1048576,
        created_at: '2026-11-01T09:30:00Z',
        current_version: 2,
      },
      {
        id: 'doc2',
        tenant_id: 't1',
        knowledge_base_id: 'kb1',
        title: 'CSIRT Incident Response Runbook',
        status: 'ready',
        mime_type: 'text/markdown',
        sha256: '7b4e1a0d8c2f3b5a6e9d0c1b2a3f4e5d6c7b8a9f0e1d2c3b4a5f6e7d8c9b0a1',
        size_bytes: 262144,
        created_at: '2026-11-03T11:15:00Z',
        current_version: 1,
      },
    ],
  },
  doc1Detail: {
    id: 'doc1',
    tenant_id: 't1',
    knowledge_base_id: 'kb1',
    title: 'Zero Trust Architecture Playbook',
    status: 'ready',
    owner_sub: 'admin-sub-001',
    mime_type: 'application/pdf',
    quarantine_status: 'CLEAN',
    sha256: '9f8a2c1b84e3d7a0c5f1e2d3b4a59687c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3',
    size_bytes: 1048576,
    byte_size: 1048576,
    created_at: '2026-11-01T09:30:00Z',
    current_version: 2,
  },
  doc1Versions: {
    count: 2,
    next: null,
    previous: null,
    results: [
      {
        id: 'v2',
        version: 2,
        created_at: '2026-11-07T12:00:00Z',
        quarantine_status: 'CLEAN',
        sha256: '9f8a2c1b84e3d7a0c5f1e2d3b4a59687c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3',
        byte_size: 1048576,
        is_current: true,
      },
      {
        id: 'v1',
        version: 1,
        created_at: '2026-10-15T08:30:00Z',
        quarantine_status: 'CLEAN',
        sha256: '8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a7',
        byte_size: 984500,
        is_current: false,
      },
    ],
  },
  doc1Grants: [
    { id: 'g1', user_id: 'u1', user_sub: 'admin-sub-001', email: 'admin@acme-enterprise.com', permission: 'write' },
    { id: 'g2', user_id: 'u2', user_sub: 'auditor-sub-001', email: 'auditor@acme-enterprise.com', permission: 'read' },
  ],
  doc1GroupGrants: [
    { id: 'gg1', group_id: 'grp1', group_name: 'CSIRT Team', permission: 'write' },
    { id: 'gg2', group_id: 'grp2', group_name: 'Internal Audit', permission: 'read' },
  ],
  doc1Chunks: {
    count: 2,
    next: null,
    previous: null,
    results: [
      {
        id: 'c1',
        chunk_id: 'c1',
        ordinal: 0,
        chunk_index: 0,
        document_version: 2,
        content: '1. Zero Trust Architecture Principle: Never trust, always verify. All API requests must present a signed Keycloak RS256 token with email_verified: true. Database access enforces PostgreSQL FORCE RLS.',
        tokens: 42,
      },
      {
        id: 'c2',
        chunk_id: 'c2',
        ordinal: 1,
        chunk_index: 1,
        document_version: 2,
        content: '2. Token Expiration and Session Revocation: Access tokens expire after 3600 seconds. Immediate revocation requires a refresh event against the OIDC revocation endpoint.',
        tokens: 38,
      },
    ],
  },
  conversations: [
    {
      id: 'conv1',
      title: 'Requisitos de autenticación Zero Trust e ISO 27001',
      created_at: '2026-11-08T18:40:00Z',
      updated_at: '2026-11-08T18:45:00Z',
      messages_count: 2,
    },
    {
      id: 'conv2',
      title: 'Políticas de retención y cuotas FinOps',
      created_at: '2026-11-08T16:10:00Z',
      updated_at: '2026-11-08T16:15:00Z',
      messages_count: 2,
    },
  ],
  conv1Detail: {
    id: 'conv1',
    title: 'Requisitos de autenticación Zero Trust e ISO 27001',
    knowledge_base_id: 'kb1',
    created_at: '2026-11-08T18:40:00Z',
    updated_at: '2026-11-08T18:45:00Z',
    messages: [
      {
        id: 'm1',
        role: 'user',
        content: '¿Cuáles son los requisitos de autenticación Zero Trust según el manual ISO 27001?',
        created_at: '2026-11-08T18:40:05Z',
      },
      {
        id: 'm2',
        role: 'assistant',
        content: 'Según la directiva de seguridad corporativa (Doc: Zero Trust Architecture Playbook, v2), la autenticación Zero Trust requiere:\n\n1. Validación estricta de tokens RS256 emitidos por Keycloak.\n2. Verificación mandatoria del claim email_verified: true.\n3. Rotación forzada de claves cada 60 minutos con expiración máxima.\n4. Aislamiento estricto a nivel de fila mediante PostgreSQL FORCE RLS sin bypass lógico.\n5. Trazabilidad de cada petición vinculada a su correspondiente tenant_id y actor_id.',
        created_at: '2026-11-08T18:40:12Z',
        citations: [
          {
            chunk_id: 'c1',
            document_id: 'doc1',
            title: 'Zero Trust Architecture Playbook · v2',
            similarity: 0.892,
            snippet: '1. Zero Trust Architecture Principle: Never trust, always verify. All API requests must present a signed Keycloak RS256 token...',
          },
          {
            chunk_id: 'c2',
            document_id: 'doc1',
            title: 'Zero Trust Architecture Playbook · Sección 2',
            similarity: 0.875,
            snippet: '2. Token Expiration and Session Revocation: Access tokens expire after 3600 seconds...',
          },
        ],
      },
    ],
  },
  usageSummary: [
    { category: 'Retrieval & Embeddings', requests: 142, input_tokens: 128400, output_tokens: 0, average_latency_ms: 48, cost_usd: 12.84 },
    { category: 'Grounded Generation (SSE)', requests: 98, input_tokens: 420000, output_tokens: 185000, average_latency_ms: 380, cost_usd: 68.50 },
  ],
  budget: {
    tenant_id: 't1',
    daily_answer_limit: 500,
    daily_cost_limit_usd: 1000,
    monthly_limit_usd: 5000,
    current_month_cost_usd: 142.60,
  },
  dlq: {
    count: 1,
    next: null,
    previous: null,
    results: [
      {
        id: 'dlq-892',
        source: 'ingestion_job',
        target_id: 'job-quarantine-892',
        title: 'Document: suspicious-attachment.docx',
        error_message: 'ClamAV alert: quarantined in isolated storage.',
        attempts: 2,
        status: 'failed',
        created_at: '2026-11-08T03:12:00Z',
      },
    ],
  },
  auditEvents: {
    count: 3,
    next: null,
    previous: null,
    results: [
      {
        id: 'ev-1',
        action: 'DOCUMENT_UPLOAD',
        actor_sub: 'admin-sub-001',
        target_type: 'document',
        target_id: 'doc1-zerotrust',
        created_at: '2026-11-08T18:32:00Z',
      },
      {
        id: 'ev-2',
        action: 'GROUNDED_QUERY',
        actor_sub: 'admin-sub-001',
        target_type: 'query',
        target_id: 'q-iso27001-zt',
        created_at: '2026-11-08T18:40:12Z',
      },
      {
        id: 'ev-3',
        action: 'OIDC_SESSION_LOGIN',
        actor_sub: 'admin-sub-001',
        target_type: 'session',
        target_id: 's-keycloak-pkce',
        created_at: '2026-11-08T18:00:00Z',
      },
    ],
  },
  members: [
    { id: 'm1', user_sub: 'owner-sub-001', email: 'owner@acme-enterprise.com', role: 'owner', created_at: '2026-10-01T00:00:00Z' },
    { id: 'm2', user_sub: 'admin-sub-001', email: 'admin@acme-enterprise.com', role: 'admin', created_at: '2026-10-05T00:00:00Z' },
    { id: 'm3', user_sub: 'auditor-sub-001', email: 'auditor@acme-enterprise.com', role: 'viewer', created_at: '2026-10-10T00:00:00Z' },
    { id: 'm4', user_sub: 'operator-sub-001', email: 'operator@acme-enterprise.com', role: 'editor', created_at: '2026-10-12T00:00:00Z' },
  ],
  groups: [
    { id: 'grp1', name: 'CSIRT Team', description: 'Computer Security Incident Response Team', members_count: 4, created_at: '2026-10-05T00:00:00Z' },
    { id: 'grp2', name: 'Internal Audit', description: 'Governance, Risk and Compliance reviewers', members_count: 2, created_at: '2026-10-10T00:00:00Z' },
    { id: 'grp3', name: 'FinOps Operators', description: 'Cloud infrastructure cost management', members_count: 3, created_at: '2026-10-12T00:00:00Z' },
  ],
  groupMembersGrp1: [
    { id: 'gm1', group_id: 'grp1', user_sub: 'admin-sub-001', email: 'admin@acme-enterprise.com' },
    { id: 'gm2', group_id: 'grp1', user_sub: 'operator-sub-001', email: 'operator@acme-enterprise.com' },
  ],
  evalDatasets: [
    {
      id: 'ds1',
      name: 'ISO 27001 & Zero Trust Benchmark',
      description: 'Ground-truth Q&A verification against security and compliance policies.',
      cases_count: 12,
      created_at: '2026-11-04T10:00:00Z',
    },
  ],
  evalCasesDs1: [
    {
      id: 'c1',
      dataset_id: 'ds1',
      question: '¿Qué algoritmo de firma se exige para los tokens OIDC en la plataforma?',
      expected_document_ids: ['doc1'],
      expected_abstention: false,
      created_at: '2026-11-04T10:15:00Z',
    },
    {
      id: 'c2',
      dataset_id: 'ds1',
      question: '¿Cómo se garantiza que un inquilino no acceda a documentos de otro?',
      expected_document_ids: ['doc1', 'doc2'],
      expected_abstention: false,
      created_at: '2026-11-04T10:20:00Z',
    },
  ],
  evalRuns: [
    {
      id: 'run1',
      dataset_id: 'ds1',
      dataset_name: 'ISO 27001 & Zero Trust Benchmark',
      status: 'completed',
      recall_at_6: 0.942,
      mrr_at_6: 0.918,
      ndcg_at_6: 0.895,
      abstention_pass_rate: 1.0,
      total_cases: 12,
      created_at: '2026-11-08T04:00:00Z',
    },
  ],
  evalRun1Detail: {
    id: 'run1',
    dataset_id: 'ds1',
    name: 'Evaluation Suite v0.1.0-beta',
    status: 'completed',
    metrics: {
      faithfulness: 0.942,
      answer_relevance: 0.918,
      context_recall: 0.895,
    },
    cases: [
      {
        id: 'rc1',
        question: '¿Qué algoritmo de firma se exige para los tokens OIDC en la plataforma?',
        ground_truth: 'RS256 con claves asimétricas rotadas regularmente por Keycloak.',
        answer: 'Se exige el algoritmo RS256 emitido y firmado por Keycloak.',
        faithfulness: 0.98,
        answer_relevance: 0.95,
        context_recall: 0.92,
      },
    ],
  },
};

// 3. Setup Routes in Playwright
async function setupMockApi(page) {
  await page.route('**/api/v1/**', async (route) => {
    const url = new URL(route.request().url());
    const pathname = url.pathname.replace(/^\/api\/v1/, '');
    const method = route.request().method();

    // /me
    if (pathname === '/me') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_DATA.me) });
    }

    // /tenants
    if (pathname === '/tenants') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_DATA.tenants) });
    }

    // /knowledge-bases
    if (pathname === '/knowledge-bases' || pathname.startsWith('/knowledge-bases?')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_DATA.knowledgeBases) });
    }

    // /knowledge-bases/kb1/documents
    if (pathname.includes('/knowledge-bases/kb1/documents') || pathname.includes('/knowledge-bases/kb2/documents')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_DATA.documentsKb1) });
    }

    // /documents/doc1
    if (pathname === '/documents/doc1') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_DATA.doc1Detail) });
    }
    if (pathname === '/documents/doc1/versions') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_DATA.doc1Versions) });
    }
    if (pathname === '/documents/doc1/grants' || pathname === '/documents/doc1/access') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_DATA.doc1Grants) });
    }
    if (pathname === '/documents/doc1/group-grants' || pathname === '/documents/doc1/group-access') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_DATA.doc1GroupGrants) });
    }
    if (pathname === '/documents/doc1/chunks') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_DATA.doc1Chunks) });
    }

    // /conversations
    if (pathname === '/conversations' || pathname.startsWith('/conversations?')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_DATA.conversations) });
    }
    if (pathname === '/conversations/conv1') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_DATA.conv1Detail) });
    }

    // /answers/stream (SSE)
    if (pathname === '/answers/stream') {
      const sseBody = [
        'event: status\ndata: {"phase":"authorized"}\n\n',
        'event: status\ndata: {"phase":"retrieval"}\n\n',
        'event: status\ndata: {"phase":"generation"}\n\n',
        'event: complete\ndata: {"answer":"Según la directiva de seguridad corporativa (Doc: Zero Trust Architecture Playbook, v2), la autenticación Zero Trust requiere validación estricta de tokens RS256 emitidos por Keycloak, rotación forzada cada 60 minutos, verificación del claim email_verified: true, y aislamiento estricto a nivel de fila mediante PostgreSQL FORCE RLS.","abstained":false,"citations":[{"chunk_id":"c1","document_id":"doc1","title":"Zero Trust Architecture Playbook · v2","similarity":0.892},{"chunk_id":"c2","document_id":"doc1","title":"Zero Trust Architecture Playbook · Sección 2","similarity":0.875}]}\n\n',
      ].join('');

      return route.fulfill({
        status: 200,
        contentType: 'text/event-stream; charset=utf-8',
        headers: {
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
        body: sseBody,
      });
    }

    // /retrieval/search
    if (pathname === '/retrieval/search') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            chunk_id: 'c1',
            document_id: 'doc1',
            title: 'Zero Trust Architecture Playbook · v2',
            score: 0.892,
            content: '1. Zero Trust Architecture Principle: Never trust, always verify. All API requests must present a signed Keycloak RS256 token with email_verified: true. Database access enforces PostgreSQL FORCE RLS.',
          },
          {
            chunk_id: 'c2',
            document_id: 'doc1',
            title: 'Zero Trust Architecture Playbook · Sección 2',
            score: 0.875,
            content: '2. Token Expiration and Session Revocation: Access tokens expire after 3600 seconds. Immediate revocation requires a refresh event against the OIDC revocation endpoint.',
          },
        ]),
      });
    }

    // /usage
    if (pathname.startsWith('/usage/summary')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_DATA.usageSummary) });
    }
    if (pathname.startsWith('/usage/budget')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_DATA.budget) });
    }

    // /operations/dlq
    if (pathname.startsWith('/operations/dlq')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_DATA.dlq) });
    }

    // /audit/events
    if (pathname.startsWith('/audit/events')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_DATA.auditEvents) });
    }

    // /tenants/t1/members
    if (pathname.includes('/members')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_DATA.members) });
    }

    // /tenants/t1/groups
    if (pathname.includes('/groups')) {
      if (pathname.includes('/grp1/members')) {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_DATA.groupMembersGrp1) });
      }
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_DATA.groups) });
    }

    // /evaluation
    if (pathname.startsWith('/evaluation/datasets') && pathname.includes('/cases')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_DATA.evalCasesDs1) });
    }
    if (pathname.startsWith('/evaluation/datasets')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_DATA.evalDatasets) });
    }
    if (pathname === '/evaluation/runs/run1') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_DATA.evalRun1Detail) });
    }
    if (pathname.startsWith('/evaluation/runs')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_DATA.evalRuns) });
    }

    // Default fallback
    console.warn(`[Unhandled API Route] ${method} ${pathname}`);
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
  });
}

// 4. Authenticate & Inject Session
async function authenticateAndSelectWorkspace(page, themeMode = 'dark') {
  await page.addInitScript((mode) => {
    window.sessionStorage.setItem(
      'oidc.user:http://localhost:8081/realms/enterprise:enterprise-rag-web',
      JSON.stringify({
        id_token: 'mock-id-token',
        access_token: 'mock-access-token',
        token_type: 'Bearer',
        scope: 'openid profile email',
        profile: {
          sub: 'admin-sub-001',
          email: 'admin@acme-enterprise.com',
          name: 'Alexander Wright',
          preferred_username: 'alexander.wright',
        },
        expires_at: Math.floor(Date.now() / 1000) + 86400,
      }),
    );
    window.localStorage.setItem('theme', mode);
  }, themeMode);

  await setupMockApi(page);
  await page.goto(`${BASE_URL}/app`, { waitUntil: 'networkidle' });
  await page.evaluate((mode) => {
    document.documentElement.classList.toggle('dark', mode === 'dark');
  }, themeMode);
}

// 5. Cursor & Caption Overlay for Video Demos
async function installDemoOverlay(page) {
  await page.evaluate(() => {
    if (document.getElementById('showcase-demo-cursor')) return;

    const cursorElement = document.createElement('div');
    cursorElement.id = 'showcase-demo-cursor';
    cursorElement.style.cssText = [
      'position:fixed',
      'left:640px',
      'top:400px',
      'width:22px',
      'height:22px',
      'border-radius:9999px',
      'background:rgba(59,130,246,0.92)',
      'border:2.5px solid #ffffff',
      'box-shadow:0 0 0 6px rgba(59,130,246,0.28), 0 8px 20px rgba(0,0,0,0.45)',
      'pointer-events:none',
      'z-index:2147483647',
      'transform:translate(-50%,-50%)',
      'transition:left 220ms cubic-bezier(0.22,1,0.36,1), top 220ms cubic-bezier(0.22,1,0.36,1), transform 140ms ease',
    ].join(';');
    document.body.appendChild(cursorElement);

    const captionBanner = document.createElement('div');
    captionBanner.id = 'showcase-demo-caption';
    captionBanner.style.cssText = [
      'position:fixed',
      'bottom:22px',
      'right:24px',
      'padding:9px 16px',
      'border-radius:9999px',
      'background:rgba(9,9,11,0.92)',
      'color:#f8fafc',
      'border:1px solid rgba(96,165,250,0.55)',
      'box-shadow:0 12px 30px rgba(0,0,0,0.55)',
      'font-family:system-ui,-apple-system,sans-serif',
      'font-size:13px',
      'font-weight:600',
      'letter-spacing:0.01em',
      'pointer-events:none',
      'z-index:2147483646',
    ].join(';');
    captionBanner.textContent = 'ATLAS Enterprise RAG Platform';
    document.body.appendChild(captionBanner);
  });
}

async function setDemoStepCaption(page, captionText) {
  await installDemoOverlay(page);
  await page.evaluate((nextText) => {
    const captionBanner = document.getElementById('showcase-demo-caption');
    if (captionBanner) {
      captionBanner.textContent = nextText;
    }
  }, captionText);
}

async function pointAndHighlightLocator(page, locator, captionText, snapFrame) {
  await installDemoOverlay(page);
  if (captionText) {
    await setDemoStepCaption(page, captionText);
  }
  const box = await locator.boundingBox();
  if (box) {
    const targetX = Math.round(box.x + Math.min(box.width * 0.45, 90));
    const targetY = Math.round(box.y + box.height * 0.5);
    await page.evaluate(
      ({ coordinateX, coordinateY }) => {
        const cursorElement = document.getElementById('showcase-demo-cursor');
        if (cursorElement) {
          cursorElement.style.left = `${coordinateX}px`;
          cursorElement.style.top = `${coordinateY}px`;
          cursorElement.style.transform = 'translate(-50%,-50%) scale(1)';
        }
      },
      { coordinateX: targetX, coordinateY: targetY },
    );
    await page.waitForTimeout(260);
    if (snapFrame) await snapFrame(420);

    // Subtle click pulse
    await page.evaluate(() => {
      const cursorElement = document.getElementById('showcase-demo-cursor');
      if (cursorElement) {
        cursorElement.style.transform = 'translate(-50%,-50%) scale(0.78)';
        cursorElement.style.background = 'rgba(16,185,129,0.95)';
      }
    });
    await page.waitForTimeout(120);
    if (snapFrame) await snapFrame(240);

    await page.evaluate(() => {
      const cursorElement = document.getElementById('showcase-demo-cursor');
      if (cursorElement) {
        cursorElement.style.transform = 'translate(-50%,-50%) scale(1)';
        cursorElement.style.background = 'rgba(59,130,246,0.92)';
      }
    });
  }
}

// 6. Capture Static Screenshots (2x Retina, 1440x900)
async function captureStaticScreenshots(browser) {
  console.log('\n[Phase 1/3] Capturing 2x Retina Dark & Light Mode Screenshots...');
  resetDirectory(SCREENSHOTS_DIR);

  // 1A. Light Mode Dashboard Overview
  const lightContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    colorScheme: 'light',
  });
  const lightPage = await lightContext.newPage();
  await authenticateAndSelectWorkspace(lightPage, 'light');
  await lightPage.waitForTimeout(600);
  await lightPage.screenshot({
    path: path.join(SCREENSHOTS_DIR, '02-dashboard-overview-light.png'),
  });
  console.log('  ✓ 02-dashboard-overview-light.png');
  await lightContext.close();

  // 1B. Dark Mode Suite
  const darkContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    colorScheme: 'dark',
  });
  const page = await darkContext.newPage();
  await authenticateAndSelectWorkspace(page, 'dark');

  // Dashboard Overview (Dark)
  await page.screenshot({
    path: path.join(SCREENSHOTS_DIR, '02-dashboard-overview-dark.png'),
  });
  console.log('  ✓ 02-dashboard-overview-dark.png');

  // Flagship Hero: Grounded Assistant with Question & Citations
  await page.goto(`${BASE_URL}/app/assistant`, { waitUntil: 'networkidle' });
  await page.waitForSelector('textarea, input[type="text"]', { timeout: 10000 });
  const inputEl = page.locator('textarea, input[type="text"]').first();
  await inputEl.fill('¿Cuáles son los requisitos de autenticación Zero Trust según el manual ISO 27001?');
  const submitBtn = page.locator('button:has-text("Consultar"), button:has-text("Enviar"), button[type="submit"]').first();
  await submitBtn.click();
  await page.waitForSelector('text=Zero Trust Architecture Playbook', { timeout: 10000 });
  await page.waitForTimeout(600);
  await page.screenshot({
    path: path.join(SCREENSHOTS_DIR, '01-hero-grounded-assistant.png'),
  });
  console.log('  ✓ 01-hero-grounded-assistant.png');

  // Knowledge Hub & Bases
  await page.goto(`${BASE_URL}/app/knowledge`, { waitUntil: 'networkidle' });
  await page.waitForSelector('text=Enterprise Security & Compliance', { timeout: 10000 });
  await page.waitForTimeout(600);
  await page.screenshot({
    path: path.join(SCREENSHOTS_DIR, '03-knowledge-hub-bases.png'),
  });
  console.log('  ✓ 03-knowledge-hub-bases.png');

  // Document Quarantine & Versions
  await page.goto(`${BASE_URL}/app/documents/doc1`, { waitUntil: 'networkidle' });
  await page.waitForSelector('text=Zero Trust Architecture Playbook', { timeout: 10000 });
  await page.waitForTimeout(600);
  await page.screenshot({
    path: path.join(SCREENSHOTS_DIR, '04-document-quarantine-and-versions.png'),
  });
  console.log('  ✓ 04-document-quarantine-and-versions.png');

  // Conversations & Grounded History
  await page.goto(`${BASE_URL}/app/conversations/conv1`, { waitUntil: 'networkidle' });
  await page.waitForSelector('text=Requisitos de autenticación Zero Trust', { timeout: 10000 });
  await page.waitForTimeout(600);
  await page.screenshot({
    path: path.join(SCREENSHOTS_DIR, '05-conversations-grounded-history.png'),
  });
  console.log('  ✓ 05-conversations-grounded-history.png');

  // Identity & Access Governance (Security)
  await page.goto(`${BASE_URL}/app/security`, { waitUntil: 'networkidle' });
  await page.waitForSelector('text=admin@acme-enterprise.com', { timeout: 10000 });
  await page.waitForTimeout(600);
  await page.screenshot({
    path: path.join(SCREENSHOTS_DIR, '06-identity-and-access-governance.png'),
  });
  console.log('  ✓ 06-identity-and-access-governance.png');

  // FinOps & DLQ Operations
  await page.goto(`${BASE_URL}/app/operations`, { waitUntil: 'networkidle' });
  await page.waitForSelector('text=Cola de fallos', { timeout: 10000 });
  await page.waitForTimeout(600);
  await page.screenshot({
    path: path.join(SCREENSHOTS_DIR, '07-finops-budgets-and-dlq.png'),
  });
  console.log('  ✓ 07-finops-budgets-and-dlq.png');

  // LLMOps Evaluations
  await page.goto(`${BASE_URL}/app/evaluations`, { waitUntil: 'networkidle' });
  await page.waitForSelector('text=Ejecutar suite', { timeout: 10000 });
  await page.waitForTimeout(600);
  await page.screenshot({
    path: path.join(SCREENSHOTS_DIR, '08-llmops-evaluations-retrieval.png'),
  });
  console.log('  ✓ 08-llmops-evaluations-retrieval.png');

  // OpenAPI Scalar Reference
  const openapiSpecPath = path.join(REPO_ROOT, 'apps/enterprise-rag-impl/openapi.json');
  const openapiSpecJson = fs.readFileSync(openapiSpecPath, 'utf8');
  await page.setContent(`<!DOCTYPE html>
<html>
  <head>
    <title>ATLAS OpenAPI 3.1 Scalar Reference</title>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body { margin: 0; background: #09090b; color: #f4f4f5; font-family: ui-sans-serif, system-ui, sans-serif; }
      .header { padding: 24px 36px; border-bottom: 1px solid #27272a; display: flex; align-items: center; justify-content: space-between; }
      .badge { background: #0284c7; color: white; padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: 600; font-family: monospace; }
      .grid { display: grid; grid-template-columns: 280px 1fr; height: calc(100vh - 85px); }
      .sidebar { border-right: 1px solid #27272a; padding: 20px; overflow-y: auto; font-size: 13px; line-height: 2; }
      .main { padding: 32px 48px; overflow-y: auto; }
      .endpoint { background: #18181b; border: 1px solid #27272a; border-radius: 12px; padding: 18px 24px; margin-bottom: 16px; }
      .tag-post { background: #166534; color: #86efac; font-weight: bold; font-family: monospace; padding: 2px 8px; border-radius: 6px; font-size: 12px; }
      .tag-get { background: #1e40af; color: #93c5fd; font-weight: bold; font-family: monospace; padding: 2px 8px; border-radius: 6px; font-size: 12px; }
    </style>
  </head>
  <body>
    <div class="header">
      <div style="display:flex;align-items:center;gap:12px;">
        <span style="font-weight:bold;font-size:18px;">ATLAS REST API Reference</span>
        <span class="badge">v0.1.0-beta</span>
        <span style="font-size:13px;color:#a1a1aa;">OAS 3.0 · Scalar UI · Keycloak Bearer Auth</span>
      </div>
      <div style="font-family:monospace;font-size:13px;color:#38bdf8;">https://atlas.internal/api/v1</div>
    </div>
    <div class="grid">
      <div class="sidebar">
        <div style="font-weight:bold;color:#a1a1aa;text-transform:uppercase;font-size:11px;margin-bottom:8px;">Endpoints</div>
        <div>🔐 POST /api/v1/answers/stream</div>
        <div>🔍 POST /api/v1/retrieval/search</div>
        <div>📚 GET /api/v1/knowledge-bases</div>
        <div>📄 GET /api/v1/documents</div>
        <div>🛡️ GET /api/v1/documents/{id}/versions</div>
        <div>👥 GET /api/v1/tenants/{id}/members</div>
        <div>💰 GET /api/v1/usage/budget</div>
        <div>🔄 POST /api/v1/operations/dlq/{id}/replay</div>
        <div>🧪 POST /api/v1/evaluation/runs</div>
      </div>
      <div class="main">
        <div class="endpoint">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
            <span class="tag-post">POST</span>
            <span style="font-family:monospace;font-size:15px;font-weight:600;">/api/v1/answers/stream</span>
            <span style="color:#a1a1aa;font-size:13px;">Grounded SSE Answer with pgvector citations</span>
          </div>
          <p style="color:#d4d4d8;font-size:13px;line-height:1.6;">Generates real-time Server-Sent Events with validated citations against PostgreSQL 17 FORCE RLS.</p>
        </div>
        <div class="endpoint">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
            <span class="tag-post">POST</span>
            <span style="font-family:monospace;font-size:15px;font-weight:600;">/api/v1/retrieval/search</span>
            <span style="color:#a1a1aa;font-size:13px;">Hybrid semantic + full-text search</span>
          </div>
          <p style="color:#d4d4d8;font-size:13px;line-height:1.6;">Computes cosine similarity on 768-dimensional embeddings combined with tsvector full-text index.</p>
        </div>
        <div class="endpoint">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
            <span class="tag-get">GET</span>
            <span style="font-family:monospace;font-size:15px;font-weight:600;">/api/v1/documents/{id}/versions</span>
            <span style="color:#a1a1aa;font-size:13px;">Document version history and quarantine checks</span>
          </div>
          <p style="color:#d4d4d8;font-size:13px;line-height:1.6;">Returns all cryptographic version hashes and ClamAV quarantine validation logs.</p>
        </div>
      </div>
    </div>
  </body>
</html>`);
  await page.waitForTimeout(400);
  await page.screenshot({
    path: path.join(SCREENSHOTS_DIR, '09-openapi-scalar-reference.png'),
  });
  console.log('  ✓ 09-openapi-scalar-reference.png');

  await darkContext.close();
}

// 7. Record Videos and Extract Sequential Frames
async function recordVideosAndFrames(browser) {
  console.log('\n[Phase 2/3] Recording Headless Videos & Frames for Animated GIFs...');
  resetDirectory(DEMOS_DIR);
  resetDirectory(VIDEOS_DIR);
  resetDirectory(FRAMES_ROOT);

  const manifest = { recordings: [] };

  // Video 1: Grounded Assistant Stream and Citations
  {
    console.log('  ▶ Recording Demo 1: Grounded Assistant Stream & Citations...');
    const framesDir = path.join(FRAMES_ROOT, 'demo1');
    fs.mkdirSync(framesDir, { recursive: true });

    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      deviceScaleFactor: 1,
      colorScheme: 'dark',
      recordVideo: {
        dir: VIDEOS_DIR,
        size: { width: 1280, height: 800 },
      },
    });

    const page = await context.newPage();
    await authenticateAndSelectWorkspace(page, 'dark');

    let frameIndex = 0;
    const durations = [];
    const snap = async (ms = 500) => {
      frameIndex++;
      const framePath = path.join(framesDir, `frame_${String(frameIndex).padStart(3, '0')}.png`);
      await page.screenshot({ path: framePath });
      durations.push(ms);
    };

    await page.goto(`${BASE_URL}/app/assistant`, { waitUntil: 'networkidle' });
    await installDemoOverlay(page);
    await setDemoStepCaption(page, '1. Formular pregunta sobre políticas de seguridad Zero Trust');
    await snap(700);

    const inputEl = page.locator('textarea, input[type="text"]').first();
    await pointAndHighlightLocator(page, inputEl, '2. Ingresar consulta empresarial autenticada', snap);
    await inputEl.fill('¿Cuáles son los requisitos de autenticación Zero Trust según el manual ISO 27001?');
    await snap(600);

    const submitBtn = page.locator('button:has-text("Consultar"), button:has-text("Enviar"), button[type="submit"]').first();
    await pointAndHighlightLocator(page, submitBtn, '3. Ejecutar recuperación con pgvector y streaming SSE', snap);
    await submitBtn.click();

    await page.waitForSelector('text=Zero Trust Architecture Playbook', { timeout: 10000 });
    await setDemoStepCaption(page, '4. Respuesta generada con citas verificadas y score 0.892');
    await snap(900);

    const citationLink = page.locator('a:has-text("Ver documento")').first();
    if (await citationLink.isVisible()) {
      await pointAndHighlightLocator(page, citationLink, '5. Enlace directo al documento fuente y permisos RLS', snap);
    }
    await snap(1000);

    await page.close();
    const video = await page.video();
    if (video) {
      const videoPath = await video.path();
      const targetVideoPath = path.join(VIDEOS_DIR, '01-grounded-assistant-stream-and-citations.webm');
      fs.copyFileSync(videoPath, targetVideoPath);
    }
    await context.close();

    manifest.recordings.push({
      id: '01-grounded-assistant-stream-and-citations',
      frames_directory: framesDir,
      output_gif_path: path.join(DEMOS_DIR, '01-grounded-assistant-stream-and-citations.gif'),
      frame_durations_ms: durations,
    });
    console.log('    ✓ Demo 1 completed');
  }

  // Video 2: Document Quarantine, Versioning & Granular ACL
  {
    console.log('  ▶ Recording Demo 2: Document Quarantine, Versioning & Granular ACL...');
    const framesDir = path.join(FRAMES_ROOT, 'demo2');
    fs.mkdirSync(framesDir, { recursive: true });

    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      deviceScaleFactor: 1,
      colorScheme: 'dark',
      recordVideo: {
        dir: VIDEOS_DIR,
        size: { width: 1280, height: 800 },
      },
    });

    const page = await context.newPage();
    await authenticateAndSelectWorkspace(page, 'dark');

    let frameIndex = 0;
    const durations = [];
    const snap = async (ms = 500) => {
      frameIndex++;
      const framePath = path.join(framesDir, `frame_${String(frameIndex).padStart(3, '0')}.png`);
      await page.screenshot({ path: framePath });
      durations.push(ms);
    };

    await page.goto(`${BASE_URL}/app/knowledge`, { waitUntil: 'networkidle' });
    await installDemoOverlay(page);
    await setDemoStepCaption(page, '1. Inspeccionar biblioteca: Enterprise Security & Compliance');
    await snap(700);

    await page.goto(`${BASE_URL}/app/documents/doc1`, { waitUntil: 'networkidle' });
    await setDemoStepCaption(page, '2. Verificación antivirus ClamAV: Estado CLEAN con hash SHA-256');
    await snap(900);

    const versionTab = page.locator('text=Versión 2').first();
    if (await versionTab.isVisible()) {
      await pointAndHighlightLocator(page, versionTab, '3. Historial de versiones inmutables (v2 activa, v1 archivada)', snap);
    }
    await snap(800);

    const aclCard = page.locator('text=CSIRT Team, text=Internal Audit').first();
    if (await aclCard.isVisible()) {
      await pointAndHighlightLocator(page, aclCard, '4. Control de acceso por grupo y usuario con PostgreSQL RLS', snap);
    }
    await snap(1000);

    await page.close();
    const video = await page.video();
    if (video) {
      const videoPath = await video.path();
      const targetVideoPath = path.join(VIDEOS_DIR, '02-document-quarantine-versioning-and-acl.webm');
      fs.copyFileSync(videoPath, targetVideoPath);
    }
    await context.close();

    manifest.recordings.push({
      id: '02-document-quarantine-versioning-and-acl',
      frames_directory: framesDir,
      output_gif_path: path.join(DEMOS_DIR, '02-document-quarantine-versioning-and-acl.gif'),
      frame_durations_ms: durations,
    });
    console.log('    ✓ Demo 2 completed');
  }

  // Video 3: FinOps Budgets, DLQ Replay & Theme Toggle
  {
    console.log('  ▶ Recording Demo 3: FinOps Budgets, DLQ Replay & Theme Toggle...');
    const framesDir = path.join(FRAMES_ROOT, 'demo3');
    fs.mkdirSync(framesDir, { recursive: true });

    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      deviceScaleFactor: 1,
      colorScheme: 'dark',
      recordVideo: {
        dir: VIDEOS_DIR,
        size: { width: 1280, height: 800 },
      },
    });

    const page = await context.newPage();
    await authenticateAndSelectWorkspace(page, 'dark');

    let frameIndex = 0;
    const durations = [];
    const snap = async (ms = 500) => {
      frameIndex++;
      const framePath = path.join(framesDir, `frame_${String(frameIndex).padStart(3, '0')}.png`);
      await page.screenshot({ path: framePath });
      durations.push(ms);
    };

    await page.goto(`${BASE_URL}/app/operations`, { waitUntil: 'networkidle' });
    await installDemoOverlay(page);
    await setDemoStepCaption(page, '1. Consola FinOps: Límite presupuestario y consumo de tokens');
    await snap(800);

    const dlqRow = page.locator('text=Cola de fallos, text=suspicious-attachment').first();
    if (await dlqRow.isVisible()) {
      await pointAndHighlightLocator(page, dlqRow, '2. Cola de reintentos DLQ con reanudación automática', snap);
    }
    await snap(800);

    const themeToggleBtn = page.locator('button[aria-label*="tema"], button[aria-label*="modo"], button:has(svg.lucide-sun), button:has(svg.lucide-moon)').first();
    if (await themeToggleBtn.isVisible()) {
      await pointAndHighlightLocator(page, themeToggleBtn, '3. Cambio instantáneo a Modo Claro', snap);
      await themeToggleBtn.click();
      await snap(900);
      await setDemoStepCaption(page, '4. Modo Claro de alto contraste con iconos vectoriales oficiales');
      await snap(1000);
    } else {
      await snap(1000);
    }

    await page.close();
    const video = await page.video();
    if (video) {
      const videoPath = await video.path();
      const targetVideoPath = path.join(VIDEOS_DIR, '03-finops-dlq-replay-and-theme-toggle.webm');
      fs.copyFileSync(videoPath, targetVideoPath);
    }
    await context.close();

    manifest.recordings.push({
      id: '03-finops-dlq-replay-and-theme-toggle',
      frames_directory: framesDir,
      output_gif_path: path.join(DEMOS_DIR, '03-finops-dlq-replay-and-theme-toggle.gif'),
      frame_durations_ms: durations,
    });
    console.log('    ✓ Demo 3 completed');
  }

  const manifestPath = path.join(REPO_ROOT, 'test-results/showcase_manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`  ✓ Manifest saved at ${manifestPath}`);
  return manifestPath;
}

// 8. Contact Sheet Generation
async function generateContactSheet(browser) {
  console.log('\n[Phase 3/3] Generating Visual Contact Sheet for 1:1 Frame Audit...');
  const files = fs.readdirSync(SCREENSHOTS_DIR).filter((f) => f.endsWith('.png'));
  const context = await browser.newContext({ viewport: { width: 1600, height: 2200 } });
  const page = await context.newPage();

  const cardsHtml = files
    .map(
      (f) => `
    <div style="background:#18181b;border:1px solid #27272a;border-radius:12px;overflow:hidden;box-shadow:0 10px 25px rgba(0,0,0,0.5);">
      <div style="padding:12px 16px;font-family:monospace;font-size:12px;font-weight:bold;color:#38bdf8;border-bottom:1px solid #27272a;">${f}</div>
      <img src="file://${path.join(SCREENSHOTS_DIR, f).replace(/\\/g, '/')}" style="width:100%;display:block;" />
    </div>`,
    )
    .join('\n');

  await page.setContent(`<!DOCTYPE html>
<html>
  <head>
    <title>ATLAS Frame-by-Frame Audit Contact Sheet</title>
    <style>
      body { margin:0; padding:36px; background:#09090b; color:#fff; font-family:sans-serif; }
      h1 { font-size:24px; margin-bottom:8px; }
      p { font-size:14px; color:#a1a1aa; margin-bottom:28px; }
      .grid { display:grid; grid-template-columns: repeat(2, 1fr); gap:24px; }
    </style>
  </head>
  <body>
    <h1>ATLAS Enterprise RAG — Visual Contact Sheet (v0.1.0-beta)</h1>
    <p>Auditoría visual 1:1 fotograma por fotograma bajo Senior Mode (Zero Omissions).</p>
    <div class="grid">
      ${cardsHtml}
    </div>
  </body>
</html>`);

  await page.waitForTimeout(600);
  const contactSheetPath = path.join(REPO_ROOT, 'docs/assets/contact-sheet.png');
  await page.screenshot({ path: contactSheetPath, fullPage: true });
  console.log(`  ✓ Contact sheet saved at ${contactSheetPath}`);
  await context.close();
}

async function main() {
  const server = await startStaticServer();
  const browser = await chromium.launch({ headless: true });

  try {
    await captureStaticScreenshots(browser);
    const manifestPath = await recordVideosAndFrames(browser);

    console.log('\n[Encoding] Running encode_showcase_gifs.py...');
    execFileSync('python', [path.join(REPO_ROOT, 'scripts/encode_showcase_gifs.py'), manifestPath], {
      stdio: 'inherit',
    });

    await generateContactSheet(browser);
    console.log('\n✨ Entire showcase pipeline completed successfully!');
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch((err) => {
  console.error('\n❌ Error executing showcase pipeline:', err);
  process.exit(1);
});
