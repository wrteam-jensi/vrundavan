import { auth } from './firebase';

export function requireOwnerId(): string {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Not signed in');
  return uid;
}
