import { supabase } from '../lib/supabaseClient';

async function authFetch(url, options = {}) {
  const { data } = await supabase.auth.getSession();
  const jwt = data?.session?.access_token;
  if (!jwt) throw new Error('No session');
  
  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${jwt}`,
      'Content-Type': 'application/json'
    }
  });
  
  return response;
}

export async function lookupUserByEmail(email) {
  const r = await authFetch(`/api/admin/user-lookup?email=${encodeURIComponent(email)}`);
  if (!r.ok) throw new Error('Lookup failed');
  return r.json();
}

export async function getAllRoles() {
  const r = await authFetch('/api/admin/roles');
  if (!r.ok) throw new Error('Failed to fetch roles');
  return r.json();
}

export async function getUserRoles(userId) {
  const r = await authFetch(`/api/admin/users/${userId}/roles`);
  if (!r.ok) throw new Error('Failed to fetch user roles');
  return r.json();
}

export async function assignRole(userId, roleSlug) {
  const r = await authFetch(`/api/admin/users/${userId}/roles/${roleSlug}`, { method: 'POST' });
  if (!r.ok && r.status !== 204) throw new Error('Failed to assign role');
}

export async function removeRole(userId, roleSlug) {
  const r = await authFetch(`/api/admin/users/${userId}/roles/${roleSlug}`, { method: 'DELETE' });
  if (!r.ok && r.status !== 204) throw new Error('Failed to remove role');
}

export async function getRoleTemplates() {
  const r = await authFetch('/api/admin/role-templates');
  if (!r.ok) throw new Error('Failed to fetch templates');
  return r.json();
}

export async function applyTemplate(userId, template) {
  const r = await authFetch(`/api/admin/users/${userId}/apply-template/${template}`, { method: 'POST' });
  if (!r.ok && r.status !== 204) throw new Error('Failed to apply template');
}
