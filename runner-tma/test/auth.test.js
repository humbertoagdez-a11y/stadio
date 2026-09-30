import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateInitData, signInitData } from '../server/auth.js';

const TOKEN = '123456:ABC';
const now = Math.floor(Date.now() / 1000);
const fields = { auth_date: String(now), user: JSON.stringify({ id: 42, first_name: 'Ana' }) };

test('acepta initData firmado correctamente', () => {
  const { user } = validateInitData(signInitData(fields, TOKEN), TOKEN);
  assert.equal(user.id, 42);
});

test('rechaza firma con otro token', () => {
  assert.throws(() => validateInitData(signInitData(fields, 'otro:token'), TOKEN), /firma inválida/);
});

test('rechaza datos alterados (cambiar el user id)', () => {
  const tampered = signInitData(fields, TOKEN).replace('%22id%22%3A42', '%22id%22%3A43');
  assert.notEqual(tampered, signInitData(fields, TOKEN));
  assert.throws(() => validateInitData(tampered, TOKEN), /firma inválida/);
});

test('rechaza initData vencido', () => {
  const old = signInitData({ ...fields, auth_date: String(now - 100000) }, TOKEN);
  assert.throws(() => validateInitData(old, TOKEN, 86400), /expirado/);
});

test('rechaza sin hash', () => {
  assert.throws(() => validateInitData('auth_date=1&user=%7B%7D', TOKEN), /hash/);
});
