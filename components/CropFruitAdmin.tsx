'use client';

import { useRef, useState, type FormEvent } from 'react';
import { useCollection } from '@/lib/useCollection';
import { createDoc, deleteDocById, deleteImage, updateDocById, uploadImage } from '@/lib/crud';
import { CROPS_DEFAULT, FRUITS_DEFAULT } from '@/lib/defaults';
import type { CropFruitItem } from '@/lib/types';
import { useLanguage } from '@/lib/i18n';

const EMPTY = { emoji: '', name: '', local: '', desc: '' };

export default function CropFruitAdmin({ collectionName, title }: { collectionName: 'crops' | 'fruits'; title: string }) {
  const { t } = useLanguage();
  const { items, loading } = useCollection<CropFruitItem>(collectionName);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [existingImage, setExistingImage] = useState<{ url: string; path: string } | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const seedDefaults = async () => {
    setSeeding(true);
    try {
      const defaults = collectionName === 'crops' ? CROPS_DEFAULT : FRUITS_DEFAULT;
      for (const item of defaults) await createDoc(collectionName, item);
    } finally {
      setSeeding(false);
    }
  };

  const startEdit = (item: CropFruitItem) => {
    setEditingId(item.id);
    setForm({ emoji: item.emoji, name: item.name, local: item.local, desc: item.desc });
    setExistingImage(item.imageUrl && item.imagePath ? { url: item.imageUrl, path: item.imagePath } : null);
    setFile(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(EMPTY);
    setExistingImage(null);
    setFile(null);
    if (fileInput.current) fileInput.current.value = '';
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      let imageUrl = existingImage?.url ?? null;
      let imagePath = existingImage?.path ?? null;

      if (file) {
        if (existingImage) await deleteImage(existingImage.path);
        const uploaded = await uploadImage(collectionName, file);
        imageUrl = uploaded.url;
        imagePath = uploaded.path;
      }

      const data = { ...form, imageUrl, imagePath };

      if (editingId) {
        await updateDocById(collectionName, editingId, data);
      } else {
        await createDoc(collectionName, data);
      }
      cancelEdit();
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async (item: CropFruitItem) => {
    if (!confirm(t('cropFruit.confirmDelete'))) return;
    await deleteDocById(collectionName, item.id);
    if (item.imagePath) await deleteImage(item.imagePath);
  };

  return (
    <div style={{ maxWidth: 720 }}>
      <h1 style={{ fontSize: 22, marginBottom: 16 }}>{title}</h1>

      <form onSubmit={onSubmit} style={{ background: '#fff', padding: 20, borderRadius: 10, marginBottom: 24, display: 'grid', gap: 10 }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <input placeholder={t('cropFruit.placeholder.emoji')} value={form.emoji} onChange={(e) => setForm({ ...form, emoji: e.target.value })} required style={{ width: 60, padding: 8, border: '1px solid #ddd', borderRadius: 6 }} />
          <input placeholder={t('cropFruit.placeholder.name')} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required style={{ flex: 1, padding: 8, border: '1px solid #ddd', borderRadius: 6 }} />
          <input placeholder={t('cropFruit.placeholder.localName')} value={form.local} onChange={(e) => setForm({ ...form, local: e.target.value })} required style={{ width: 140, padding: 8, border: '1px solid #ddd', borderRadius: 6 }} />
        </div>
        <textarea placeholder={t('cropFruit.placeholder.description')} value={form.desc} onChange={(e) => setForm({ ...form, desc: e.target.value })} required rows={2} style={{ padding: 8, border: '1px solid #ddd', borderRadius: 6, fontFamily: 'inherit' }} />
        <div>
          <input ref={fileInput} type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          {existingImage && !file && <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>{t('cropFruit.currentImageSet')}</div>}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="submit" disabled={busy} style={{ padding: '8px 16px', background: '#2e5339', color: '#fff', border: 0, borderRadius: 6, cursor: 'pointer' }}>
            {busy ? t('cropFruit.saving') : editingId ? t('cropFruit.update') : t('cropFruit.add')}
          </button>
          {editingId && (
            <button type="button" onClick={cancelEdit} style={{ padding: '8px 16px', background: '#fff', border: '1px solid #ddd', borderRadius: 6, cursor: 'pointer' }}>
              {t('cropFruit.cancel')}
            </button>
          )}
        </div>
      </form>

      {!loading && items.length === 0 && (
        <button type="button" onClick={seedDefaults} disabled={seeding} style={{ marginBottom: 16, padding: '8px 16px', background: '#fff', border: '1px solid #ddd', borderRadius: 6, cursor: 'pointer' }}>
          {seeding ? t('cropFruit.seeding') : t('cropFruit.seedDefaults').replace('{title}', title.toLowerCase())}
        </button>
      )}

      {loading ? (
        <p>{t('cropFruit.loading')}</p>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {items.map((item) => (
            <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#fff', padding: 12, borderRadius: 8 }}>
              {item.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.imageUrl} alt={item.name} style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6 }} />
              ) : (
                <span style={{ fontSize: 24, width: 48, textAlign: 'center' }}>{item.emoji}</span>
              )}
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{item.name} <span style={{ fontWeight: 400, color: '#888', fontSize: 12 }}>({item.local})</span></div>
                <div style={{ fontSize: 13, color: '#666' }}>{item.desc}</div>
              </div>
              <button type="button" onClick={() => startEdit(item)} style={{ padding: '6px 12px', border: '1px solid #ddd', borderRadius: 6, background: '#fff', cursor: 'pointer' }}>{t('cropFruit.edit')}</button>
              <button type="button" onClick={() => onDelete(item)} style={{ padding: '6px 12px', border: '1px solid #f0c4c4', color: '#c0392b', borderRadius: 6, background: '#fff', cursor: 'pointer' }}>{t('cropFruit.delete')}</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
