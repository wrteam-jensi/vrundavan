import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  orderBy,
  limit,
  updateDoc,
} from 'firebase/firestore';
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { db, storage } from './firebase';

export async function nextOrder(collectionName: string) {
  const q = query(collection(db, collectionName), orderBy('order', 'desc'), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) return 0;
  return (snap.docs[0].data().order ?? 0) + 1;
}

export async function createDoc(collectionName: string, data: Record<string, unknown>) {
  const order = await nextOrder(collectionName);
  await addDoc(collection(db, collectionName), { ...data, order });
}

export async function updateDocById(collectionName: string, id: string, data: Record<string, unknown>) {
  await updateDoc(doc(db, collectionName, id), data);
}

export async function deleteDocById(collectionName: string, id: string) {
  await deleteDoc(doc(db, collectionName, id));
}

export async function uploadImage(collectionName: string, file: File) {
  const path = `${collectionName}/${Date.now()}-${file.name}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  return { url: await getDownloadURL(storageRef), path };
}

export async function deleteImage(path: string) {
  try {
    await deleteObject(ref(storage, path));
  } catch {
    // already gone or never existed — nothing to clean up
  }
}
