import { createClient } from '@libsql/client';

const db = createClient({
  url: process.env.TURSO_URL,
  authToken: process.env.TURSO_TOKEN,
});

// ─── Users ───

export async function getUserByEmail(email) {
  const r = await db.execute({ sql: 'SELECT * FROM users WHERE email = ?', args: [email.toLowerCase()] });
  return r.rows[0] || null;
}

export async function getUserById(id) {
  const r = await db.execute({ sql: 'SELECT * FROM users WHERE id = ?', args: [id] });
  return r.rows[0] || null;
}

export async function createUser({ id, name, email, passwordHash, createdAt }) {
  await db.execute({
    sql: 'INSERT INTO users (id, name, email, password_hash, created_at) VALUES (?, ?, ?, ?, ?)',
    args: [id, name, email.toLowerCase(), passwordHash, createdAt],
  });
  return { id, name, email };
}

// ─── Sessions ───

export async function createSession(token, userId) {
  await db.execute({
    sql: 'INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, ?)',
    args: [token, userId, Date.now()],
  });
}

export async function getSessionUser(token) {
  if (!token) return null;
  const r = await db.execute({
    sql: 'SELECT u.* FROM users u JOIN sessions s ON s.user_id = u.id WHERE s.token = ?',
    args: [token],
  });
  return r.rows[0] || null;
}

export async function deleteSession(token) {
  await db.execute({ sql: 'DELETE FROM sessions WHERE token = ?', args: [token] });
}

// ─── Conversations ───

export async function getUserConversations(userId) {
  const r = await db.execute({
    sql: 'SELECT * FROM conversations WHERE user_id = ? ORDER BY updated_at DESC',
    args: [userId],
  });
  const convs = {};
  for (const row of r.rows) {
    convs[row.id] = {
      id: row.id,
      title: row.title,
      messages: JSON.parse(row.messages || '[]'),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
  return convs;
}

export async function saveUserConversations(userId, convs) {
  // Upsert each conversation
  const batch = [];
  for (const [id, conv] of Object.entries(convs)) {
    batch.push({
      sql: `INSERT INTO conversations (id, user_id, title, messages, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET title=?, messages=?, updated_at=?`,
      args: [
        id, userId, conv.title || 'שיחה חדשה', JSON.stringify(conv.messages || []), conv.createdAt || Date.now(), conv.updatedAt || Date.now(),
        conv.title || 'שיחה חדשה', JSON.stringify(conv.messages || []), conv.updatedAt || Date.now(),
      ],
    });
  }
  if (batch.length > 0) {
    await db.batch(batch);
  }
}

// ─── Memory ───

export async function getUserMemory(userId) {
  const r = await db.execute({ sql: 'SELECT * FROM memory WHERE user_id = ?', args: [userId] });
  if (!r.rows[0]) return { facts: [], profile: {} };
  return {
    facts: JSON.parse(r.rows[0].facts || '[]'),
    profile: JSON.parse(r.rows[0].profile || '{}'),
  };
}

export async function saveUserMemory(userId, memory) {
  await db.execute({
    sql: `INSERT INTO memory (user_id, facts, profile) VALUES (?, ?, ?)
          ON CONFLICT(user_id) DO UPDATE SET facts=?, profile=?`,
    args: [
      userId, JSON.stringify(memory.facts || []), JSON.stringify(memory.profile || {}),
      JSON.stringify(memory.facts || []), JSON.stringify(memory.profile || {}),
    ],
  });
}

// ─── Assets ───

export async function getUserAssets(userId) {
  const r = await db.execute({
    sql: 'SELECT * FROM assets WHERE user_id = ? ORDER BY created_at ASC',
    args: [userId],
  });
  return r.rows.map(row => ({
    id: row.id,
    category: row.category,
    name: row.name,
    value: row.value,
    detail: row.detail || '',
    createdAt: row.created_at,
  }));
}

export async function saveUserAssets(userId, assets) {
  // Delete all and re-insert (simple approach for full sync)
  const batch = [
    { sql: 'DELETE FROM assets WHERE user_id = ?', args: [userId] },
  ];
  for (const a of assets) {
    batch.push({
      sql: 'INSERT INTO assets (id, user_id, category, name, value, detail, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      args: [a.id, userId, a.category, a.name, a.value || 0, a.detail || '', a.createdAt || Date.now()],
    });
  }
  await db.batch(batch);
}
