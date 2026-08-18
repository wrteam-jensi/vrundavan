'use client';

import { useState, type FormEvent } from 'react';
import { useCollection } from '@/lib/useCollection';
import { createDoc, deleteDocById, updateDocById } from '@/lib/crud';
import { PRODUCE_DEFAULT } from '@/lib/defaults';
import type { ProduceItem } from '@/lib/types';
import { useLanguage } from '@/lib/i18n';

const EMPTY = { emoji: '', name: '', tag: '', desc: '' };

export default function ProduceAdmin() {
  const { t } = useLanguage();
  const { items, loading } = useCollection<ProduceItem>('produce');
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const seedDefaults = async () => {
    setSeeding(true);
    try {
      for (const item of PRODUCE_DEFAULT) await createDoc('produce', item);
    } finally {
      setSeeding(false);
    }
  };

  const startEdit = (item: ProduceItem) => {
    setEditingId(item.id);
    setForm({ emoji: item.emoji, name: item.name, tag: item.tag, desc: item.desc });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(EMPTY);
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (editingId) {
        await updateDocById('produce', editingId, form);
      } else {
        await createDoc('produce', form);
      }
      cancelEdit();
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async (id: string) => {
    if (!confirm(t('produce.confirmDelete'))) return;
    await deleteDocById('produce', id);
  };

  return (
    <div>
      <h1 className="admin-page-title">{t('produce.title')}</h1>

      <form onSubmit={onSubmit} className="admin-form">
        <div className="admin-form-row">
          <input placeholder={t('produce.placeholder.emoji')} value={form.emoji} onChange={(e) => setForm({ ...form, emoji: e.target.value })} required className="admin-emoji-input" />
          <input placeholder={t('produce.placeholder.name')} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <input placeholder={t('produce.placeholder.tag')} value={form.tag} onChange={(e) => setForm({ ...form, tag: e.target.value })} required />
        </div>
        <textarea placeholder={t('produce.placeholder.description')} value={form.desc} onChange={(e) => setForm({ ...form, desc: e.target.value })} required rows={2} />
        <div className="admin-form-actions">
          <button type="submit" disabled={busy} className="btn btn-primary">
            {editingId ? t('produce.update') : t('produce.add')}
          </button>
          {editingId && (
            <button type="button" onClick={cancelEdit} className="btn btn-secondary">
              {t('produce.cancel')}
            </button>
          )}
        </div>
      </form>

      {!loading && items.length === 0 && (
        <button type="button" onClick={seedDefaults} disabled={seeding} className="btn btn-secondary admin-seed-btn">
          {seeding ? t('produce.seeding') : t('produce.seedDefaults')}
        </button>
      )}

      {loading ? (
        <p>{t('produce.loading')}</p>
      ) : (
        <div className="admin-list">
          {items.map((item) => (
            <div key={item.id} className="admin-card">
              <span className="admin-card-emoji">{item.emoji}</span>
              <div className="admin-card-body">
                <div className="admin-card-title">{item.name} <span className="sub">({item.tag})</span></div>
                <div className="admin-card-desc">{item.desc}</div>
              </div>
              <div className="admin-card-actions">
                <button type="button" onClick={() => startEdit(item)} className="btn btn-secondary btn-sm">{t('produce.edit')}</button>
                <button type="button" onClick={() => onDelete(item.id)} className="btn btn-danger btn-sm">{t('produce.delete')}</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
