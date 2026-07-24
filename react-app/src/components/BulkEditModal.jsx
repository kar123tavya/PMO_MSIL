import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../api/client';

export default function BulkEditModal({ isOpen, onClose, selectedIds, onSaved, users = [] }) {
  const { user } = useAuth();
  const toast = useToast();
  const [updates, setUpdates] = useState({});
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setUpdates(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (Object.keys(updates).length === 0) {
      toast.show('No changes specified.', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await api.put('/projects/bulk', {
        ids: selectedIds,
        updates: updates
      });
      if (res.status === 202) {
        toast.show(res.data.message || 'Bulk edits submitted for Head approval!', 'info');
      } else {
        toast.show(`Successfully updated ${res.data.count} projects.`, 'success');
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.show(err.response?.data?.error || 'Failed to bulk update projects', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
        <h2>Bulk Edit ({selectedIds.length} projects)</h2>
        <p className="text-muted" style={{ marginBottom: 20 }}>
          Specify the fields you want to update for all selected projects. Leave fields empty if you don't want to change them.
        </p>

        <form onSubmit={handleSave}>
          <div className="form-group">
            <label>Change Division</label>
            <input type="text" className="input-field" name="division" value={updates.division || ''} onChange={handleChange} placeholder="e.g. plt" />
          </div>

          <div className="form-group">
            <label>Change Department</label>
            <input type="text" className="input-field" name="department" value={updates.department || ''} onChange={handleChange} placeholder="e.g. IT" />
          </div>

          <div className="form-group">
            <label>Change Category</label>
            <select className="input-field" name="category" value={updates.category || ''} onChange={handleChange}>
              <option value="">-- No Change --</option>
              <option value="Cost">Cost</option>
              <option value="Quality">Quality</option>
              <option value="Delivery">Delivery</option>
              <option value="Safety">Safety</option>
              <option value="Morale">Morale</option>
            </select>
          </div>

          <div className="form-group">
            <label>Change Status</label>
            <select className="input-field" name="status" value={updates.status || ''} onChange={handleChange}>
              <option value="">-- No Change --</option>
              <option value="IL1">IL1 - Ideation</option>
              <option value="IL2">IL2 - Approval</option>
              <option value="IL3">IL3 - Design & Development</option>
              <option value="IL4">IL4 - UAT</option>
              <option value="IL5">IL5 - Live</option>
              <option value="Live">Live ✓</option>
              <option value="On Hold">On Hold</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          <div className="form-actions" style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : 'Apply Bulk Edit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
